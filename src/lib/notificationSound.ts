// Notification sound utility with theme support
let audioContext: AudioContext | null = null;

// Theme-specific sound configurations
type ThemeType = 'light' | 'dark' | 'blue' | 'green' | 'purple' | 'trading';

interface ThemeSoundConfig {
  paymentSuccess: { frequencies: number[]; waveType: OscillatorType; duration: number };
  payout: { frequencies: number[]; waveType: OscillatorType; duration: number };
  notification: { frequency: number; waveType: OscillatorType; duration: number };
  agentAssigned: { frequencies: number[]; waveType: OscillatorType; duration: number };
}

const themeSoundConfigs: Record<ThemeType, ThemeSoundConfig> = {
  light: {
    paymentSuccess: { frequencies: [523, 659, 784], waveType: 'sine', duration: 0.3 }, // C5, E5, G5 - bright major chord
    payout: { frequencies: [1047, 1319], waveType: 'triangle', duration: 0.2 }, // C6, E6 - crisp ding
    notification: { frequency: 880, waveType: 'sine', duration: 0.3 }, // A5
    agentAssigned: { frequencies: [523, 659, 784, 1047], waveType: 'sine', duration: 0.25 }, // C5, E5, G5, C6 - welcoming ascending
  },
  dark: {
    paymentSuccess: { frequencies: [392, 494, 587], waveType: 'sine', duration: 0.35 }, // G4, B4, D5 - deeper chord
    payout: { frequencies: [784, 988], waveType: 'triangle', duration: 0.25 }, // G5, B5 - mellow ding
    notification: { frequency: 660, waveType: 'sine', duration: 0.35 }, // E5 - warmer
    agentAssigned: { frequencies: [392, 494, 587, 784], waveType: 'sine', duration: 0.3 }, // G4, B4, D5, G5 - warm welcome
  },
  blue: {
    paymentSuccess: { frequencies: [440, 554, 659], waveType: 'sine', duration: 0.3 }, // A4, C#5, E5 - A major
    payout: { frequencies: [880, 1109], waveType: 'sine', duration: 0.2 }, // A5, C#6 - bright chime
    notification: { frequency: 554, waveType: 'sine', duration: 0.3 }, // C#5 - cool tone
    agentAssigned: { frequencies: [440, 554, 659, 880], waveType: 'sine', duration: 0.25 }, // A4, C#5, E5, A5 - cool welcome
  },
  green: {
    paymentSuccess: { frequencies: [330, 415, 494], waveType: 'sine', duration: 0.35 }, // E4, G#4, B4 - E major lower
    payout: { frequencies: [659, 831], waveType: 'triangle', duration: 0.25 }, // E5, G#5 - natural chime
    notification: { frequency: 494, waveType: 'sine', duration: 0.35 }, // B4 - organic
    agentAssigned: { frequencies: [330, 415, 494, 659], waveType: 'sine', duration: 0.3 }, // E4, G#4, B4, E5 - natural welcome
  },
  purple: {
    paymentSuccess: { frequencies: [466, 587, 698], waveType: 'sine', duration: 0.32 }, // Bb4, D5, F5 - Bb major
    payout: { frequencies: [932, 1175], waveType: 'sine', duration: 0.22 }, // Bb5, D6 - mystical chime
    notification: { frequency: 698, waveType: 'sine', duration: 0.32 }, // F5 - regal
    agentAssigned: { frequencies: [466, 587, 698, 932], waveType: 'sine', duration: 0.28 }, // Bb4, D5, F5, Bb5 - mystical welcome
  },
  trading: {
    paymentSuccess: { frequencies: [349, 440, 523], waveType: 'sawtooth', duration: 0.25 }, // F4, A4, C5 - punchy
    payout: { frequencies: [698, 880], waveType: 'square', duration: 0.15 }, // F5, A5 - arcade cash
    notification: { frequency: 523, waveType: 'sawtooth', duration: 0.2 }, // C5 - electronic
    agentAssigned: { frequencies: [349, 440, 523, 698], waveType: 'triangle', duration: 0.2 }, // F4, A4, C5, F5 - electronic welcome
  },
};

// Get current theme from document
const getCurrentTheme = (): ThemeType => {
  const htmlElement = document.documentElement;
  if (htmlElement.classList.contains('trading')) return 'trading';
  if (htmlElement.classList.contains('purple')) return 'purple';
  if (htmlElement.classList.contains('green')) return 'green';
  if (htmlElement.classList.contains('blue')) return 'blue';
  if (htmlElement.classList.contains('dark')) return 'dark';
  return 'light';
};

export const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {
      const theme = getCurrentTheme();
      const config = themeSoundConfigs[theme].notification;
      playBeepSound(config.frequency, config.duration, config.waveType);
    });
  } catch (error) {
    console.log('Audio playback not available');
  }
};

// Payment success sound - theme-aware ascending chord
export const playPaymentSuccessSound = () => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const theme = getCurrentTheme();
    const config = themeSoundConfigs[theme].paymentSuccess;
    
    config.frequencies.forEach((freq, index) => {
      const oscillator = audioContext!.createOscillator();
      const gainNode = audioContext!.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext!.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = config.waveType;
      
      const startTime = audioContext!.currentTime + (index * 0.1);
      gainNode.gain.setValueAtTime(0.25, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + config.duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + config.duration);
    });
  } catch (error) {
    console.log('Web Audio API not available');
  }
};

// Payout request sound - theme-aware cash register style
export const playPayoutSound = () => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const theme = getCurrentTheme();
    const config = themeSoundConfigs[theme].payout;
    
    config.frequencies.forEach((freq, index) => {
      const oscillator = audioContext!.createOscillator();
      const gainNode = audioContext!.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext!.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = config.waveType;
      
      const startTime = audioContext!.currentTime + (index * 0.15);
      gainNode.gain.setValueAtTime(0.3, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + config.duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + config.duration);
    });
  } catch (error) {
    console.log('Web Audio API not available');
  }
};

// Agent assigned sound - welcoming ascending chord
export const playAgentAssignedSound = () => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const theme = getCurrentTheme();
    const config = themeSoundConfigs[theme].agentAssigned;
    
    config.frequencies.forEach((freq, index) => {
      const oscillator = audioContext!.createOscillator();
      const gainNode = audioContext!.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext!.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = config.waveType;
      
      const startTime = audioContext!.currentTime + (index * 0.12);
      gainNode.gain.setValueAtTime(0.2, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + config.duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + config.duration);
    });
  } catch (error) {
    console.log('Web Audio API not available');
  }
};

const playBeepSound = (frequency: number = 880, duration: number = 0.3, waveType: OscillatorType = 'sine') => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = waveType;
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    console.log('Web Audio API not available');
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

export const showBrowserNotification = (title: string, body: string) => {
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
    playNotificationSound();
  }
};
