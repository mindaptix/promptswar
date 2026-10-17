import {
  buildTemplateDraft,
  ComplaintValidationError,
  findMissingDetails,
  findUnsupportedDetails,
  parseComplaintDraft,
  parseComplaintFacts,
  type ComplaintDraft,
  type ComplaintRecord,
  type ComplaintSummary,
  type Language,
  type MissingDetail,
} from "@/modules/complaints/domain/complaints";
import { requestComplaintDraft } from "@/modules/complaints/infrastructure/complaint-drafter";
import { findComplaintForUser, findComplaintsByUser, insertComplaint, updateComplaintDraft } from "@/modules/complaints/infrastructure/complaint-repository";

export type DraftResult = { draft: ComplaintDraft; missing: MissingDetail[]; unsupported: string[]; source: "ai" | "template" };

export class InvalidAiDraftError extends Error {
  constructor() {
    super("The AI draft was not in the expected format.");
    this.name = "InvalidAiDraftError";
  }
}

/** Validates facts and produces an editable draft, flagging any detail the user did not provide. */
export async function draftComplaint(rawFacts: unknown, language: Language, mode: "ai" | "template"): Promise<DraftResult> {
  const facts = parseComplaintFacts(rawFacts);
  const missing = findMissingDetails(facts);
  if (mode === "template") return { draft: buildTemplateDraft(facts, language), missing, unsupported: [], source: "template" };

  let draft: ComplaintDraft;
  try {
    draft = parseComplaintDraft(await requestComplaintDraft(facts, missing, language));
  } catch (error) {
    if (error instanceof ComplaintValidationError) throw new InvalidAiDraftError();
    throw error;
  }
  return { draft, missing, unsupported: findUnsupportedDetails(draft, facts), source: "ai" };
}

export function saveComplaint(userId: string, rawFacts: unknown, rawDraft: unknown, language: Language): Promise<ComplaintRecord> {
  return insertComplaint(userId, parseComplaintFacts(rawFacts), parseComplaintDraft(rawDraft), language);
}

export function updateComplaint(userId: string, id: string, rawDraft: unknown): Promise<ComplaintRecord | null> {
  return updateComplaintDraft(userId, id, parseComplaintDraft(rawDraft));
}

export const listComplaints = (userId: string): Promise<ComplaintSummary[]> => findComplaintsByUser(userId);
export const getComplaint = (userId: string, id: string): Promise<ComplaintRecord | null> => findComplaintForUser(userId, id);
