import fs from "fs";
import path from "path";
import { TextEncoder } from "util";
import { makeDraftingDocx, makeSimplePdf } from "./exportFiles";
import {
  DRAFTING_DOCUMENT_TYPES,
  DRAFTING_EMPTY_FORM,
  draftingFileBase,
  normalizeDraftingRecord,
  validateDraftingForm,
} from "./draftingTool";

const root = path.resolve(__dirname, "../..");

global.TextEncoder = global.TextEncoder || TextEncoder;

function blobBytes(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.readAsArrayBuffer(blob);
  });
}

describe("Drafting Tool", () => {
  test("replaces the user-facing Brief Builder label", () => {
    const tools = fs.readFileSync(path.join(root, "src/pages/Tools.jsx"), "utf8");
    const caseLaw = fs.readFileSync(path.join(root, "src/pages/CaseLaw.jsx"), "utf8");
    expect(tools).toContain("Drafting Tool");
    expect(`${tools}\n${caseLaw}`).not.toContain("Brief Builder");
  });

  test("keeps old route compatibility while exposing Drafting Tool access", () => {
    const app = fs.readFileSync(path.join(root, "src/App.js"), "utf8");
    expect(app).toContain('path="/drafting-tool"');
    expect(app).toContain('path="/brief-builder"');
    expect(app).toContain('to="/drafting-tool"');
  });

  test("supports required document types", () => {
    expect(DRAFTING_DOCUMENT_TYPES.map((type) => type.id)).toEqual([
      "letter_of_claim",
      "general_letter",
      "response_letter",
      "settlement_letter",
      "custom_letter",
    ]);
  });

  test("validates letter of claim more strictly than a general letter", () => {
    expect(validateDraftingForm({ ...DRAFTING_EMPTY_FORM, document_type: "letter_of_claim" })).toEqual(expect.arrayContaining([
      "Sender name is required for a letter of claim.",
      "Basis of claim is required for a letter of claim.",
      "Remedy sought is required for a letter of claim.",
    ]));
    expect(validateDraftingForm({
      ...DRAFTING_EMPTY_FORM,
      document_type: "general_letter",
      recipient_name: "Jane Smith",
      subject: "Update",
      background_facts: "We write with a short update.",
    })).toEqual([]);
  });

  test("includes drafting generation routes and letter-of-claim sections", () => {
    const worker = fs.readFileSync(path.resolve(root, "cloudflare/_worker.js"), "utf8");
    expect(worker).toContain('path === "/drafting/generate"');
    expect(worker).toContain("Parties, Background, Chronology, Basis of claim, Losses/remedy sought");
    expect(worker).toContain('path === "/drafts"');
  });

  test("exports edited preview content", () => {
    const tools = fs.readFileSync(path.join(root, "src/pages/Tools.jsx"), "utf8");
    expect(tools).toContain("editedDraft");
    expect(tools).toContain("makeDraftingDocx(text");
    expect(tools).toContain("makeSimplePdf(text)");
  });

  test("creates Word and PDF export blobs", async () => {
    const docx = makeDraftingDocx("Edited letter text", "Drafting Tool");
    expect(docx.type).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(String.fromCharCode(...(await blobBytes(docx)).slice(0, 2))).toBe("PK");
    const pdf = makeSimplePdf("Edited letter text");
    expect(String.fromCharCode(...(await blobBytes(pdf)).slice(0, 4))).toBe("%PDF");
  });

  test("sanitises filenames and normalises old records", () => {
    expect(draftingFileBase({
      document_type: "letter_of_claim",
      client_name: "Client Name!",
      date: "2026-06-30",
    })).toBe("drafting-tool-letter-of-claim-client-name-2026-06-30");
    expect(normalizeDraftingRecord({ brief_id: "brief_1", answer: "Old saved text", style: "memo" })).toMatchObject({
      draft_id: "brief_1",
      record_label: "Drafting Tool",
      draft_text: "Old saved text",
    });
  });
});

describe("Camera Document AI", () => {
  test("exposes Camera AI as a standalone route with compatibility aliases", () => {
    const app = fs.readFileSync(path.join(root, "src/App.js"), "utf8");
    expect(app).toContain('path="/camera"');
    expect(app).toContain("CameraStandalone");
    expect(app).toContain('path="/camera-ai"');
    expect(app).toContain('path="/camera-ocr"');
    expect(app).toContain('to="/camera"');
  });

  test("keeps Studio Camera tab and links to the standalone tool", () => {
    const tools = fs.readFileSync(path.join(root, "src/pages/Tools.jsx"), "utf8");
    expect(tools).toContain('id: "camera", label: "Camera AI"');
    expect(tools).toContain('to="/camera"');
    expect(tools).toContain('data-testid="camera-open-standalone"');
  });

  test("supports standalone camera exports and editable captured wording", () => {
    const tools = fs.readFileSync(path.join(root, "src/pages/Tools.jsx"), "utf8");
    expect(tools).toContain("Camera Document AI Report");
    expect(tools).toContain("downloadCameraReport");
    expect(tools).toContain('data-testid="camera-download-word"');
    expect(tools).toContain('data-testid="camera-download-pdf"');
    expect(tools).toContain('data-testid="camera-copy-text"');
    expect(tools).toContain("setCapturedText(e.target.value)");
  });

  test("supports fast OCR-first analysis and saved camera note folders", () => {
    const worker = fs.readFileSync(path.resolve(root, "cloudflare/_worker.js"), "utf8");
    const tools = fs.readFileSync(path.join(root, "src/pages/Tools.jsx"), "utf8");
    expect(worker).toContain('path === "/tools/camera-notes"');
    expect(worker).toContain("normalizeCameraNote");
    expect(worker).toContain("camera-note:${user.user_id}");
    expect(worker).toContain("next_step: \"analysis_ready\"");
    expect(tools).toContain("CAMERA_SOURCE_TYPES");
    expect(tools).toContain("analyseTextValue(text)");
    expect(tools).toContain('data-testid="camera-note-folder"');
    expect(tools).toContain('data-testid="camera-save-note"');
    expect(tools).toContain('data-testid="camera-saved-notes"');
  });
});

describe("Local development startup", () => {
  test("auth falls back to a local guest when the API is unavailable", () => {
    const auth = fs.readFileSync(path.join(root, "src/lib/auth.jsx"), "utf8");
    expect(auth).toContain("startLocalGuestSession");
    expect(auth).toContain("local_guest");
    expect(auth).toContain("guest@local.ada");
  });

  test("Studio boot calls do not throw when metadata or app APIs are offline", () => {
    const tools = fs.readFileSync(path.join(root, "src/pages/Tools.jsx"), "utf8");
    expect(tools).toContain("FALLBACK_MODELS");
    expect(tools).toContain(".catch(() => setModels(FALLBACK_MODELS))");
    expect(tools).toContain(".catch(() => setApps([]))");
  });
});

describe("Local Ollama backend configuration", () => {
  test("backend allows localhost Ollama without an API key", () => {
    const worker = fs.readFileSync(path.resolve(root, "cloudflare/_worker.js"), "utf8");
    expect(worker).toContain("isLocalOllamaHost");
    expect(worker).toContain("canUseOllama");
    expect(worker).toContain("ollamaHeaders");
    expect(worker).toContain("defaultOllamaModel");
    expect(worker).toContain("OLLAMA_MODEL");
    expect(worker).toContain("127\\.0\\.0\\.1");
    expect(worker).toContain("availableOllamaModels");
    expect(worker).toContain("/api/tags");
  });

  test("backend exposes local Ollama models in the model selector list", () => {
    const worker = fs.readFileSync(path.resolve(root, "cloudflare/_worker.js"), "utf8");
    expect(worker).toContain('id: "llama3.2:latest"');
    expect(worker).toContain('label: "Local Ollama');
    expect(worker).toContain("ollama_local");
  });
});

describe("Mini Model Lab", () => {
  test("exposes a Studio tab and builder module for mini model training", () => {
    const tools = fs.readFileSync(path.join(root, "src/pages/Tools.jsx"), "utf8");
    expect(tools).toContain('id: "model-lab", label: "Model Lab"');
    expect(tools).toContain('id: "model_lab", label: "Mini Model Lab"');
    expect(tools).toContain("MiniModelLab");
    expect(tools).toContain('data-testid="mini-model-lab-section"');
  });

  test("prepares JSONL training data and trains a browser n-gram model", () => {
    const tools = fs.readFileSync(path.join(root, "src/pages/Tools.jsx"), "utf8");
    expect(tools).toContain("makeTrainingExamples");
    expect(tools).toContain("trainNgramModel");
    expect(tools).toContain("generateFromMiniModel");
    expect(tools).toContain('data-testid="mini-model-export-jsonl"');
    expect(tools).toContain('data-testid="mini-model-train"');
  });

  test("saves mini model records through Cloudflare KV routes", () => {
    const worker = fs.readFileSync(path.resolve(root, "cloudflare/_worker.js"), "utf8");
    expect(worker).toContain('path === "/tools/mini-models"');
    expect(worker).toContain("normalizeMiniModelRecord");
    expect(worker).toContain("mini-model:${user.user_id}");
    expect(worker).toContain("model_lab");
  });
});
