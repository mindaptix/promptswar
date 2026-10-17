export type Language = "en" | "hi";
export type Localized = Readonly<Record<Language, string>>;
export type WelfareNeed = "registration" | "pension" | "health" | "insurance";

export type OfficialSource = Readonly<{ label: string; url: string; publisher: Localized; reviewedOn: string }>;

/** A criterion copied from the official source; the app only compares answers to it and never decides eligibility. */
export type ListedCriterion =
  | Readonly<{ kind: "age_range"; min: number; max: number; text: Localized }>
  | Readonly<{ kind: "max_monthly_income"; rupees: number; text: Localized }>
  | Readonly<{ kind: "note"; text: Localized }>;

export type Scheme = Readonly<{
  id: string;
  name: Localized;
  needs: WelfareNeed[];
  about: Localized;
  sourceFacts: Localized[];
  criteria: ListedCriterion[];
  helpline: string | null;
  source: OfficialSource;
}>;

export const REVIEWED_ON = "2026-10-17";

const labour: Localized = { en: "Ministry of Labour & Employment, Government of India", hi: "श्रम एवं रोज़गार मंत्रालय, भारत सरकार" };
const finance: Localized = { en: "Department of Financial Services, Ministry of Finance", hi: "वित्तीय सेवा विभाग, वित्त मंत्रालय" };
const nha: Localized = { en: "National Health Authority", hi: "राष्ट्रीय स्वास्थ्य प्राधिकरण" };

// Only facts read on the linked official page on REVIEWED_ON are listed. Amounts
// that could not be read there (premiums, cover) are deliberately omitted.
export const SCHEMES: readonly Scheme[] = [
  {
    id: "e-shram",
    name: { en: "e-Shram registration", hi: "ई-श्रम पंजीकरण" },
    needs: ["registration"],
    about: {
      en: "The Ministry of Labour & Employment's national portal for registering unorganised workers.",
      hi: "असंगठित श्रमिकों के पंजीकरण के लिए श्रम एवं रोज़गार मंत्रालय का राष्ट्रीय पोर्टल।",
    },
    sourceFacts: [{ en: "Helpdesk 14434 or 1800 889 6811, 9 AM to 6 PM daily including Sundays.", hi: "हेल्पडेस्क 14434 या 1800 889 6811, रोज़ सुबह 9 से शाम 6 बजे तक, रविवार भी।" }],
    criteria: [],
    helpline: "14434",
    source: { label: "eshram.gov.in", url: "https://eshram.gov.in/", publisher: labour, reviewedOn: REVIEWED_ON },
  },
  {
    id: "pm-sym",
    name: { en: "Pradhan Mantri Shram Yogi Maan-dhan (PM-SYM)", hi: "प्रधानमंत्री श्रम योगी मान-धन (PM-SYM)" },
    needs: ["pension"],
    about: {
      en: "A government pension scheme for old-age protection and social security of unorganised workers.",
      hi: "असंगठित श्रमिकों की बुढ़ापे की सुरक्षा और सामाजिक सुरक्षा के लिए सरकारी पेंशन योजना।",
    },
    sourceFacts: [
      { en: "The official page lists a pension of ₹3,000 per month.", hi: "आधिकारिक पेज पर ₹3,000 प्रति माह पेंशन लिखी है।" },
      { en: "Voluntary and contributory, with a matching contribution by the Government of India.", hi: "स्वैच्छिक और अंशदायी, भारत सरकार बराबर अंशदान देती है।" },
    ],
    criteria: [
      { kind: "note", text: { en: "For unorganised workers", hi: "असंगठित श्रमिकों के लिए" } },
      { kind: "age_range", min: 18, max: 40, text: { en: "Entry age between 18 and 40 years", hi: "जुड़ने की उम्र 18 से 40 वर्ष" } },
      { kind: "max_monthly_income", rupees: 15_000, text: { en: "Monthly income up to ₹15,000", hi: "मासिक आय ₹15,000 तक" } },
    ],
    helpline: "14434",
    source: { label: "maandhan.in", url: "https://maandhan.in/", publisher: labour, reviewedOn: REVIEWED_ON },
  },
  {
    id: "jan-suraksha",
    name: { en: "Jan Suraksha schemes (PMJJBY, PMSBY, Atal Pension Yojana)", hi: "जन सुरक्षा योजनाएं (PMJJBY, PMSBY, अटल पेंशन योजना)" },
    needs: ["insurance", "pension"],
    about: {
      en: "The Department of Financial Services portal for Pradhan Mantri Jeevan Jyoti Bima Yojana (life insurance), Pradhan Mantri Suraksha Bima Yojana (accident insurance), and Atal Pension Yojana.",
      hi: "प्रधानमंत्री जीवन ज्योति बीमा योजना (जीवन बीमा), प्रधानमंत्री सुरक्षा बीमा योजना (दुर्घटना बीमा) और अटल पेंशन योजना के लिए वित्तीय सेवा विभाग का पोर्टल।",
    },
    sourceFacts: [
      { en: "National toll-free 1800-180-1111 or 1800-110-001.", hi: "राष्ट्रीय टोल-फ़्री 1800-180-1111 या 1800-110-001।" },
      { en: "Rules, forms, and FAQs for each scheme are on the portal.", hi: "हर योजना के नियम, फ़ॉर्म और FAQ पोर्टल पर हैं।" },
    ],
    criteria: [],
    helpline: "18001801111",
    source: { label: "jansuraksha.gov.in", url: "https://jansuraksha.gov.in/", publisher: finance, reviewedOn: REVIEWED_ON },
  },
  {
    id: "pm-jay",
    name: { en: "Ayushman Bharat PM-JAY beneficiary check", hi: "आयुष्मान भारत PM-JAY लाभार्थी जांच" },
    needs: ["health"],
    about: {
      en: "The National Health Authority's official portal to check whether you are listed as a PM-JAY beneficiary.",
      hi: "यह जांचने के लिए राष्ट्रीय स्वास्थ्य प्राधिकरण का आधिकारिक पोर्टल कि आप PM-JAY लाभार्थी सूची में हैं या नहीं।",
    },
    sourceFacts: [],
    criteria: [],
    helpline: null,
    source: { label: "beneficiary.nha.gov.in", url: "https://beneficiary.nha.gov.in/", publisher: nha, reviewedOn: REVIEWED_ON },
  },
];

export type Answers = Readonly<{ age?: number | null; monthlyIncome?: number | null }>;
export type CriterionCheck = Readonly<{ text: Localized; result: "matches_listed" | "outside_listed" | "not_answered" | "check_yourself" }>;
/** Eligibility is never decided by this app; only the official source can confirm it. */
export type SchemeAssessment = Readonly<{ scheme: Scheme; eligibility: "unknown"; checks: CriterionCheck[] }>;

const validNumber = (value: number | null | undefined) => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null);

function checkCriterion(criterion: ListedCriterion, answers: Answers): CriterionCheck {
  if (criterion.kind === "note") return { text: criterion.text, result: "check_yourself" };
  if (criterion.kind === "age_range") {
    const age = validNumber(answers.age);
    if (age === null) return { text: criterion.text, result: "not_answered" };
    return { text: criterion.text, result: age >= criterion.min && age <= criterion.max ? "matches_listed" : "outside_listed" };
  }
  const income = validNumber(answers.monthlyIncome);
  if (income === null) return { text: criterion.text, result: "not_answered" };
  return { text: criterion.text, result: income <= criterion.rupees ? "matches_listed" : "outside_listed" };
}

/** Lists schemes for the selected needs and compares answers with listed criteria, never concluding eligibility. */
export function assessSchemes(needs: WelfareNeed[], answers: Answers = {}): SchemeAssessment[] {
  const selected = needs.length ? SCHEMES.filter((scheme) => scheme.needs.some((need) => needs.includes(need))) : SCHEMES;
  return selected.map((scheme) => ({ scheme, eligibility: "unknown", checks: scheme.criteria.map((criterion) => checkCriterion(criterion, answers)) }));
}
