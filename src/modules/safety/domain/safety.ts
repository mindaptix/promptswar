export type Language = "en" | "hi";
export type Localized = Readonly<Record<Language, string>>;
export type Situation = "road_accident" | "threat_or_harassment" | "cyber_fraud" | "health_emergency" | "unsafe_location";
export type ComplaintCategoryHint = "safety" | "harassment" | "payment" | "other";

export type Helpline = Readonly<{ id: string; number: string; name: Localized; use: Localized; sourceUrl: string; reviewedOn: string; pageConfirmed: boolean }>;
export type SafetyGuide = Readonly<{ situation: Situation; title: Localized; steps: Localized[]; helplines: string[]; complaintCategory: ComplaintCategoryHint | null }>;

export const REVIEWED_ON = "2026-10-17";

// pageConfirmed is false when the number is the nationally published one but the
// official page could not be loaded to re-read it on REVIEWED_ON.
export const HELPLINES: readonly Helpline[] = [
  {
    id: "emergency",
    number: "112",
    name: { en: "National emergency number", hi: "राष्ट्रीय आपातकालीन नंबर" },
    use: { en: "Police, fire, or ambulance when someone is in danger right now.", hi: "जब किसी की जान या सुरक्षा को अभी खतरा हो: पुलिस, फ़ायर या एम्बुलेंस।" },
    sourceUrl: "https://112.gov.in/",
    reviewedOn: REVIEWED_ON,
    pageConfirmed: false,
  },
  {
    id: "cyber",
    number: "1930",
    name: { en: "National cyber crime helpline", hi: "राष्ट्रीय साइबर अपराध हेल्पलाइन" },
    use: { en: "Report online or UPI fraud as soon as possible. You can also report at cybercrime.gov.in.", hi: "ऑनलाइन या UPI धोखाधड़ी की जल्द से जल्द शिकायत करें। cybercrime.gov.in पर भी शिकायत कर सकते हैं।" },
    sourceUrl: "https://cybercrime.gov.in/",
    reviewedOn: REVIEWED_ON,
    pageConfirmed: false,
  },
  {
    id: "labour",
    number: "14434",
    name: { en: "e-Shram and Maan-dhan helpdesk", hi: "ई-श्रम और मान-धन हेल्पडेस्क" },
    use: { en: "Questions about worker registration and the PM-SYM pension scheme.", hi: "श्रमिक पंजीकरण और PM-SYM पेंशन योजना से जुड़े सवाल।" },
    sourceUrl: "https://eshram.gov.in/",
    reviewedOn: REVIEWED_ON,
    pageConfirmed: true,
  },
];

const step = (en: string, hi: string): Localized => ({ en, hi });

export const SAFETY_GUIDES: readonly SafetyGuide[] = [
  {
    situation: "road_accident",
    title: { en: "Road accident", hi: "सड़क दुर्घटना" },
    steps: [
      step("If anyone is hurt or in danger, call 112 first.", "अगर कोई घायल है या खतरे में है, तो सबसे पहले 112 पर कॉल करें।"),
      step("Move yourself and your vehicle out of traffic only if it is safe to do so.", "सुरक्षित हो तभी खुद को और वाहन को ट्रैफ़िक से हटाएं।"),
      step("Take photos of the place, vehicles, and any injuries, and note the time.", "जगह, वाहनों और चोटों की फ़ोटो लें और समय नोट करें।"),
      step("Note the order or trip ID and tell the platform through its in-app help or SOS, if it has one.", "ऑर्डर या ट्रिप आईडी नोट करें और ऐप की हेल्प या SOS (अगर हो) से प्लेटफ़ॉर्म को बताएं।"),
      step("Keep medical bills and reports; you may need them for insurance or a complaint.", "मेडिकल बिल और रिपोर्ट संभालकर रखें; बीमा या शिकायत में इनकी ज़रूरत पड़ सकती है।"),
    ],
    helplines: ["emergency"],
    complaintCategory: "safety",
  },
  {
    situation: "threat_or_harassment",
    title: { en: "Threat or harassment", hi: "धमकी या उत्पीड़न" },
    steps: [
      step("If you feel unsafe right now, move to a public place and call 112.", "अगर अभी असुरक्षित महसूस हो, तो किसी सार्वजनिक जगह जाएं और 112 पर कॉल करें।"),
      step("Do not argue or go back alone; your safety matters more than the order.", "बहस न करें और अकेले वापस न जाएं; ऑर्डर से ज़्यादा आपकी सुरक्षा ज़रूरी है।"),
      step("Save messages, call logs, and screenshots before they disappear.", "मैसेज, कॉल लॉग और स्क्रीनशॉट मिटने से पहले सेव कर लें।"),
      step("Write down what happened, when, and where, while you remember it clearly.", "जो हुआ, कब और कहां हुआ, याद रहते हुए लिख लें।"),
      step("Report it to the platform with the order or trip ID.", "ऑर्डर या ट्रिप आईडी के साथ प्लेटफ़ॉर्म को रिपोर्ट करें।"),
    ],
    helplines: ["emergency"],
    complaintCategory: "harassment",
  },
  {
    situation: "cyber_fraud",
    title: { en: "Online or UPI fraud", hi: "ऑनलाइन या UPI धोखाधड़ी" },
    steps: [
      step("Never share an OTP, UPI PIN, or password, even with someone claiming to be from your platform or bank.", "OTP, UPI PIN या पासवर्ड कभी साझा न करें, चाहे कोई खुद को प्लेटफ़ॉर्म या बैंक का बताए।"),
      step("If money was taken, call 1930 or report at cybercrime.gov.in as soon as possible.", "अगर पैसे कट गए हों, तो जल्द से जल्द 1930 पर कॉल करें या cybercrime.gov.in पर शिकायत करें।"),
      step("Contact your bank using the number on its official app or card, not a number sent to you.", "बैंक से उसके आधिकारिक ऐप या कार्ड पर लिखे नंबर पर ही संपर्क करें, किसी भेजे गए नंबर पर नहीं।"),
      step("Keep screenshots of messages, the transaction ID, and the time.", "मैसेज, ट्रांज़ैक्शन आईडी और समय के स्क्रीनशॉट रखें।"),
    ],
    helplines: ["cyber"],
    complaintCategory: null,
  },
  {
    situation: "health_emergency",
    title: { en: "Feeling unwell on shift", hi: "काम के दौरान तबीयत बिगड़ना" },
    steps: [
      step("For chest pain, fainting, trouble breathing, or confusion, stop and call 112.", "सीने में दर्द, बेहोशी, सांस लेने में तकलीफ़ या भ्रम हो, तो रुकें और 112 पर कॉल करें।"),
      step("Stop riding or driving and rest somewhere shaded and safe.", "गाड़ी चलाना बंद करें और किसी छायादार, सुरक्षित जगह आराम करें।"),
      step("Drink water and tell someone where you are.", "पानी पिएं और किसी को बताएं कि आप कहां हैं।"),
      step("Go offline in the app so you are not assigned new orders.", "ऐप में ऑफ़लाइन हो जाएं ताकि नए ऑर्डर न मिलें।"),
    ],
    helplines: ["emergency"],
    complaintCategory: null,
  },
  {
    situation: "unsafe_location",
    title: { en: "Unsafe pickup or drop location", hi: "असुरक्षित पिकअप या ड्रॉप लोकेशन" },
    steps: [
      step("Your safety comes first: instead of entering a place that feels unsafe, wait in a public, well-lit spot.", "आपकी सुरक्षा सबसे पहले है: असुरक्षित लगने वाली जगह में जाने के बजाय किसी सार्वजनिक, रोशनी वाली जगह पर रुकें।"),
      step("Contact the customer or platform support through the app before going further.", "आगे बढ़ने से पहले ऐप से ग्राहक या प्लेटफ़ॉर्म सपोर्ट से संपर्क करें।"),
      step("Share your live location with someone you trust.", "किसी भरोसेमंद व्यक्ति के साथ अपनी लाइव लोकेशन साझा करें।"),
      step("If you are threatened, leave and call 112.", "अगर धमकी मिले, तो वहां से निकलें और 112 पर कॉल करें।"),
    ],
    helplines: ["emergency"],
    complaintCategory: "safety",
  },
];

export const helplineById = (id: string) => HELPLINES.find((helpline) => helpline.id === id);
