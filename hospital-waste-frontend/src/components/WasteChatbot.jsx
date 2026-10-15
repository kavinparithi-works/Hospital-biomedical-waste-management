import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles, Send, Camera, X, RefreshCw, Bot, User,
  CheckCircle, AlertTriangle, Mic, MicOff, Volume2, VolumeX,
  Globe, HelpCircle, Check
} from 'lucide-react';
import {
  processChatMessage,
  SUPPORTED_LANGUAGES,
  speakAloud,
  stopSpeaking
} from '../services/nlpEngine';

import { api } from '../services/api';
import { useT } from '../i18n/LanguageContext';

// Quick prompt suggestion pills across all languages
const QUICK_PROMPTS_EN = [
  { label: '❓ I have a doubt', text: 'I have a doubt regarding waste segregation' },
  { label: '🩸 Blood-stained cloth', text: 'Where to dispose blood stained cloth?' },
  { label: '✂️ Scissors & stitch cutters', text: 'Where to dispose scissors and stitch materials?' },
  { label: '💉 Needle-stick protocol', text: 'What is the immediate protocol for a needle stick injury?' },
  { label: '🟡 Yellow Bin guidelines', text: 'What items go into the yellow bin?' },
  { label: '🛡️ Worker PPE rules', text: 'What PPE should waste collection workers wear?' }
];

const QUICK_PROMPTS_TA = [
  { label: '❓ எனக்கு சந்தேகம் உள்ளது', text: 'கழிவு மேலாண்மை பற்றி எனக்கு ஒரு சந்தேகம் உள்ளது' },
  { label: '🩸 ரத்தம் படிந்த துணி / பஞ்சு', text: 'ரத்தம் படிந்த துணி எந்த தொட்டியில் போட வேண்டும்?' },
  { label: '💉 ஊசி குத்தினால் என்ன செய்ய வேண்டும்?', text: 'ஊசி குத்தினால் உடனடியாக என்ன செய்ய வேண்டும்?' },
  { label: '🟡 மஞ்சள் தொட்டி விதிமுறைகள்', text: 'மஞ்சள் தொட்டியில் என்ன கழிவுகள் போட வேண்டும்?' },
  { label: '🧤 அறுவை சிகிச்சை கையுறைகள்', text: 'பயன்படுத்திய கையுறைகள் எந்த தொட்டியில் போட வேண்டும்?' },
  { label: '✂️ கத்தரிக்கோல் & பிளேடு', text: 'கத்தரிக்கோல் மற்றும் அறுவை சிகிச்சை பிளேடு எங்கு போட வேண்டும்?' }
];

const QUICK_PROMPTS_HI = [
  { label: '❓ मुझे एक संदेह है', text: 'कचरा पृथक्करण को लेकर मुझे एक संदेह है' },
  { label: '🩸 खून लगा कपड़ा / रुई', text: 'खून लगा कपड़ा किस डिब्बे में डालना चाहिए?' },
  { label: '💉 सुई चुभने पर क्या करें?', text: 'सुई चुभने पर तुरंत क्या प्राथमिक उपचार करें?' },
  { label: '🟡 पीले डिब्बे के नियम', text: 'पीले डिब्बे में क्या-क्या सामान डाला जाता है?' },
  { label: '🧤 प्रयुक्त दस्ताने', text: 'उपयोग किए गए दस्ताने किस डिब्बे में डालें?' },
  { label: '✂️ कैंची और ब्लेड', text: 'सर्जिकल ब्लेड और कैंची कहाँ डालना चाहिए?' }
];

const QUICK_PROMPTS_TE = [
  { label: '❓ నాకు ఒక సందేహం ఉంది', text: 'వ్యర్థాల వేరుచేయడంపై నాకు ఒక సందేహం ఉంది' },
  { label: '🩸 రక్తం అంటిన బట్ట / దూది', text: 'రక్తం అంటిన బట్టను ఏ తొట్టిలో వేయాలి?' },
  { label: '💉 సూది గుచ్చుకుంటే ఏం చేయాలి?', text: 'సూది గుచ్చుకున్నప్పుడు తక్షణ ప్రథమ చికిత్స ఏమిటి?' },
  { label: '🟡 పసుపు తొట్టి నియమాలు', text: 'పసుపు తొట్టిలో ఏ వ్యర్థాలు వేయాలి?' },
  { label: '🧤 చేతి తొడుగులు', text: 'ఉపయోగించిన చేతి తొడుగులను ఏ తొట్టిలో వేయాలి?' },
  { label: '✂️ కత్తెర & బ్లేడు', text: 'సర్జికల్ బ్లేడు మరియు కత్తెర ఎక్కడ వేయాలి?' }
];

const QUICK_PROMPTS_ML = [
  { label: '❓ എനിക്ക് സംശയമുണ്ട്', text: 'മാലിന്യ സംസ്കരണത്തിൽ എനിക്ക് ഒരു സംശയമുണ്ട്' },
  { label: '🩸 രക്തം പുരണ്ട തുണി / പഞ്ഞി', text: 'രക്തം പുരണ്ട തുണി ഏത് ബിന്നിൽ നിക്ഷേപിക്കണം?' },
  { label: '💉 സൂചി കുത്തിയാൽ എന്ത് ചെയ്യണം?', text: 'സൂചി കുത്തിയാൽ ഉടൻ ചെയ്യേണ്ട അടിയന്തര ചികിത്സ എന്താണ്?' },
  { label: '🟡 മഞ്ഞ ബിൻ നിയമങ്ങൾ', text: 'മഞ്ഞ ബിന്നിൽ എന്തൊക്കെ മാലിന്യങ്ങളാണ് ഇടേണ്ടത്?' },
  { label: '🧤 ഉപയോഗിച്ച കയ്യുറകൾ', text: 'ഉപയോഗിച്ച കയ്യുറകൾ ഏത് ബിന്നിലാണ് നിക്ഷേപിക്കേണ്ടത്?' },
  { label: '✂️ കത്രികയും ബ്ലേഡും', text: 'സർജിക്കൽ ബ്ലേഡും കത്രികയും എവിടെ നിക്ഷേപിക്കണം?' }
];

const QUICK_PROMPTS_KN = [
  { label: '❓ ನನಗೆ ಸಂದೇಹವಿದೆ', text: 'ತ್ಯಾಜ್ಯ ವಿಂಗಡಣೆಯ ಬಗ್ಗೆ ನನಗೆ ಒಂದು ಸಂದೇಹವಿದೆ' },
  { label: '🩸 ರಕ್ತ ಅಂಟಿದ ಬಟ್ಟೆ / ಹತ್ತಿ', text: 'ರಕ್ತ ಅಂಟಿದ ಬಟ್ಟೆಯನ್ನು ಯಾವ ತೊಟ್ಟಿಯಲ್ಲಿ ಹಾಕಬೇಕು?' },
  { label: '💉 ಸೂಜಿ ಚುಚ್ಚಿದರೆ ಏನು ಮಾಡಬೇಕು?', text: 'ಸೂಜಿ ಚುಚ್ಚಿದಾಗ ತಕ್ಷಣ ಮಾಡಬೇಕಾದ ಪ್ರಥಮ ಚಿಕಿತ್ಸೆ ಏನು?' },
  { label: '🟡 ಹಳದಿ ತೊಟ್ಟಿಯ ನಿಯಮಗಳು', text: 'ಹಳದಿ ತೊಟ್ಟಿಯಲ್ಲಿ ಯಾವ ವಸ್ತುಗಳನ್ನು ಹಾಕಬೇಕು?' },
  { label: '🧤 ಬಳಸಿದ ಕೈಗವಸುಗಳು', text: 'ಬಳಸಿದ ಕೈಗವಸುಗಳನ್ನು ಯಾವ ತೊಟ್ಟಿಯಲ್ಲಿ ಹಾಕಬೇಕು?' },
  { label: '✂️ ಕತ್ತರಿ ಮತ್ತು ಬ್ಲೇಡ್', text: 'ಸರ್ಜಿಕಲ್ ಬ್ಲೇಡ್ ಮತ್ತು ಕತ್ತರಿಯನ್ನು ಎಲ್ಲಿ ಹಾಕಬೇಕು?' }
];

// Messages used around photo classification, per language
const VISION_TEXT = {
  en: {
    identified: (items) => `I analysed the photo and found ${items.length} item${items.length > 1 ? 's' : ''}:\n` + items.map(it => `• **${it.name}** → ${it.category} → **${it.bin} Bin** (${Math.round(it.confidence * 100)}%)`).join('\n'),
    uncertain: (reason) => `I could not identify the waste in this photo with confidence. ${reason || ''}\nPlease describe the item in words (e.g. "blood-soaked cotton", "used needle") and I will classify it.`,
    unavailable: (why) => `Photo scanning is unavailable right now: ${why}\nDescribe the item in words and I will classify it from your description.`,
    fromText: 'Based on your description (the photo could not be analysed):'
  },
  ta: {
    identified: (items) => `புகைப்படத்தில் ${items.length} பொருள்(கள்) கண்டறிந்தேன்:\n` + items.map(it => `• **${it.name}** → ${it.category} → **${it.bin} தொட்டி** (${Math.round(it.confidence * 100)}%)`).join('\n'),
    uncertain: (reason) => `இந்தப் புகைப்படத்தில் கழிவை உறுதியாக அடையாளம் காண முடியவில்லை. ${reason || ''}\nபொருளை வார்த்தைகளில் விவரிக்கவும் (எ.கா. "ரத்தம் படிந்த பஞ்சு").`,
    unavailable: (why) => `புகைப்பட ஸ்கேன் தற்போது கிடைக்கவில்லை: ${why}\nபொருளை வார்த்தைகளில் விவரிக்கவும்.`,
    fromText: 'உங்கள் விவரத்தின் அடிப்படையில் (புகைப்படத்தை ஆய்வு செய்ய முடியவில்லை):'
  },
  hi: {
    identified: (items) => `फ़ोटो में ${items.length} वस्तु(एँ) मिलीं:\n` + items.map(it => `• **${it.name}** → ${it.category} → **${it.bin} डिब्बा** (${Math.round(it.confidence * 100)}%)`).join('\n'),
    uncertain: (reason) => `इस फ़ोटो में कचरे की पहचान निश्चित रूप से नहीं हो सकी। ${reason || ''}\nकृपया वस्तु का नाम लिखें (जैसे "खून लगी रुई")।`,
    unavailable: (why) => `फ़ोटो स्कैन अभी उपलब्ध नहीं है: ${why}\nकृपया वस्तु का विवरण लिखें।`,
    fromText: 'आपके विवरण के आधार पर (फ़ोटो का विश्लेषण नहीं हो सका):'
  },
  te: {
    identified: (items) => `ఫోటోలో ${items.length} వస్తువు(లు) గుర్తించాను:\n` + items.map(it => `• **${it.name}** → ${it.category} → **${it.bin} తొట్టి** (${Math.round(it.confidence * 100)}%)`).join('\n'),
    uncertain: (reason) => `ఈ ఫోటోలో వ్యర్థాన్ని ఖచ్చితంగా గుర్తించలేకపోయాను. ${reason || ''}\nదయచేసి వస్తువును మాటల్లో వివరించండి.`,
    unavailable: (why) => `ఫోటో స్కాన్ ప్రస్తుతం అందుబాటులో లేదు: ${why}\nదయచేసి వస్తువును వివరించండి.`,
    fromText: 'మీ వివరణ ఆధారంగా (ఫోటో విశ్లేషణ సాధ్యం కాలేదు):'
  },
  kn: {
    identified: (items) => `ಫೋಟೋದಲ್ಲಿ ${items.length} ವಸ್ತು(ಗಳು) ಪತ್ತೆಯಾಗಿವೆ:\n` + items.map(it => `• **${it.name}** → ${it.category} → **${it.bin} ತೊಟ್ಟಿ** (${Math.round(it.confidence * 100)}%)`).join('\n'),
    uncertain: (reason) => `ಈ ಫೋಟೋದಲ್ಲಿ ತ್ಯಾಜ್ಯವನ್ನು ಖಚಿತವಾಗಿ ಗುರುತಿಸಲಾಗಲಿಲ್ಲ. ${reason || ''}\nದಯವಿಟ್ಟು ವಸ್ತುವನ್ನು ಪದಗಳಲ್ಲಿ ವಿವರಿಸಿ.`,
    unavailable: (why) => `ಫೋಟೋ ಸ್ಕ್ಯಾನ್ ಸದ್ಯ ಲಭ್ಯವಿಲ್ಲ: ${why}\nದಯವಿಟ್ಟು ವಸ್ತುವನ್ನು ವಿವರಿಸಿ.`,
    fromText: 'ನಿಮ್ಮ ವಿವರಣೆಯ ಆಧಾರದ ಮೇಲೆ (ಫೋಟೋ ವಿಶ್ಲೇಷಿಸಲಾಗಲಿಲ್ಲ):'
  },
  ml: {
    identified: (items) => `ഫോട്ടോയിൽ ${items.length} ഇനം(ങ്ങൾ) കണ്ടെത്തി:\n` + items.map(it => `• **${it.name}** → ${it.category} → **${it.bin} ബിൻ** (${Math.round(it.confidence * 100)}%)`).join('\n'),
    uncertain: (reason) => `ഈ ഫോട്ടോയിലെ മാലിന്യം ഉറപ്പോടെ തിരിച്ചറിയാനായില്ല. ${reason || ''}\nദയവായി ഇനം വാക്കുകളിൽ വിവരിക്കുക.`,
    unavailable: (why) => `ഫോട്ടോ സ്കാൻ ഇപ്പോൾ ലഭ്യമല്ല: ${why}\nദയവായി ഇനം വിവരിക്കുക.`,
    fromText: 'നിങ്ങളുടെ വിവരണത്തെ അടിസ്ഥാനമാക്കി (ഫോട്ടോ വിശകലനം ചെയ്യാനായില്ല):'
  }
};

const getWelcomeMessage = (langCode) => {
  switch (langCode) {
    case 'ta': return 'வணக்கம்! நான் உங்கள் KMCH AI மருத்துவ கழிவு உதவியாளர். கழிவை விவரிக்கவும், உங்கள் சந்தேகங்களை கேட்கவும், அல்லது மைக் பட்டனை அழுத்தி பேசலாம்.';
    case 'hi': return 'नमस्ते! मैं आपका KMCH बायोमेडिकल वेस्ट AI असिस्टेंट हूँ। कचरे का नाम बताइए, सुरक्षा नियम पूछिए, या माइक से बोलिए।';
    case 'te': return 'నమస్కారం! నేను మీ KMCH AI బయోమెడికల్ వేస్ట్ అసిస్టెంట్‌ని. వ్యర్థాలను వివరించండి, సందేహాలు అడగండి లేదా మైక్ ద్వారా మాట్లాడండి.';
    case 'ml': return 'നമസ്കാരം! ഞാൻ നിങ്ങളുടെ KMCH AI ബയോമെഡിക്കൽ വേസ്റ്റ് അസിസ്റ്റന്റ് ആണ്. മാലിന്യങ്ങൾ വിവരിക്കൂ, സംശയങ്ങൾ ചോദിക്കൂ, അല്ലെങ്കിൽ സംസാരിക്കൂ.';
    case 'kn': return 'ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ KMCH AI ಬಯೋಮೆಡಿಕಲ್ ವೇಸ್ಟ್ ಸಹಾಯಕ. ತ್ಯಾಜ್ಯವನ್ನು ವಿವರಿಸಿ, ಸಂದೇಹಗಳನ್ನು ಕೇಳಿ ಅಥವಾ ಮೈಕ್ ಮೂಲಕ ಮಾತನಾಡಿ.';
    default: return "Hello! I'm your KMCH AI Waste Assistant. You can describe waste items, ask any doubts about hospital protocols, or click the mic to speak.";
  }
};



const WasteChatbot = ({ role = 'staff', lang = 'en', onSuggest }) => {
  const t = useT();
  // Voice & Speech Recognition States
  const [selectedVoiceLang, setSelectedVoiceLang] = useState(lang === 'ta' ? 'ta-IN' : 'en-IN');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState(null);

  // Chat States
  const getActiveLangCode = () => {
    if (selectedVoiceLang.startsWith('ta')) return 'ta';
    if (selectedVoiceLang.startsWith('hi')) return 'hi';
    if (selectedVoiceLang.startsWith('te')) return 'te';
    if (selectedVoiceLang.startsWith('ml')) return 'ml';
    if (selectedVoiceLang.startsWith('kn')) return 'kn';
    if (lang && lang !== 'en') return lang;
    return 'en';
  };

  const getActivePrompts = () => {
    const l = getActiveLangCode();
    switch (l) {
      case 'ta': return QUICK_PROMPTS_TA;
      case 'hi': return QUICK_PROMPTS_HI;
      case 'te': return QUICK_PROMPTS_TE;
      case 'ml': return QUICK_PROMPTS_ML;
      case 'kn': return QUICK_PROMPTS_KN;
      default: return QUICK_PROMPTS_EN;
    }
  };

  const getPlaceholderText = () => {
    const l = getActiveLangCode();
    if (isListening) {
      switch (l) {
        case 'ta': return 'கேட்கிறது... பேசவும்...';
        case 'hi': return 'सुन रहा हूँ... बोलिए...';
        case 'te': return 'వింటున్నాను... మాట్లాడండి...';
        case 'ml': return 'കേൾക്കുന്നു... സംസാരിക്കൂ...';
        case 'kn': return 'ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ... ಮಾತನಾಡಿ...';
        default: return 'Listening to speech...';
      }
    }
    switch (l) {
      case 'ta': return 'கழிவுப் பொருளை விவரிக்கவும் (எ.கா: ரத்தம் படிந்த துணி)...';
      case 'hi': return 'अपशिष्ट का वर्णन करें (उदा: खून लगा कपड़ा)...';
      case 'te': return 'వ్యర్థాన్ని వివరించండి (ఉదా: రక్తం అంటిన బట్ట)...';
      case 'ml': return 'മാലിന്യം വിവരിക്കുക (ഉദാ: രക്തം പുരണ്ട തുണി)...';
      case 'kn': return 'ತ್ಯಾಜ್ಯವನ್ನು ವಿವರಿಸಿ (ಉದಾ: ರಕ್ತ ಅಂಟಿದ ಬಟ್ಟೆ)...';
      default: return 'Ask a doubt or describe waste (speak or type)...';
    }
  };

  const [messages, setMessages] = useState([
    {
      id: 0,
      role: 'ai',
      text: getWelcomeMessage(lang || 'en'),
      result: null,
      applied: false
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [appliedRecordId, setAppliedRecordId] = useState(null);

  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

  // Whether the backend has a Gemini key for photo classification (null = unknown yet)
  const [visionStatus, setVisionStatus] = useState(null);
  useEffect(() => {
    let cancelled = false;
    api.getAiStatus().then(s => { if (!cancelled) setVisionStatus(s); }).catch(() => { if (!cancelled) setVisionStatus({ configured: false }); });
    return () => { cancelled = true; };
  }, []);

  // Sync selected voice language when parent lang changes
  useEffect(() => {
    if (lang === 'ta') setSelectedVoiceLang('ta-IN');
    else if (lang === 'hi') setSelectedVoiceLang('hi-IN');
    else if (lang === 'te') setSelectedVoiceLang('te-IN');
    else if (lang === 'kn') setSelectedVoiceLang('kn-IN');
    else if (lang === 'ml') setSelectedVoiceLang('ml-IN');
    else if (lang === 'en') setSelectedVoiceLang('en-IN');
  }, [lang]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, isListening]);

  // Clean up speech synthesis & recognition on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Initialize Speech Recognition
  const startSpeechRecognition = () => {
    setSpeechError('');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      setTimeout(() => setSpeechError(''), 4500);
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = selectedVoiceLang;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(r => r[0].transcript)
          .join('');
        setInputText(transcript);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition status:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission blocked. Please allow mic access in your browser bar.');
        } else if (event.error !== 'no-speech') {
          setSpeechError(`Microphone issue: ${event.error}`);
        }
        setIsListening(false);
        setTimeout(() => setSpeechError(''), 5000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech initialization error:', err);
      setIsListening(false);
      setSpeechError('Failed to start microphone. Please try again.');
      setTimeout(() => setSpeechError(''), 4000);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  // Image Upload Handling
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  // Process & Send message
  const handleSend = async (textToSend = null) => {
    const rawText = textToSend !== null ? textToSend : inputText;
    const hasText = rawText && rawText.trim().length > 0;
    const imageToUpload = selectedImage;
    const hasImage = !!imageToUpload;
    const currentPreview = imagePreview;

    if (!hasText && !hasImage) return;

    if (isListening) {
      stopListening();
    }

    const queryText = hasText ? rawText.trim() : '';

    // Add user message
    const userMsg = {
      id: Date.now(),
      role: 'user',
      text: hasText ? queryText : null,
      image: currentPreview || null
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setIsTyping(true);

    try {
      let aiText = '';
      let resultObj = null;
      const activeLang = getActiveLangCode();
      const vt = VISION_TEXT[activeLang] || VISION_TEXT.en;

      if (hasImage && imageToUpload) {
        // Vision classification is done server-side (Gemini). We never guess from a photo locally.
        try {
          const visionData = await api.classifyImage(imageToUpload, queryText);
          if (visionData.uncertain || !visionData.items || visionData.items.length === 0) {
            aiText = vt.uncertain(visionData.reason);
          } else {
            const items = [...visionData.items].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
            const topItem = items[0];
            aiText = vt.identified(items);
            if (topItem.binCorrectionReason) aiText += `\n\nℹ️ ${topItem.binCorrectionReason}`;
            resultObj = {
              type: topItem.category,
              category: topItem.category,
              bin: topItem.bin,
              binFullName: `${topItem.bin} Bin (${topItem.category})`,
              confidence: Math.round((topItem.confidence || 0) * 100),
              guidance: topItem.disposal || 'Dispose per standard Bio-Medical Waste rules.',
              safetyWarning: topItem.hazard_warning || '',
              ppe: topItem.ppe || ''
            };
          }
        } catch (visionErr) {
          // Explain honestly why the photo could not be analysed, then fall back to the text (if any)
          const textFallback = queryText ? processChatMessage(queryText, false, activeLang) : null;
          if (textFallback && textFallback.result) {
            aiText = `${vt.fromText}\n\n${textFallback.text}`;
            resultObj = textFallback.result;
          } else {
            aiText = vt.unavailable(visionErr.message || 'Unknown error');
          }
          if (visionErr.code === 'MISSING_API_KEY') setVisionStatus({ configured: false });
        }
      } else {
        const nlpResponse = processChatMessage(queryText, false, activeLang);
        aiText = nlpResponse.text;
        resultObj = nlpResponse.result;
      }

      const aiMsg = {
        id: Date.now() + 1,
        role: 'ai',
        text: aiText,
        result: resultObj,
        applied: false
      };

      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);

      if (voiceEnabled && aiText) {
        speakAloud(aiText, selectedVoiceLang);
        setSpeakingMsgId(aiMsg.id);
      }

      if (resultObj && onSuggest) {
        onSuggest({
          type: resultObj.category || resultObj.type,
          bin: resultObj.bin,
          guidance: resultObj.guidance,
          confidence: resultObj.confidence
        });
      }
    } catch (err) {
      console.error('Error in WasteChatbot handleSend:', err);
      setIsTyping(false);
    }
  };

  const handleApplyToForm = (msgId, result) => {
    if (!result || !onSuggest) return;
    onSuggest({
      type: result.category || result.type,
      bin: result.bin,
      guidance: result.guidance,
      confidence: result.confidence
    });
    setAppliedRecordId(msgId);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, applied: true } : m));
  };

  const handleSpeakMessage = (msgId, text) => {
    if (speakingMsgId === msgId) {
      stopSpeaking();
      setSpeakingMsgId(null);
    } else {
      speakAloud(text, selectedVoiceLang);
      setSpeakingMsgId(msgId);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    stopSpeaking();
    setSpeakingMsgId(null);
    setMessages([
      {
        id: 0,
        role: 'ai',
        text: getWelcomeMessage(getActiveLangCode()),
        result: null,
        applied: false
      }
    ]);
    setInputText('');
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div style={{
      border: '2px solid var(--accent-teal, #16A085)',
      borderRadius: '14px',
      backgroundColor: '#fff',
      display: 'flex',
      flexDirection: 'column',
      height: '560px',
      overflow: 'hidden',
      boxShadow: '0 8px 24px rgba(22, 160, 133, 0.12)'
    }}>
      {/* ─── Header ────────────────────────────────────────── */}
      <div style={{
        padding: '0.75rem 1rem',
        background: 'linear-gradient(135deg, #0E7490, #0D9488)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '6px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{t('chatbot.title')}</span>
              <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(255,255,255,0.25)', padding: '1px 6px', borderRadius: '10px' }}>
                NLP & Voice
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.85)' }}>
              {role === 'worker' ? t('chatbot.workerSub') : t('chatbot.staffSub')} • {t('chatbot.online')}
            </div>
          </div>
        </div>

        {/* Header Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Read Aloud Toggle */}
          <button
            onClick={() => {
              if (voiceEnabled) stopSpeaking();
              setVoiceEnabled(!voiceEnabled);
            }}
            title={voiceEnabled ? t('chatbot.voiceOff') : t('chatbot.voiceOn')}
            style={{
              background: voiceEnabled ? '#22C55E' : 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 8px',
              cursor: 'pointer',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem'
            }}
          >
            {voiceEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            <span>{voiceEnabled ? t('chatbot.voiceOn') : t('chatbot.voiceOff')}</span>
          </button>

          {/* Reset / Clear */}
          <button
            onClick={handleReset}
            title={t('chatbot.clear')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 8px',
              cursor: 'pointer',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem'
            }}
          >
            <RefreshCw size={12} /> {t('common.clear')}
          </button>
        </div>
      </div>

      {/* ─── Language Selector Strip ───────────────────────── */}
      <div style={{
        padding: '0.35rem 0.75rem',
        backgroundColor: '#F1F5F9',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
          <Globe size={13} color="#0D9488" />
          <span style={{ fontWeight: 600 }}>{t('chatbot.speechLang')}</span>
        </div>
        <select
          value={selectedVoiceLang}
          onChange={(e) => setSelectedVoiceLang(e.target.value)}
          style={{
            padding: '2px 8px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            backgroundColor: '#fff',
            fontSize: '0.74rem',
            color: '#1E293B',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          {SUPPORTED_LANGUAGES.map(l => (
            <option key={l.code} value={l.code}>
              {l.flag} {l.label}
            </option>
          ))}
        </select>
      </div>

      {/* ─── Photo scan availability ───────────────────────── */}
      {visionStatus && visionStatus.configured === false && (
        <div style={{ backgroundColor: '#FFFBEB', color: '#92400E', fontSize: '0.74rem', padding: '0.4rem 0.8rem', borderBottom: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Camera size={13} />
          <span>{t('chatbot.visionOff')}</span>
        </div>
      )}

      {/* ─── Speech Error Notice ───────────────────────────── */}
      {speechError && (
        <div style={{
          backgroundColor: '#FEE2E2',
          color: '#991B1B',
          fontSize: '0.75rem',
          padding: '0.4rem 0.8rem',
          borderBottom: '1px solid #FCA5A5',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <AlertTriangle size={13} />
          <span>{speechError}</span>
        </div>
      )}

      {/* ─── Messages Viewport ──────────────────────────────── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0.85rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        backgroundColor: '#FAFBFB'
      }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ display: 'flex', flexDirection: 'column' }}>
            {/* User Message */}
            {msg.role === 'user' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{
                  maxWidth: '82%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '4px'
                }}>
                  {msg.image && (
                    <img
                      src={msg.image}
                      alt="uploaded waste"
                      style={{
                        maxHeight: '130px',
                        maxWidth: '200px',
                        borderRadius: '8px',
                        objectFit: 'cover',
                        border: '2px solid #0D9488'
                      }}
                    />
                  )}
                  {msg.text && (
                    <div style={{
                      backgroundColor: 'var(--primary-blue, #1A56DB)',
                      color: '#fff',
                      padding: '0.6rem 0.9rem',
                      borderRadius: '16px 16px 4px 16px',
                      fontSize: '0.86rem',
                      lineHeight: 1.45,
                      boxShadow: '0 2px 6px rgba(26, 86, 219, 0.2)'
                    }}>
                      {msg.text}
                    </div>
                  )}
                </div>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-blue, #1A56DB)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: '6px',
                  flexShrink: 0,
                  marginTop: 'auto'
                }}>
                  <User size={14} color="#fff" />
                </div>
              </div>
            )}

            {/* AI Message */}
            {msg.role === 'ai' && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0E7490, #0D9488)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  <Bot size={15} color="#fff" />
                </div>

                <div style={{ flex: 1, maxWidth: '92%' }}>
                  {/* Conversational Text Bubble */}
                  {msg.text && (
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px 16px 16px 16px',
                      padding: '0.75rem 0.9rem',
                      fontSize: '0.85rem',
                      color: '#1E293B',
                      lineHeight: 1.5,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                      whiteSpace: 'pre-line',
                      marginBottom: msg.result ? '0.5rem' : 0
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                        <div style={{ flex: 1 }}>{msg.text}</div>
                        <button
                          onClick={() => handleSpeakMessage(msg.id, msg.text)}
                          title={t('chatbot.listen')}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: speakingMsgId === msg.id ? '#0D9488' : '#94A3B8',
                            padding: '2px',
                            flexShrink: 0
                          }}
                        >
                          <Volume2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Biomedical Waste Classification Card (when applicable) */}
                  {msg.result && (
                    <div style={{
                      backgroundColor: '#F0FDFA',
                      border: '1px solid #99F6E4',
                      borderRadius: '12px',
                      padding: '0.85rem',
                      fontSize: '0.82rem',
                      boxShadow: '0 2px 8px rgba(13, 148, 136, 0.08)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem' }}>
                        <span style={{ fontWeight: 700, color: '#0F766E', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <CheckCircle size={14} color="#0D9488" />
                          {t('chatbot.recommended')}
                        </span>
                        <span style={{
                          fontSize: '0.72rem',
                          backgroundColor: '#CCFBF1',
                          color: '#0F766E',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: 600
                        }}>
                          {msg.result.confidence}% {t('chatbot.match')}
                        </span>
                      </div>

                      {/* Type & Bin Row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.55rem' }}>
                        <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '0.45rem 0.65rem', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', marginBottom: '2px' }}>
                            {t('common.category')}
                          </div>
                          <strong style={{ color: '#0F172A', fontSize: '0.83rem' }}>
                            {t('categories.' + (msg.result.category || msg.result.type)) === 'categories.' + (msg.result.category || msg.result.type) ? (msg.result.category || msg.result.type) : t('categories.' + (msg.result.category || msg.result.type))}
                          </strong>
                        </div>

                        <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '0.45rem 0.65rem', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', marginBottom: '2px' }}>
                            {t('common.assignedBin')}
                          </div>
                          <span
                            className={`bin-tag bin-${msg.result.bin.toLowerCase()}`}
                            style={{ fontSize: '0.78rem', padding: '3px 8px', display: 'inline-block' }}
                          >
                            {t('bins.' + msg.result.bin)} {t('bins.bin')}
                          </span>
                        </div>
                      </div>

                      {/* Guidance */}
                      <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '0.5rem 0.65rem', border: '1px solid #E2E8F0', marginBottom: '0.55rem' }}>
                        <div style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', marginBottom: '2px' }}>
                          {t('chatbot.disposal')}
                        </div>
                        <p style={{ margin: 0, color: '#334155', fontSize: '0.8rem', lineHeight: 1.4 }}>
                          {msg.result.guidance}
                        </p>
                      </div>

                      {/* Risk warning */}
                      {msg.result.safetyWarning && (
                        <div style={{
                          backgroundColor: '#FEF2F2',
                          borderLeft: '3px solid #EF4444',
                          borderRadius: '4px',
                          padding: '0.45rem 0.65rem',
                          marginBottom: '0.6rem',
                          display: 'flex',
                          gap: '6px'
                        }}>
                          <AlertTriangle size={13} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <p style={{ margin: 0, color: '#991B1B', fontSize: '0.76rem', lineHeight: 1.4 }}>
                            {msg.result.safetyWarning}
                          </p>
                        </div>
                      )}

                      {/* Apply to Form Button (for Staff Form Auto-Fill) */}
                      {onSuggest && (
                        <button
                          onClick={() => handleApplyToForm(msg.id, msg.result)}
                          disabled={msg.applied || appliedRecordId === msg.id}
                          style={{
                            width: '100%',
                            padding: '0.45rem 0.75rem',
                            backgroundColor: (msg.applied || appliedRecordId === msg.id) ? '#10B981' : '#0D9488',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: (msg.applied || appliedRecordId === msg.id) ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {(msg.applied || appliedRecordId === msg.id) ? (
                            <>
                              <Check size={14} /> {t('chatbot.applied')}
                            </>
                          ) : (
                            <>
                              <Sparkles size={14} /> {t('chatbot.apply')}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Listening Live Pulse Pill */}
        {isListening && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #6EE7B7',
            padding: '0.55rem 0.9rem',
            borderRadius: '24px',
            alignSelf: 'center',
            fontSize: '0.8rem',
            color: '#065F46',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.15)',
            animation: 'pulse 1.5s infinite'
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#EF4444',
              animation: 'chatBounce 0.8s infinite'
            }} />
            <span>Listening in <strong>{SUPPORTED_LANGUAGES.find(l => l.code === selectedVoiceLang)?.label || 'Selected Language'}</strong>... Speak your query or item</span>
            <button
              onClick={stopListening}
              style={{
                backgroundColor: '#DC2626',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '2px 8px',
                fontSize: '0.72rem',
                cursor: 'pointer'
              }}
            >
              {t('chatbot.stop')}
            </button>
          </div>
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0E7490, #0D9488)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bot size={15} color="#fff" />
            </div>
            <div style={{
              backgroundColor: '#F1F5F9',
              borderRadius: '4px 16px 16px 16px',
              padding: '0.5rem 0.85rem'
            }}>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {[0, 150, 300].map(d => (
                  <div
                    key={d}
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#0D9488',
                      animation: 'chatBounce 1.2s infinite',
                      animationDelay: `${d}ms`
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ─── Quick Suggestion Chips ────────────────────────── */}
      <div style={{
        padding: '0.35rem 0.75rem',
        borderTop: '1px solid #E2E8F0',
        backgroundColor: '#F8FAFC',
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}>
        {getActivePrompts().map((qp, i) => (
          <button
            key={i}
            onClick={() => handleSend(qp.text)}
            style={{
              padding: '3px 8px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '12px',
              fontSize: '0.72rem',
              color: '#334155',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#0D9488'; e.currentTarget.style.color = '#0D9488'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#334155'; }}
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* ─── Image Preview Strip ───────────────────────────── */}
      {imagePreview && (
        <div style={{
          padding: '0.4rem 0.75rem',
          borderTop: '1px solid #E2E8F0',
          backgroundColor: '#F1F5F9',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <img
            src={imagePreview}
            alt="preview"
            style={{ height: '42px', width: '42px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #CBD5E1' }}
          />
          <span style={{ fontSize: '0.75rem', color: '#475569', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedImage?.name || t('chatbot.attached')}
          </span>
          <button
            onClick={() => { setSelectedImage(null); setImagePreview(null); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ─── Input & Voice Area ────────────────────────────── */}
      <div style={{
        padding: '0.65rem 0.85rem',
        borderTop: '1px solid #E2E8F0',
        backgroundColor: '#FFFFFF'
      }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {/* Camera / Upload */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleImageChange}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            title={t('chatbot.photo')}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#F1F5F9',
              border: '1px solid #CBD5E1',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: '#475569'
            }}
          >
            <Camera size={16} />
          </button>

          {/* Speech Recognition Mic Button */}
          <button
            onClick={startSpeechRecognition}
            title={isListening ? t('chatbot.stopListening') : t('chatbot.speak')}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: isListening ? '#EF4444' : '#E0F2FE',
              border: isListening ? '2px solid #DC2626' : '1px solid #BAE6FD',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: isListening ? '#FFFFFF' : '#0284C7',
              boxShadow: isListening ? '0 0 10px rgba(239, 68, 68, 0.5)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholderText()}
            style={{
              flex: 1,
              padding: '0.55rem 0.85rem',
              borderRadius: '20px',
              border: isListening ? '2px solid #EF4444' : '1px solid #CBD5E1',
              fontSize: '0.84rem',
              outline: 'none',
              backgroundColor: isListening ? '#FEF2F2' : '#FFFFFF',
              color: '#1E293B'
            }}
            disabled={isTyping}
          />

          {/* Send Button */}
          <button
            onClick={() => handleSend()}
            disabled={isTyping || (!inputText.trim() && !selectedImage)}
            title={t('chatbot.send')}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: (isTyping || (!inputText.trim() && !selectedImage)) ? '#E2E8F0' : '#0D9488',
              border: 'none',
              cursor: (isTyping || (!inputText.trim() && !selectedImage)) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: '#FFFFFF',
              transition: 'all 0.15s ease'
            }}
          >
            <Send size={15} />
          </button>
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes chatBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default WasteChatbot;
