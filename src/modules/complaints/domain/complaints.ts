export const COMPLAINT_CATEGORIES = ["payment", "deactivation", "safety", "harassment", "other"] as const;
export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number];
export type Language = "en" | "hi";

export const LIMITS = {
  platform: 80,
  referenceId: 80,
  location: 120,
  description: 3_000,
  desiredResolution: 500,
  subject: 200,
  paragraph: 2_000,
  listItem: 400,
  listItems: 15,
  maxAmountRupees: 1_000_000,
} as const;
export const MIN_DESCRIPTION_CHARS = 20;

export type ComplaintFacts = Readonly<{
  category: ComplaintCategory;
  platform: string;
  incidentDate: string;
  amount: number | null;
  referenceId: string;
  location: string;
  description: string;
  desiredResolution: string;
}>;

export type ComplaintDraft = Readonly<{
  subject: string;
  summary: string;
  facts: string[];
  request: string;
  evidence: string[];
}>;

export type MissingDetail = "platform" | "incident_date" | "amount" | "reference_id" | "location" | "desired_resolution";
export type ComplaintSummary = Readonly<{ id: string; category: ComplaintCategory; subject: string; updatedAt: string }>;
export type ComplaintRecord = ComplaintSummary & Readonly<{ facts: ComplaintFacts; draft: ComplaintDraft; language: Language; createdAt: string }>;

export type FieldError = "required" | "too_long" | "too_short" | "invalid" | "future_date";
export class ComplaintValidationError extends Error {
  constructor(readonly fields: Record<string, FieldError>) {
    super("Some complaint details are invalid.");
    this.name = "ComplaintValidationError";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const clean = (value: string) => value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();

/** Today's calendar date in India, used to reject incident dates in the future. */
export function todayInIndia(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value) && value >= "2000-01-01";
}

export function parseComplaintFacts(raw: unknown, now = new Date()): ComplaintFacts {
  const body = isRecord(raw) ? raw : {};
  const errors: Record<string, FieldError> = {};
  const text = (field: string, max: number, options: { required?: boolean; min?: number } = {}) => {
    const value = body[field];
    if (value === undefined || value === null || value === "") {
      if (options.required) errors[field] = "required";
      return "";
    }
    if (typeof value !== "string") {
      errors[field] = "invalid";
      return "";
    }
    const cleaned = clean(value);
    if (!cleaned && options.required) errors[field] = "required";
    else if (cleaned.length > max) errors[field] = "too_long";
    else if (options.min && cleaned.length < options.min) errors[field] = "too_short";
    return cleaned;
  };

  const category = COMPLAINT_CATEGORIES.includes(body.category as ComplaintCategory) ? (body.category as ComplaintCategory) : null;
  if (!category) errors.category = body.category === undefined || body.category === "" ? "required" : "invalid";

  const platform = text("platform", LIMITS.platform);
  const referenceId = text("referenceId", LIMITS.referenceId);
  const location = text("location", LIMITS.location);
  const description = text("description", LIMITS.description, { required: true, min: MIN_DESCRIPTION_CHARS });
  const desiredResolution = text("desiredResolution", LIMITS.desiredResolution);

  const incidentDate = text("incidentDate", 10);
  if (incidentDate && !errors.incidentDate) {
    if (!isRealDate(incidentDate)) errors.incidentDate = "invalid";
    else if (incidentDate > todayInIndia(now)) errors.incidentDate = "future_date";
  }

  let amount: number | null = null;
  if (body.amount !== undefined && body.amount !== null && body.amount !== "") {
    const value = body.amount;
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > LIMITS.maxAmountRupees || Math.abs(value * 100 - Math.round(value * 100)) > 1e-8) {
      errors.amount = "invalid";
    } else {
      amount = Math.round(value * 100) / 100;
    }
  }

  if (Object.keys(errors).length) throw new ComplaintValidationError(errors);
  return { category: category!, platform, incidentDate, amount, referenceId, location, description, desiredResolution };
}

const recommended: Record<ComplaintCategory, MissingDetail[]> = {
  payment: ["platform", "incident_date", "amount", "reference_id", "desired_resolution"],
  deactivation: ["platform", "incident_date", "reference_id", "desired_resolution"],
  safety: ["platform", "incident_date", "location", "desired_resolution"],
  harassment: ["platform", "incident_date", "location", "desired_resolution"],
  other: ["platform", "incident_date", "desired_resolution"],
};

const present: Record<MissingDetail, (facts: ComplaintFacts) => boolean> = {
  platform: (f) => Boolean(f.platform),
  incident_date: (f) => Boolean(f.incidentDate),
  amount: (f) => f.amount !== null,
  reference_id: (f) => Boolean(f.referenceId),
  location: (f) => Boolean(f.location),
  desired_resolution: (f) => Boolean(f.desiredResolution),
};

/** Details that strengthen this kind of complaint but were not provided. */
export function findMissingDetails(facts: ComplaintFacts): MissingDetail[] {
  return recommended[facts.category].filter((detail) => !present[detail](facts));
}

export const placeholders: Record<Language, Record<MissingDetail, string>> = {
  en: {
    platform: "[Company / app name]",
    incident_date: "[Date of incident]",
    amount: "[Amount in ₹]",
    reference_id: "[Order / trip / partner ID]",
    location: "[Location]",
    desired_resolution: "[What you want the company to do]",
  },
  hi: {
    platform: "[कंपनी / ऐप का नाम]",
    incident_date: "[घटना की तारीख]",
    amount: "[राशि ₹ में]",
    reference_id: "[ऑर्डर / ट्रिप / पार्टनर आईडी]",
    location: "[जगह]",
    desired_resolution: "[आप कंपनी से क्या चाहते हैं]",
  },
};

const categoryNames: Record<Language, Record<ComplaintCategory, string>> = {
  en: { payment: "Payment issue", deactivation: "Account deactivation", safety: "Safety concern", harassment: "Harassment", other: "Work-related issue" },
  hi: { payment: "भुगतान से जुड़ी समस्या", deactivation: "अकाउंट बंद होना", safety: "सुरक्षा से जुड़ी चिंता", harassment: "उत्पीड़न", other: "काम से जुड़ी समस्या" },
};

const evidenceByCategory: Record<Language, Record<ComplaintCategory, string[]>> = {
  en: {
    payment: ["Screenshot of the earnings or payout screen", "Bank statement for the period", "Order or trip details"],
    deactivation: ["Screenshot of the deactivation message", "Recent ratings and completed trips", "Earlier messages with support"],
    safety: ["Photos or videos, if safe to share", "Names or contacts of witnesses", "Trip or order details"],
    harassment: ["Screenshots of messages or calls", "Names or contacts of witnesses", "Trip or order details"],
    other: ["Screenshots related to the issue", "Earlier messages with support"],
  },
  hi: {
    payment: ["कमाई या पेआउट स्क्रीन का स्क्रीनशॉट", "उस अवधि का बैंक स्टेटमेंट", "ऑर्डर या ट्रिप की जानकारी"],
    deactivation: ["अकाउंट बंद होने के मैसेज का स्क्रीनशॉट", "हाल की रेटिंग और पूरी की गई ट्रिप", "सपोर्ट से पहले की बातचीत"],
    safety: ["फ़ोटो या वीडियो, अगर साझा करना सुरक्षित हो", "गवाहों के नाम या संपर्क", "ट्रिप या ऑर्डर की जानकारी"],
    harassment: ["मैसेज या कॉल के स्क्रीनशॉट", "गवाहों के नाम या संपर्क", "ट्रिप या ऑर्डर की जानकारी"],
    other: ["समस्या से जुड़े स्क्रीनशॉट", "सपोर्ट से पहले की बातचीत"],
  },
};

export const formatRupees = (amount: number) => `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: amount % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** Deterministic draft that uses only the given facts and placeholders; works without AI. */
export function buildTemplateDraft(facts: ComplaintFacts, language: Language): ComplaintDraft {
  const p = placeholders[language];
  const platform = facts.platform || p.platform;
  const date = facts.incidentDate || p.incident_date;
  const reference = facts.referenceId || p.reference_id;
  const amount = facts.amount !== null ? formatRupees(facts.amount) : p.amount;
  const resolution = facts.desiredResolution || p.desired_resolution;
  const category = categoryNames[language][facts.category];

  if (language === "hi") {
    return {
      subject: `${category} – ${platform} – ${reference}`,
      summary: `मैं ${platform} के साथ काम करता/करती हूं। ${date} को हुई ${category.toLowerCase()} के बारे में यह शिकायत दर्ज कर रहा/रही हूं।`,
      facts: [
        `तारीख: ${date}`,
        `संदर्भ आईडी: ${reference}`,
        ...(facts.category === "payment" ? [`राशि: ${amount}`] : []),
        ...(facts.location || facts.category === "safety" || facts.category === "harassment" ? [`जगह: ${facts.location || p.location}`] : []),
        `क्या हुआ: ${facts.description}`,
      ],
      request: `कृपया ${resolution}। मुझे लिखित जवाब और शिकायत संख्या दें।`,
      evidence: evidenceByCategory.hi[facts.category],
    };
  }
  return {
    subject: `${category} – ${platform} – ${reference}`,
    summary: `I work with ${platform}. I am raising a complaint about a ${category.toLowerCase()} that happened on ${date}.`,
    facts: [
      `Date: ${date}`,
      `Reference ID: ${reference}`,
      ...(facts.category === "payment" ? [`Amount: ${amount}`] : []),
      ...(facts.location || facts.category === "safety" || facts.category === "harassment" ? [`Location: ${facts.location || p.location}`] : []),
      `What happened: ${facts.description}`,
    ],
    request: `Please ${resolution}. Kindly reply in writing with a complaint or ticket number.`,
    evidence: evidenceByCategory.en[facts.category],
  };
}

export function parseComplaintDraft(raw: unknown): ComplaintDraft {
  const body = isRecord(raw) ? raw : {};
  const errors: Record<string, FieldError> = {};
  const text = (field: keyof ComplaintDraft, max: number, required: boolean) => {
    const value = body[field];
    if (typeof value !== "string") { errors[field] = value === undefined ? "required" : "invalid"; return ""; }
    const cleaned = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
    if (required && !cleaned) errors[field] = "required";
    else if (cleaned.length > max) errors[field] = "too_long";
    return cleaned;
  };
  const list = (field: keyof ComplaintDraft, required: boolean) => {
    const value = body[field];
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) { errors[field] = "invalid"; return []; }
    const items = (value as string[]).map(clean).filter(Boolean);
    if (required && !items.length) errors[field] = "required";
    else if (items.length > LIMITS.listItems || items.some((item) => item.length > LIMITS.listItem)) errors[field] = "too_long";
    return items;
  };
  const draft = {
    subject: text("subject", LIMITS.subject, true),
    summary: text("summary", LIMITS.paragraph, true),
    facts: list("facts", true),
    request: text("request", LIMITS.paragraph, true),
    evidence: list("evidence", false),
  };
  if (Object.keys(errors).length) throw new ComplaintValidationError(errors);
  return draft;
}

const numberTokens = (value: string) => (value.match(/\d[\d,./:-]*\d|\d/g) ?? []).map((token) => token.replace(/,/g, ""));

/**
 * Numbers, amounts, dates, and IDs in the draft that do not appear in the user's
 * facts; the AI may have invented them, so the user must confirm or remove them.
 */
export function findUnsupportedDetails(draft: ComplaintDraft, facts: ComplaintFacts): string[] {
  const source = [facts.platform, facts.incidentDate, facts.referenceId, facts.location, facts.description, facts.desiredResolution, facts.amount === null ? "" : `${facts.amount} ${facts.amount.toFixed(2)}`];
  if (facts.incidentDate) {
    const [y, m, d] = facts.incidentDate.split("-");
    source.push(`${d}/${m}/${y} ${d}-${m}-${y} ${d}.${m}.${y} ${Number(d)} ${Number(m)} ${y}`);
  }
  const allowed = new Set(source.flatMap(numberTokens));
  const draftText = [draft.subject, draft.summary, ...draft.facts, draft.request, ...draft.evidence].join("\n");
  return [...new Set(numberTokens(draftText).filter((token) => !allowed.has(token)))];
}

export function renderComplaintText(draft: ComplaintDraft, language: Language): string {
  const labels = language === "hi"
    ? { subject: "विषय", facts: "तथ्य", request: "मेरा अनुरोध", evidence: "संलग्न सबूत" }
    : { subject: "Subject", facts: "Facts", request: "Request", evidence: "Evidence attached" };
  const lines = [`${labels.subject}: ${draft.subject}`, "", draft.summary, "", `${labels.facts}:`, ...draft.facts.map((fact, i) => `${i + 1}. ${fact}`), "", `${labels.request}:`, draft.request];
  if (draft.evidence.length) lines.push("", `${labels.evidence}:`, ...draft.evidence.map((item) => `- ${item}`));
  return `${lines.join("\n")}\n`;
}

export const remainingPlaceholders = (draft: ComplaintDraft) =>
  [...new Set(renderComplaintText(draft, "en").match(/\[[^\]\n]{2,60}\]/g) ?? [])];
