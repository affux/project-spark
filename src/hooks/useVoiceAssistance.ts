import { useState, useEffect, useCallback, useRef } from 'react';

interface VoiceAssistanceOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

const STORAGE_KEY = 'voice_assistance_enabled';

export const useVoiceAssistance = (options: VoiceAssistanceOptions = {}) => {
  const [isEnabled, setIsEnabled] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const {
    rate = 1,
    pitch = 1,
    volume = 1,
    lang = 'en-US',
  } = options;

  // Check browser support
  useEffect(() => {
    setIsSupported('speechSynthesis' in window);
  }, []);

  // Load available voices
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [isSupported]);

  // Toggle voice assistance
  const toggleVoiceAssistance = useCallback(() => {
    setIsEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem(STORAGE_KEY, String(newValue));
      if (!newValue) {
        window.speechSynthesis?.cancel();
      }
      return newValue;
    });
  }, []);

  // Speak text
  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!isSupported || !isEnabled) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Find a good English voice
    const englishVoice = voices.find(v => 
      v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google'))
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    utterance.lang = lang;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      onEnd?.();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, [isSupported, isEnabled, voices, rate, pitch, volume, lang]);

  // Stop speaking
  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  // Pause speaking
  const pause = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.pause();
  }, [isSupported]);

  // Resume speaking
  const resume = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.resume();
  }, [isSupported]);

  // Speak a step guide
  const speakStep = useCallback((title: string, description: string) => {
    const text = `${title}. ${description}`;
    speak(text);
  }, [speak]);

  // Speak welcome message
  const speakWelcome = useCallback(() => {
    speak("Welcome to the onboarding guide. I'll help you set up your account step by step. Let's get started!");
  }, [speak]);

  // Speak completion message
  const speakCompletion = useCallback((stepTitle: string) => {
    speak(`Great job! You've completed: ${stepTitle}. Moving to the next step.`);
  }, [speak]);

  // Speak progress update
  const speakProgress = useCallback((completed: number, total: number) => {
    const percentage = Math.round((completed / total) * 100);
    speak(`You've completed ${percentage} percent of the onboarding. ${total - completed} steps remaining.`);
  }, [speak]);

  return {
    isEnabled,
    isSpeaking,
    isSupported,
    voices,
    toggleVoiceAssistance,
    speak,
    speakStep,
    speakWelcome,
    speakCompletion,
    speakProgress,
    stop,
    pause,
    resume,
  };
};
