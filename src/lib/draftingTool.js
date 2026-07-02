export const DRAFTING_DOCUMENT_TYPES = [
  { id: "letter_of_claim", label: "Letter of claim" },
  { id: "general_letter", label: "General letter" },
  { id: "response_letter", label: "Response letter" },
  { id: "settlement_letter", label: "Settlement letter" },
  { id: "custom_letter", label: "Custom letter" },
];

export const DRAFTING_TONES = [
  "Formal and firm",
  "Formal and neutral",
  "Collaborative",
  "Concise",
  "Robust",
];

export const DRAFTING_EMPTY_FORM = {
  document_type: "letter_of_claim",
  sender_name: "",
  sender_address: "",
  recipient_name: "",
  recipient_address: "",
  client_name: "",
  matter_reference: "",
  date: "",
  subject: "",
  background_facts: "",
  basis_of_claim: "",
  key_issues: "",
  chronology: "",
  desired_outcome: "",
  response_deadline: "",
  tone: "Formal and firm",
  additional_instructions: "",
};

const TYPE_LABELS = Object.fromEntries(DRAFTING_DOCUMENT_TYPES.map((item) => [item.id, item.label]));

export function draftingDocumentTypeLabel(value) {
  return TYPE_LABELS[value] || TYPE_LABELS.custom_letter;
}

export function draftingToday() {
  return new Date().toISOString().slice(0, 10);
}

function hasValue(value) {
  return String(value || "").trim().length > 0;
}

export function validateDraftingForm(form) {
  const type = form.document_type || "custom_letter";
  const required = type === "letter_of_claim"
    ? [
        ["sender_name", "Sender name is required for a letter of claim."],
        ["sender_address", "Sender address is required for a letter of claim."],
        ["recipient_name", "Recipient name is required for a letter of claim."],
        ["recipient_address", "Recipient address is required for a letter of claim."],
        ["background_facts", "Background facts are required for a letter of claim."],
        ["basis_of_claim", "Basis of claim is required for a letter of claim."],
        ["desired_outcome", "Remedy sought is required for a letter of claim."],
        ["response_deadline", "Response deadline is required for a letter of claim."],
      ]
    : [
        ["recipient_name", "Recipient name is required."],
        ["subject", "Subject / RE line is required."],
        ["background_facts", "Background or message content is required."],
      ];
  return required.filter(([field]) => !hasValue(form[field])).map(([, message]) => message);
}

export function normalizeDraftingRecord(record) {
  const documentType = record.document_type || record.style || "custom_letter";
  const draftText = record.draft_text || record.answer || "";
  return {
    ...record,
    draft_id: record.draft_id || record.brief_id,
    brief_id: record.brief_id || record.draft_id,
    record_label: "Drafting Tool",
    document_type: documentType,
    document_type_label: record.document_type_label || draftingDocumentTypeLabel(documentType),
    draft_text: draftText,
    answer: draftText,
    client_name: record.client_name || "",
  };
}

export function fileSafePart(value, fallback = "document") {
  return String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || fallback;
}

export function draftingFileBase({ document_type, client_name, date } = {}) {
  return [
    "drafting-tool",
    fileSafePart(draftingDocumentTypeLabel(document_type || "custom_letter")),
    fileSafePart(client_name || "client"),
    fileSafePart(date || draftingToday()),
  ].join("-");
}
