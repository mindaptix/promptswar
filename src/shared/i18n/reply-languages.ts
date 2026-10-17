/** Languages the AI assistant can answer in. The interface itself is English or Hindi. */
export const REPLY_LANGUAGES = [
  { code: "en", label: "English", name: "English" },
  { code: "hi", label: "हिन्दी", name: "Hindi in Devanagari script" },
  { code: "bn", label: "বাংলা", name: "Bengali in Bengali script" },
  { code: "mr", label: "मराठी", name: "Marathi in Devanagari script" },
  { code: "ta", label: "தமிழ்", name: "Tamil in Tamil script" },
  { code: "te", label: "తెలుగు", name: "Telugu in Telugu script" },
  { code: "kn", label: "ಕನ್ನಡ", name: "Kannada in Kannada script" },
  { code: "gu", label: "ગુજરાતી", name: "Gujarati in Gujarati script" },
] as const;

export type ReplyLanguage = (typeof REPLY_LANGUAGES)[number]["code"];

/** Unknown codes fall back to English instead of passing user input into the prompt. */
export function toReplyLanguage(value: unknown): (typeof REPLY_LANGUAGES)[number] {
  return REPLY_LANGUAGES.find((language) => language.code === value) ?? REPLY_LANGUAGES[0];
}
