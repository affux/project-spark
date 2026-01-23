import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Language = 'en' | 'hi' | 'ta' | 'te';

export interface LanguageInfo {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

export const languages: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
];

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  currentLanguage: LanguageInfo;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translations
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.submit': 'Submit',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.refresh': 'Refresh',
    'common.close': 'Close',
    'common.view': 'View',
    'common.download': 'Download',
    'common.upload': 'Upload',
    'common.yes': 'Yes',
    'common.no': 'No',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.profile': 'Profile',
    'nav.storefront': 'My Storefront',
    'nav.products': 'Browse Products',
    'nav.orders': 'Orders',
    'nav.payments': 'Payments',
    'nav.workspace': 'Workspace',
    'nav.support': 'Support',
    'nav.help': 'Help',
    'nav.logout': 'Logout',
    
    // Profile
    'profile.title': 'My Profile',
    'profile.description': 'View your profile information, security settings, and activity.',
    'profile.appearance': 'Appearance',
    'profile.appearance_desc': 'Choose your preferred theme for the dashboard',
    'profile.language': 'Language',
    'profile.language_desc': 'Select your preferred language',
    
    // Auth
    'auth.login': 'Login',
    'auth.signup': 'Sign Up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.forgot_password': 'Forgot Password?',
    'auth.remember_me': 'Remember me',
    
    // Dashboard
    'dashboard.welcome': 'Welcome back',
    'dashboard.total_orders': 'Total Orders',
    'dashboard.pending_orders': 'Pending Orders',
    'dashboard.wallet_balance': 'Wallet Balance',
    'dashboard.total_earnings': 'Total Earnings',
    
    // Orders
    'orders.title': 'Orders',
    'orders.new_order': 'New Order',
    'orders.order_number': 'Order Number',
    'orders.status': 'Status',
    'orders.customer': 'Customer',
    'orders.amount': 'Amount',
    'orders.date': 'Date',
    
    // Payments
    'payments.title': 'Payments',
    'payments.request_payout': 'Request Payout',
    'payments.add_funds': 'Add Funds',
    'payments.transaction_history': 'Transaction History',
    
    // Settings
    'settings.title': 'Settings',
    'settings.general': 'General',
    'settings.security': 'Security',
    'settings.notifications': 'Notifications',
  },
  hi: {
    // Common
    'common.loading': 'लोड हो रहा है...',
    'common.save': 'सहेजें',
    'common.cancel': 'रद्द करें',
    'common.delete': 'हटाएं',
    'common.edit': 'संपादित करें',
    'common.submit': 'जमा करें',
    'common.confirm': 'पुष्टि करें',
    'common.back': 'वापस',
    'common.next': 'अगला',
    'common.search': 'खोजें',
    'common.filter': 'फ़िल्टर',
    'common.refresh': 'रीफ्रेश',
    'common.close': 'बंद करें',
    'common.view': 'देखें',
    'common.download': 'डाउनलोड',
    'common.upload': 'अपलोड',
    'common.yes': 'हाँ',
    'common.no': 'नहीं',
    
    // Navigation
    'nav.dashboard': 'डैशबोर्ड',
    'nav.profile': 'प्रोफ़ाइल',
    'nav.storefront': 'मेरी दुकान',
    'nav.products': 'उत्पाद ब्राउज़ करें',
    'nav.orders': 'आदेश',
    'nav.payments': 'भुगतान',
    'nav.workspace': 'कार्यस्थान',
    'nav.support': 'सहायता',
    'nav.help': 'मदद',
    'nav.logout': 'लॉग आउट',
    
    // Profile
    'profile.title': 'मेरी प्रोफ़ाइल',
    'profile.description': 'अपनी प्रोफ़ाइल जानकारी, सुरक्षा सेटिंग्स और गतिविधि देखें।',
    'profile.appearance': 'दिखावट',
    'profile.appearance_desc': 'डैशबोर्ड के लिए अपनी पसंदीदा थीम चुनें',
    'profile.language': 'भाषा',
    'profile.language_desc': 'अपनी पसंदीदा भाषा चुनें',
    
    // Auth
    'auth.login': 'लॉग इन',
    'auth.signup': 'साइन अप',
    'auth.email': 'ईमेल',
    'auth.password': 'पासवर्ड',
    'auth.forgot_password': 'पासवर्ड भूल गए?',
    'auth.remember_me': 'मुझे याद रखें',
    
    // Dashboard
    'dashboard.welcome': 'वापसी पर स्वागत है',
    'dashboard.total_orders': 'कुल आदेश',
    'dashboard.pending_orders': 'लंबित आदेश',
    'dashboard.wallet_balance': 'वॉलेट बैलेंस',
    'dashboard.total_earnings': 'कुल कमाई',
    
    // Orders
    'orders.title': 'आदेश',
    'orders.new_order': 'नया आदेश',
    'orders.order_number': 'आदेश संख्या',
    'orders.status': 'स्थिति',
    'orders.customer': 'ग्राहक',
    'orders.amount': 'राशि',
    'orders.date': 'दिनांक',
    
    // Payments
    'payments.title': 'भुगतान',
    'payments.request_payout': 'भुगतान का अनुरोध करें',
    'payments.add_funds': 'फंड जोड़ें',
    'payments.transaction_history': 'लेन-देन इतिहास',
    
    // Settings
    'settings.title': 'सेटिंग्स',
    'settings.general': 'सामान्य',
    'settings.security': 'सुरक्षा',
    'settings.notifications': 'सूचनाएं',
  },
  ta: {
    // Common
    'common.loading': 'ஏற்றுகிறது...',
    'common.save': 'சேமி',
    'common.cancel': 'ரத்துசெய்',
    'common.delete': 'நீக்கு',
    'common.edit': 'திருத்து',
    'common.submit': 'சமர்ப்பி',
    'common.confirm': 'உறுதிசெய்',
    'common.back': 'பின்',
    'common.next': 'அடுத்து',
    'common.search': 'தேடு',
    'common.filter': 'வடிகட்டி',
    'common.refresh': 'புதுப்பி',
    'common.close': 'மூடு',
    'common.view': 'காண்',
    'common.download': 'பதிவிறக்கு',
    'common.upload': 'பதிவேற்று',
    'common.yes': 'ஆம்',
    'common.no': 'இல்லை',
    
    // Navigation
    'nav.dashboard': 'டாஷ்போர்ட்',
    'nav.profile': 'சுயவிவரம்',
    'nav.storefront': 'என் கடை',
    'nav.products': 'பொருட்கள்',
    'nav.orders': 'ஆர்டர்கள்',
    'nav.payments': 'கொடுப்பனவுகள்',
    'nav.workspace': 'பணியிடம்',
    'nav.support': 'ஆதரவு',
    'nav.help': 'உதவி',
    'nav.logout': 'வெளியேறு',
    
    // Profile
    'profile.title': 'என் சுயவிவரம்',
    'profile.description': 'உங்கள் சுயவிவர தகவல், பாதுகாப்பு அமைப்புகள் மற்றும் செயல்பாட்டைக் காணலாம்.',
    'profile.appearance': 'தோற்றம்',
    'profile.appearance_desc': 'டாஷ்போர்டுக்கான உங்கள் விருப்பமான தீம் தேர்வுசெய்க',
    'profile.language': 'மொழி',
    'profile.language_desc': 'உங்கள் விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்',
    
    // Auth
    'auth.login': 'உள்நுழை',
    'auth.signup': 'பதிவுசெய்',
    'auth.email': 'மின்னஞ்சல்',
    'auth.password': 'கடவுச்சொல்',
    'auth.forgot_password': 'கடவுச்சொல் மறந்துவிட்டதா?',
    'auth.remember_me': 'என்னை நினைவில் வை',
    
    // Dashboard
    'dashboard.welcome': 'மீண்டும் வரவேற்கிறோம்',
    'dashboard.total_orders': 'மொத்த ஆர்டர்கள்',
    'dashboard.pending_orders': 'நிலுவை ஆர்டர்கள்',
    'dashboard.wallet_balance': 'வாலட் இருப்பு',
    'dashboard.total_earnings': 'மொத்த வருமானம்',
    
    // Orders
    'orders.title': 'ஆர்டர்கள்',
    'orders.new_order': 'புதிய ஆர்டர்',
    'orders.order_number': 'ஆர்டர் எண்',
    'orders.status': 'நிலை',
    'orders.customer': 'வாடிக்கையாளர்',
    'orders.amount': 'தொகை',
    'orders.date': 'தேதி',
    
    // Payments
    'payments.title': 'கொடுப்பனவுகள்',
    'payments.request_payout': 'கொடுப்பனவு கோரிக்கை',
    'payments.add_funds': 'நிதி சேர்க்க',
    'payments.transaction_history': 'பரிவர்த்தனை வரலாறு',
    
    // Settings
    'settings.title': 'அமைப்புகள்',
    'settings.general': 'பொது',
    'settings.security': 'பாதுகாப்பு',
    'settings.notifications': 'அறிவிப்புகள்',
  },
  te: {
    // Common
    'common.loading': 'లోడ్ అవుతోంది...',
    'common.save': 'సేవ్ చేయి',
    'common.cancel': 'రద్దు చేయి',
    'common.delete': 'తొలగించు',
    'common.edit': 'సవరించు',
    'common.submit': 'సమర్పించు',
    'common.confirm': 'నిర్ధారించు',
    'common.back': 'వెనుకకు',
    'common.next': 'తదుపరి',
    'common.search': 'వెతుకు',
    'common.filter': 'ఫిల్టర్',
    'common.refresh': 'రిఫ్రెష్',
    'common.close': 'మూసివేయు',
    'common.view': 'చూడండి',
    'common.download': 'డౌన్‌లోడ్',
    'common.upload': 'అప్‌లోడ్',
    'common.yes': 'అవును',
    'common.no': 'కాదు',
    
    // Navigation
    'nav.dashboard': 'డాష్‌బోర్డ్',
    'nav.profile': 'ప్రొఫైల్',
    'nav.storefront': 'నా స్టోర్',
    'nav.products': 'ఉత్పత్తులు',
    'nav.orders': 'ఆర్డర్లు',
    'nav.payments': 'చెల్లింపులు',
    'nav.workspace': 'వర్క్‌స్పేస్',
    'nav.support': 'మద్దతు',
    'nav.help': 'సహాయం',
    'nav.logout': 'లాగ్ అవుట్',
    
    // Profile
    'profile.title': 'నా ప్రొఫైల్',
    'profile.description': 'మీ ప్రొఫైల్ సమాచారం, భద్రతా సెట్టింగ్‌లు మరియు కార్యకలాపాలను చూడండి.',
    'profile.appearance': 'రూపం',
    'profile.appearance_desc': 'డాష్‌బోర్డ్ కోసం మీకు ఇష్టమైన థీమ్ ఎంచుకోండి',
    'profile.language': 'భాష',
    'profile.language_desc': 'మీకు ఇష్టమైన భాషను ఎంచుకోండి',
    
    // Auth
    'auth.login': 'లాగిన్',
    'auth.signup': 'సైన్ అప్',
    'auth.email': 'ఇమెయిల్',
    'auth.password': 'పాస్‌వర్డ్',
    'auth.forgot_password': 'పాస్‌వర్డ్ మర్చిపోయారా?',
    'auth.remember_me': 'నన్ను గుర్తుంచుకో',
    
    // Dashboard
    'dashboard.welcome': 'తిరిగి స్వాగతం',
    'dashboard.total_orders': 'మొత్తం ఆర్డర్లు',
    'dashboard.pending_orders': 'పెండింగ్ ఆర్డర్లు',
    'dashboard.wallet_balance': 'వాలెట్ బ్యాలెన్స్',
    'dashboard.total_earnings': 'మొత్తం ఆదాయం',
    
    // Orders
    'orders.title': 'ఆర్డర్లు',
    'orders.new_order': 'కొత్త ఆర్డర్',
    'orders.order_number': 'ఆర్డర్ నంబర్',
    'orders.status': 'స్థితి',
    'orders.customer': 'కస్టమర్',
    'orders.amount': 'మొత్తం',
    'orders.date': 'తేదీ',
    
    // Payments
    'payments.title': 'చెల్లింపులు',
    'payments.request_payout': 'పేఅవుట్ అభ్యర్థన',
    'payments.add_funds': 'నిధులు జోడించండి',
    'payments.transaction_history': 'లావాదేవీ చరిత్ర',
    
    // Settings
    'settings.title': 'సెట్టింగ్‌లు',
    'settings.general': 'సాధారణ',
    'settings.security': 'భద్రత',
    'settings.notifications': 'నోటిఫికేషన్లు',
  },
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('preferred-language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('preferred-language', language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const t = useCallback((key: string): string => {
    return translations[language][key] || translations['en'][key] || key;
  }, [language]);

  const currentLanguage = languages.find(l => l.code === language) || languages[0];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, currentLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
