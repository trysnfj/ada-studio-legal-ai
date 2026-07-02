const APP_TYPES = {
  contract_reviewer: {
    label: "Contract Reviewer",
    default_instructions: "You are a contract review assistant for UK law. Identify risky clauses, missing protections, ambiguous language, and obligations. Always cite the specific clause or section in the uploaded contract.",
    default_format: "Markdown with sections: Summary, Key Risks, Missing Provisions, Recommendations, Citations.",
  },
  chronology_builder: {
    label: "Chronology Builder",
    default_instructions: "Extract and order all dated events from the uploaded documents. Build a precise chronological timeline. Cite each entry to its source.",
    default_format: "Markdown table with columns: Date | Event | Source citation.",
  },
  letter_generator: {
    label: "Legal Letter Generator",
    default_instructions: "Draft a professional UK legal letter based on the facts in the uploaded documents and the user's request. Use formal English legal style.",
    default_format: "Letter with address block, date, salutation, body, sign-off.",
  },
  research_assistant: {
    label: "Research Assistant",
    default_instructions: "Answer legal research questions strictly from the uploaded sources. If the sources do not contain enough information, say so clearly.",
    default_format: "Markdown with: Answer, Reasoning, Citations, Limitations.",
  },
};

const OLLAMA_MODELS = [
  { id: "llama3.2:latest", label: "Local Ollama · Llama 3.2" },
  { id: "nadiacd96/HIHI:latest", label: "Local Ollama · HIHI" },
  { id: "gemma4:latest", label: "Local Ollama · Gemma 4" },
  { id: "gpt-oss:120b-cloud", label: "Ollama Cloud · GPT-OSS 120B" },
  { id: "gpt-oss:20b-cloud", label: "Ollama Cloud · GPT-OSS 20B" },
  { id: "kimi-k2.7-code:cloud", label: "Ollama Cloud · Kimi K2.7 Code" },
  { id: "glm-5.2:cloud", label: "Ollama Cloud · GLM 5.2" },
  { id: "minimax-m3:cloud", label: "Ollama Cloud · MiniMax M3" },
  { id: "nemotron-3-ultra:cloud", label: "Ollama Cloud · Nemotron 3 Ultra" },
  { id: "gemma4:cloud", label: "Ollama Cloud · Gemma 4" },
  { id: "gemma4:31b-cloud", label: "Ollama Cloud · Gemma 4 31B" },
  { id: "qwen3.5:cloud", label: "Ollama Cloud · Qwen 3.5" },
  { id: "qwen3.5:397b-cloud", label: "Ollama Cloud · Qwen 3.5 397B" },
  { id: "glm-5.1:cloud", label: "Ollama Cloud · GLM 5.1" },
  { id: "minimax-m2.7:cloud", label: "Ollama Cloud · MiniMax M2.7" },
  { id: "nemotron-3-super:cloud", label: "Ollama Cloud · Nemotron 3 Super" },
  { id: "glm-5:cloud", label: "Ollama Cloud · GLM 5" },
  { id: "minimax-m2.5:cloud", label: "Ollama Cloud · MiniMax M2.5" },
  { id: "kimi-k2.6:cloud", label: "Ollama Cloud · Kimi K2.6" },
  { id: "deepseek-v4-pro:cloud", label: "Ollama Cloud · DeepSeek V4 Pro" },
  { id: "deepseek-v4-flash:cloud", label: "Ollama Cloud · DeepSeek V4 Flash" },
  { id: "kimi-k2.5:cloud", label: "Ollama Cloud · Kimi K2.5" },
  { id: "qwen3-coder:480b-cloud", label: "Ollama Cloud · Qwen3 Coder 480B" },
  { id: "glm-4.7:cloud", label: "Ollama Cloud · GLM 4.7" },
  { id: "gemini-3-flash-preview:cloud", label: "Ollama Cloud · Gemini 3 Flash Preview" },
  { id: "minimax-m2.1:cloud", label: "Ollama Cloud · MiniMax M2.1" },
  { id: "deepseek-v3.1:671b-cloud", label: "Ollama Cloud · DeepSeek V3.1 671B" },
];

const FCL_BASE = "https://caselaw.nationalarchives.gov.uk";
const DISCLAIMER = "This output is AI-generated legal information, not legal advice. Verify against source documents and current law before relying.";
const DEFAULT_OLLAMA_MODEL = "gpt-oss:120b-cloud";
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const MAX_SEARCHABLE_CHARS = 500000;
const MAX_INLINE_PARSE_BYTES = 128 * 1024;
const MAX_FAST_PARSE_BYTES = 4 * 1024 * 1024;
const MIN_EXTRACTED_TEXT_CHARS = 5;
const MAX_COMPARE_UPLOAD_BYTES = 95 * 1024 * 1024;
const MAX_COMPARE_TEXT_BYTES = 2 * 1024 * 1024;
const MAX_COMPARE_DOCX_XML_BYTES = 6 * 1024 * 1024;
const DOCX_CENTRAL_DIRECTORY_LOOKBACK_BYTES = 96 * 1024;
const MAX_CAMERA_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_R2_PARSE_BYTES = MAX_UPLOAD_BYTES;
const MAX_RAG_CONTEXT_CHARS = 9000;
const MAX_CASELAW_FEED_BYTES = 512 * 1024;
const MAX_CASELAW_PAGE_BYTES = 192 * 1024;
const MAX_CASELAW_EXCERPT_CHARS = 12000;
const MAX_TOOL_PREVIEW_CHARS = 14000;
const MAX_TOOL_OUTPUT_TOKENS = 12000;
const DEFAULT_BRIEF_OUTPUT_TOKENS = MAX_TOOL_OUTPUT_TOKENS;
const MAX_BRIEF_MATTER_CHARS = 12000;
const MAX_BRIEF_AUTHORITY_SUMMARY_CHARS = 2500;
const MAX_BRIEF_AUTHORITIES = 30;
const MAX_DRAFTING_FIELD_CHARS = 12000;
const MAX_MINI_MODEL_SOURCE_CHARS = 120000;
const MAX_MINI_MODEL_JSONL_CHARS = 220000;
const MAX_MINI_MODEL_DATA_CHARS = 260000;
const DRAFTING_DOCUMENT_TYPES = {
  letter_of_claim: "Letter of claim",
  general_letter: "General letter",
  response_letter: "Response letter",
  settlement_letter: "Settlement letter",
  custom_letter: "Custom letter",
};
const ALLOWED_APP_MODULES = ["rag", "caselaw", "camera", "compare", "chronology", "model_lab", "guided_reader", "brief_export", "audit"];
const memory = globalThis.__ADA_MEMORY_STORE || (globalThis.__ADA_MEMORY_STORE = new Map());

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

function error(status, detail) {
  return json({ detail }, status);
}

function sanitizeAppModules(value, fallback = ["rag", "caselaw", "camera"]) {
  const source = Array.isArray(value) ? value : fallback;
  return Array.from(new Set(
    source
      .map((item) => String(item || "").trim())
      .filter((item) => ALLOWED_APP_MODULES.includes(item))
  ));
}

function publicApp(app) {
  const result = { ...(app || {}) };
  delete result.documents_text;
  delete result["requires_" + "human_" + "review"];
  result.modules = sanitizeAppModules(result.modules, []);
  return result;
}

function nowIso() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function b64url(bytes) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlText(text) {
  return b64url(new TextEncoder().encode(text));
}

function fromB64url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const raw = atob(normalized);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message))));
}

async function sha256(text) {
  return b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))));
}

async function hashPassword(password, salt) {
  return sha256(`${salt}:${password}`);
}

function secret(env) {
  return env.JWT_SECRET || "ada-studio-worker-dev-secret";
}

async function makeToken(env, userId) {
  const header = b64urlText(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64urlText(JSON.stringify({
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
  }));
  const body = `${header}.${payload}`;
  return `${body}.${await hmac(secret(env), body)}`;
}

async function verifyToken(env, token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const body = `${parts[0]}.${parts[1]}`;
  const expected = await hmac(secret(env), body);
  if (expected !== parts[2]) return null;
  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(fromB64url(parts[1])));
  } catch {
    return null;
  }
  if (!payload.sub || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload.sub;
}

async function kvGet(env, key) {
  if (env.ADA_KV) return env.ADA_KV.get(key, "json");
  const raw = memory.get(key);
  return raw ? JSON.parse(raw) : null;
}

async function kvPut(env, key, value) {
  const raw = JSON.stringify(value);
  if (env.ADA_KV) return env.ADA_KV.put(key, raw);
  memory.set(key, raw);
}

async function kvDelete(env, key) {
  if (env.ADA_KV) return env.ADA_KV.delete(key);
  memory.delete(key);
}

async function kvList(env, prefix) {
  if (env.ADA_KV) {
    let cursor;
    const items = [];
    do {
      const page = await env.ADA_KV.list({ prefix, cursor });
      for (const key of page.keys) {
        const value = await kvGet(env, key.name);
        if (value) items.push(value);
      }
      cursor = page.cursor;
      if (page.list_complete) break;
    } while (cursor);
    return items;
  }
  return Array.from(memory.entries())
    .filter(([key]) => key.startsWith(prefix))
    .map(([, value]) => JSON.parse(value));
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

async function documentsForApp(env, appId, app) {
  const indexed = [];
  for (const docId of Array.isArray(app?.document_ids) ? app.document_ids : []) {
    const doc = await kvGet(env, `doc:${appId}:${docId}`);
    if (doc) indexed.push(doc);
  }
  const listed = await kvList(env, `doc:${appId}:`);
  return uniqueBy([...indexed, ...listed], (doc) => doc.doc_id);
}

async function currentUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const userId = await verifyToken(env, token);
  return userId ? kvGet(env, `user:${userId}`) : null;
}

async function requireUser(request, env) {
  const user = await currentUser(request, env);
  if (!user) throw new Response(JSON.stringify({ detail: "Not authenticated" }), {
    status: 401,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
  return user;
}

async function parseJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function stripInternal(record) {
  const clone = { ...record };
  delete clone.password_hash;
  delete clone.password_salt;
  return clone;
}

function overlapTail(text, maxChars) {
  const tail = String(text || "").slice(-maxChars).trim();
  return tail.replace(/^\S+\s+/, "");
}

function chunkText(text, size = 1200, overlap = 220) {
  const cleaned = normalizeExtractedText(text);
  if (!cleaned) return [];
  const chunks = [];
  const units = cleaned.match(/[^.!?;:]+[.!?;:]*(?:\s+|$)/g) || [cleaned];
  let current = "";
  for (const rawUnit of units) {
    let unit = rawUnit.trim();
    if (!unit) continue;
    while (unit.length > size) {
      const part = unit.slice(0, size).trim();
      if (part) chunks.push(part);
      unit = `${overlapTail(part, overlap)} ${unit.slice(size)}`.trim();
      if (unit.length <= size) break;
    }
    if (`${current} ${unit}`.trim().length > size && current) {
      chunks.push(current);
      current = `${overlapTail(current, overlap)} ${unit}`.trim();
    } else {
      current = `${current} ${unit}`.trim();
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

const STOP_WORDS = new Set([
  "about", "after", "again", "against", "also", "because", "been", "being", "between", "could",
  "does", "from", "have", "into", "itself", "just", "more", "most", "only", "other", "over",
  "same", "should", "such", "than", "that", "their", "them", "then", "there", "these", "they",
  "this", "those", "through", "under", "very", "what", "when", "where", "which", "while",
  "with", "would", "your", "were", "will", "shall",
]);

function stemToken(token) {
  let value = String(token || "").toLowerCase().replace(/^'+|'+$/g, "");
  if (value.endsWith("'s")) value = value.slice(0, -2);
  if (value.length > 5 && value.endsWith("ies")) return `${value.slice(0, -3)}y`;
  if (value.length > 6 && value.endsWith("ing")) return value.slice(0, -3);
  if (value.length > 5 && value.endsWith("ed")) return value.slice(0, -2);
  if (value.length > 4 && value.endsWith("es")) return value.slice(0, -2);
  if (value.length > 4 && value.endsWith("s")) return value.slice(0, -1);
  return value;
}

function tokenize(value) {
  return String(value || "")
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .map(stemToken)
    .filter((token) => (token.length > 2 || /^\d+$/.test(token)) && !STOP_WORDS.has(token));
}

function termCounts(tokens) {
  const counts = new Map();
  for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
  return counts;
}

function textScore(query, text) {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return 0;
  const textTokens = tokenize(text);
  if (!textTokens.length) return 0;
  const queryCounts = termCounts(queryTokens);
  const textCounts = termCounts(textTokens);
  const queryTerms = [...queryCounts.keys()];
  let covered = 0;
  let weightedHits = 0;
  for (const term of queryTerms) {
    const count = textCounts.get(term) || 0;
    if (count) {
      covered += 1;
      weightedHits += Math.min(3, count);
    }
  }
  const normalizedQuery = normalizeExtractedText(query).toLowerCase();
  const normalizedText = normalizeExtractedText(text).toLowerCase();
  const phraseBonus = normalizedQuery.length > 12 && normalizedText.includes(normalizedQuery) ? 1.25 : 0;
  const coverage = covered / queryTerms.length;
  const density = weightedHits / Math.max(12, textTokens.length);
  return coverage * 2 + density + phraseBonus;
}

function selectCitations(question, docs, limit = 8) {
  const scored = [];
  for (const doc of docs) {
    for (const [index, chunk] of (doc.chunks || []).entries()) {
      const score = textScore(question, chunk);
      scored.push({ doc, index, chunk, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  const positive = scored.filter((item) => item.score > 0);
  const pool = positive.length ? positive : scored;
  const perDoc = new Map();
  const selected = [];
  for (const item of pool) {
    const count = perDoc.get(item.doc.doc_id) || 0;
    if (count >= 4) continue;
    selected.push(item);
    perDoc.set(item.doc.doc_id, count + 1);
    if (selected.length >= limit) break;
  }
  return selected.map((item, index) => ({
    tag: `S${index + 1}`,
    doc_id: item.doc.doc_id,
    doc_name: item.doc.filename,
    chunk_id: `${item.doc.doc_id}:${item.index}`,
    ord: item.index,
    score: item.score || 0.01,
    preview: item.chunk.slice(0, 700),
  }));
}

function withDisclaimer(answer) {
  const text = String(answer || "").trim();
  if (!text) return DISCLAIMER;
  return text.includes(DISCLAIMER) ? text : `${text}\n\n${DISCLAIMER}`;
}

function cleanAssistantAnswer(answer) {
  let text = String(answer || "").trim();
  const markers = ["**Answer**", "# Answer", "Answer:", "answer:", "Answer\n", "answer\n"];
  for (const marker of markers) {
    const index = text.toLowerCase().indexOf(marker.toLowerCase());
    if (index > 0 && index < 1000) {
      text = text.slice(index).trim();
      break;
    }
  }
  text = text
    .replace(/^(?:we need to answer|the user asks|need to answer|we should answer)[\s\S]{0,800}?(?=(?:\*\*Answer\*\*|# Answer|Answer:|Answer\n))/i, "")
    .replace(/^answer:\s*/i, "**Answer**\n")
    .replace(/\bwe can provide general information\.\s*/gi, "")
    .replace(/\bwe should(?:\s+note|\s+not|\s+keep|\s+say|\s+state|\s+avoid)?[^.?!]*(?:[.?!]|$)\s*/gi, "")
    .replace(/\bwe need to[^.?!]*(?:[.?!]|$)\s*/gi, "")
    .trim();
  return text;
}

function looksLikePlanningText(answer) {
  return /^(?:the user asks|they say|the instructions say|we need|we should|need to answer|we can provide)/i.test(String(answer || "").trim());
}

function cleanToolAnswer(answer) {
  let text = cleanAssistantAnswer(answer);
  text = text
    .replace(/^(?:the original document|the original document content|also the instruction|so we produce|we just modify|let's produce|now produce|ensure formatting)[\s\S]{0,6000}?(?=(?:\*\*Comparison\*\*|# Comparison|\| *(?:Topic|Area\/Clause) *\||Topics?:))/i, "")
    .replace(/^provide a markdown table[\s\S]{0,6000}?(?=\| *(?:Topic|Area\/Clause) *\|)/i, "")
    .replace(/^(?:the user message includes|we have|we need|then summarize|now compare|issues:|risks:|recommended action:|suggested wording:)[\s\S]{0,6000}?(?=\| *(?:Topic|Area\/Clause) *\|)/i, "")
    .replace(/^(?:let's produce final answer\.?|final answer:)\s*/i, "")
    .trim();
  const starts = [
    "**Comparison**",
    "# Comparison",
    "| Topic |",
    "|Topic|",
    "| Area/Clause |",
    "|Area/Clause|",
  ];
  const lower = text.toLowerCase();
  const indexes = starts
    .map((marker) => lower.indexOf(marker.toLowerCase()))
    .filter((index) => index > 0 && index < 3000);
  if (indexes.length) text = text.slice(Math.min(...indexes)).trim();
  return text;
}

function normalizeMaxTokens(value, fallback = 1200) {
  if (typeof value === "string" && /^(?:max|maximum|unrestricted|full)$/i.test(value.trim())) return MAX_TOOL_OUTPUT_TOKENS;
  const parsed = Number(value);
  const base = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  return Math.max(256, Math.min(MAX_TOOL_OUTPUT_TOKENS, Math.round(base)));
}

function aiTimeoutForTokens(maxTokens, baseMs = 20000) {
  return Math.min(55000, Math.max(baseMs, baseMs + normalizeMaxTokens(maxTokens, baseMs) * 4));
}

function citationContext(citations) {
  let used = 0;
  const blocks = [];
  for (const citation of citations) {
    const header = `[${citation.tag}] ${citation.doc_name}, chunk ${citation.ord + 1}`;
    const preview = citation.preview.slice(0, Math.max(0, MAX_RAG_CONTEXT_CHARS - used - header.length - 4));
    if (!preview) break;
    blocks.push(`${header}\n${preview}`);
    used += header.length + preview.length + 2;
    if (used >= MAX_RAG_CONTEXT_CHARS) break;
  }
  return blocks.join("\n\n");
}

function aiTextFromResult(result) {
  if (typeof result === "string") return result.trim();
  if (!result || typeof result !== "object") return "";
  if (typeof result.message?.content === "string" && result.message.content.trim()) return result.message.content.trim();
  for (const key of ["response", "output_text", "text", "answer", "description"]) {
    if (typeof result[key] === "string" && result[key].trim()) return result[key].trim();
  }
  if (Array.isArray(result.output)) {
    const text = result.output.flatMap((item) => {
      if (typeof item?.content === "string") return [item.content];
      if (Array.isArray(item?.content)) return item.content.map((part) => part?.text || part?.content || "").filter(Boolean);
      return [];
    }).join("\n").trim();
    if (text) return text;
  }
  if (typeof result.result?.response === "string") return result.result.response.trim();
  return "";
}

function defaultOllamaModel(env) {
  const model = String(env?.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL);
  return /^[A-Za-z0-9_.:/-]{1,120}$/.test(model) ? model : DEFAULT_OLLAMA_MODEL;
}

function selectedOllamaModel(app, env) {
  const model = String(app?.model || defaultOllamaModel(env));
  if (OLLAMA_MODELS.some((item) => item.id === model)) return model;
  return /^[A-Za-z0-9_.:/-]{1,120}$/.test(model) ? model : defaultOllamaModel(env);
}

function ollamaHost(env) {
  return String(env.OLLAMA_HOST || "https://ollama.com").replace(/\/+$/, "");
}

function isLocalOllamaHost(host) {
  return /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(String(host || ""));
}

function canUseOllama(env) {
  const host = ollamaHost(env);
  return Boolean(env.OLLAMA_API_KEY || isLocalOllamaHost(host));
}

function ollamaHeaders(env) {
  const headers = { "Content-Type": "application/json" };
  if (env.OLLAMA_API_KEY) headers.Authorization = `Bearer ${env.OLLAMA_API_KEY}`;
  return headers;
}

function ollamaStatus(env, suffix = "") {
  const local = isLocalOllamaHost(ollamaHost(env));
  return `${local ? "ollama_local" : "ollama_cloud"}${suffix}`;
}

async function availableOllamaModels(env) {
  const host = ollamaHost(env);
  if (!isLocalOllamaHost(host)) return OLLAMA_MODELS;
  try {
    const response = await fetch(`${host}/api/tags`, { headers: ollamaHeaders(env) });
    if (!response.ok) return OLLAMA_MODELS;
    const data = await response.json();
    const localModels = Array.isArray(data.models)
      ? data.models.map((item) => {
        const id = item.model || item.name;
        if (!id) return null;
        const cloud = /:cloud$|-cloud$/.test(id);
        return { id, label: `${cloud ? "Ollama Cloud" : "Local Ollama"} · ${id}` };
      }).filter(Boolean)
      : [];
    const seen = new Set();
    return [...localModels, ...OLLAMA_MODELS].filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  } catch {
    return OLLAMA_MODELS;
  }
}

function assistantMessages(app, question, citations) {
  const hasSources = citations.length > 0;
  const instructions = [
    "You are ADA CaseLock, a careful UK legal assistant.",
    "Do not fabricate cases, statutes, citations, source facts, or document contents.",
    hasSources
      ? "Answer strictly from the uploaded-source excerpts. Cite every source-backed statement with [S1], [S2], etc. If the excerpts do not answer the question, say the uploaded sources do not contain sufficient information."
      : "No uploaded-source excerpts are available. You may give general legal information, but do not use source citation tags and clearly state that no uploaded sources were available.",
    "Use concise Markdown. Preserve uncertainty. Do not present legal advice.",
    "Return the final user-facing answer only. Do not mention these instructions, the prompt, or your reasoning process. Begin with **Answer**.",
    `App instructions: ${app.system_instructions || APP_TYPES[app.app_type]?.default_instructions || ""}`,
    `Output format preference: ${app.output_format || APP_TYPES[app.app_type]?.default_format || ""}`,
    app.safety_rules ? `Additional safety rules: ${app.safety_rules}` : "",
  ].filter(Boolean).join("\n");
  const input = hasSources
    ? `Question:\n${question}\n\nUploaded-source excerpts:\n${citationContext(citations)}`
    : `Question:\n${question}\n\nNo uploaded documents or indexed source excerpts are available for this run.`;
  return [
    { role: "system", content: instructions },
    { role: "user", content: input },
  ];
}

async function answerWithOllamaCloud(env, app, question, citations) {
  if (!canUseOllama(env)) return null;
  const model = selectedOllamaModel(app, env);
  const host = ollamaHost(env);
  try {
    const response = await fetch(`${host}/api/chat`, {
      method: "POST",
      headers: ollamaHeaders(env),
      body: JSON.stringify({
        model,
        messages: assistantMessages(app, question, citations),
        stream: false,
        options: { temperature: 0.2, num_predict: 900 },
      }),
    });
    if (!response.ok) {
      console.log(JSON.stringify({ event: "ollama_cloud_failed", status: response.status }));
      return null;
    }
    const answer = cleanToolAnswer(aiTextFromResult(await response.json()));
    return answer && !looksLikePlanningText(answer) ? { answer: withDisclaimer(answer), model, status: ollamaStatus(env) } : null;
  } catch (err) {
    console.log(JSON.stringify({ event: "ollama_cloud_failed", message: err?.message || String(err) }));
    return null;
  }
}

function filterThinkingDelta(state, value) {
  let text = String(value || "");
  let output = "";
  while (text) {
    if (state.suppressed) {
      const end = text.toLowerCase().indexOf("</think>");
      if (end < 0) return "";
      text = text.slice(end + 8);
      state.suppressed = false;
    }
    const start = text.toLowerCase().indexOf("<think>");
    if (start < 0) {
      output += text;
      break;
    }
    output += text.slice(0, start);
    text = text.slice(start + 7);
    state.suppressed = true;
  }
  return output;
}

function streamDeltaFromPayload(payload) {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object") return "";
  const candidates = [
    payload.response,
    payload.delta,
    payload.content,
    payload.text,
    payload.answer,
    payload.output_text,
    payload.textDelta,
    payload.delta_text,
    payload.message?.content,
    payload.result?.response,
    payload.choices?.[0]?.delta?.content,
    payload.choices?.[0]?.text,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value) return value;
  }
  if (Array.isArray(payload.output)) {
    return payload.output.flatMap((item) => {
      if (typeof item?.content === "string") return [item.content];
      if (Array.isArray(item?.content)) return item.content.map((part) => part?.text || part?.content || "").filter(Boolean);
      return [];
    }).join("");
  }
  return "";
}

async function readAiTextStream(stream, onDelta) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  const handlePayload = (payloadText) => {
    const trimmed = String(payloadText || "").trim();
    if (!trimmed || trimmed === "[DONE]") return;
    if (/^\$?error\b\s*:/i.test(trimmed)) throw new Error(trimmed.replace(/^\$?error\b\s*:\s*/i, "") || "AI stream failed");
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      if (!/^data:|^event:/i.test(trimmed)) onDelta(trimmed);
      return;
    }
    if (parsed.error || parsed.errors) throw new Error(parsed.error?.message || parsed.error || "AI stream failed");
    if (parsed.done) return;
    const delta = streamDeltaFromPayload(parsed);
    if (delta) onDelta(delta);
  };
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() || "";
    let eventName = "message";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("event:")) {
        eventName = trimmed.slice(6).trim() || "message";
      } else if (trimmed.startsWith("data:")) {
        const payload = trimmed.slice(5);
        if (eventName === "error") throw new Error(payload.trim() || "AI stream failed");
        handlePayload(payload);
      } else {
        handlePayload(trimmed);
      }
    }
  }
  pending += decoder.decode();
  if (pending.trim()) {
    let eventName = "message";
    for (const line of pending.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("event:")) {
        eventName = trimmed.slice(6).trim() || "message";
      } else if (trimmed.startsWith("data:")) {
        const payload = trimmed.slice(5);
        if (eventName === "error") throw new Error(payload.trim() || "AI stream failed");
        handlePayload(payload);
      } else {
        handlePayload(trimmed);
      }
    }
  }
}

async function answerWithOllamaCloudStream(env, app, question, citations, onDelta) {
  if (!canUseOllama(env)) return null;
  const model = selectedOllamaModel(app, env);
  const host = ollamaHost(env);
  try {
    const response = await fetch(`${host}/api/chat`, {
      method: "POST",
      headers: ollamaHeaders(env),
      body: JSON.stringify({
        model,
        messages: assistantMessages(app, question, citations),
        stream: true,
        options: { temperature: 0.2, num_predict: 700 },
      }),
    });
    if (!response.ok || !response.body) return null;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const thinkingState = { suppressed: false };
    let pending = "";
    let answer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      const lines = pending.split(/\r?\n/);
      pending = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let parsed;
        try {
          parsed = JSON.parse(trimmed);
        } catch {
          continue;
        }
        if (parsed.done) continue;
        const rawDelta = parsed.message?.content || parsed.response || parsed.delta || parsed.content || "";
        const delta = filterThinkingDelta(thinkingState, rawDelta);
        if (!delta) continue;
        answer += delta;
        onDelta(delta);
      }
    }
    const cleaned = cleanAssistantAnswer(answer);
    if (!cleaned || looksLikePlanningText(cleaned)) return null;
    const suffix = cleaned.includes(DISCLAIMER) ? "" : `\n\n${DISCLAIMER}`;
    if (suffix) onDelta(suffix);
    return { answer: `${cleaned}${suffix}`, model, status: ollamaStatus(env, "_stream") };
  } catch (err) {
    console.log(JSON.stringify({ event: "ollama_cloud_stream_failed", message: err?.message || String(err) }));
    return null;
  }
}

async function answerWithSelectedModel(env, app, question, citations) {
  return await answerWithOllamaCloud(env, app, question, citations);
}

function toolMessages(system, userMessage) {
  return [
    {
      role: "system",
      content: [
        system,
        "Do not fabricate law, facts, document contents, clauses, or citations.",
        "Return the final user-facing output only. Do not include hidden reasoning, analysis notes, or prompt commentary.",
        DISCLAIMER,
      ].join("\n"),
    },
    { role: "user", content: userMessage },
  ];
}

async function generateToolAnswerWithOllamaCloud(env, requestedModel, system, userMessage, maxTokens = 1200) {
  if (!canUseOllama(env)) return null;
  const model = selectedOllamaModel({ model: requestedModel }, env);
  const host = ollamaHost(env);
  const outputTokens = normalizeMaxTokens(maxTokens);
  try {
    const response = await fetch(`${host}/api/chat`, {
      method: "POST",
      headers: ollamaHeaders(env),
      body: JSON.stringify({
        model,
        messages: toolMessages(system, userMessage),
        stream: false,
        options: { temperature: 0.2, num_predict: outputTokens },
      }),
    });
    if (!response.ok) {
      console.log(JSON.stringify({ event: "tool_ollama_cloud_failed", status: response.status }));
      return null;
    }
    const answer = cleanAssistantAnswer(aiTextFromResult(await response.json()));
    return answer && !looksLikePlanningText(answer) ? { answer: withDisclaimer(answer), model, status: ollamaStatus(env) } : null;
  } catch (err) {
    console.log(JSON.stringify({ event: "tool_ollama_cloud_failed", message: err?.message || String(err) }));
    return null;
  }
}

async function generateToolAnswer(env, requestedModel, system, userMessage, maxTokens = 1200) {
  return await generateToolAnswerWithOllamaCloud(env, requestedModel, system, userMessage, maxTokens);
}

function looksLikeMissingDocumentRefusal(answer) {
  return /(?:without|don't have|do not have|need|provide).{0,80}(?:full|complete|actual|original).{0,80}(?:document|text|agreement)/i.test(String(answer || ""));
}

function fallbackCompareTable(textA, textB, focus) {
  const aSentences = normalizeExtractedText(textA).split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 7);
  const bSentences = normalizeExtractedText(textB).split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 7);
  const maxRows = Math.max(aSentences.length, bSentences.length, 1);
  const rows = [];
  for (let index = 0; index < maxRows; index += 1) {
    const a = aSentences[index] || "";
    const b = bSentences[index] || "";
    const same = a && b && normalizeExtractedText(a).toLowerCase() === normalizeExtractedText(b).toLowerCase();
    const topic = `Extract ${index + 1}`;
    const difference = same
      ? "No material wording difference identified in this aligned extract."
      : "Wording differs or appears only in one document. Review against the full documents before relying on this alignment.";
    const risk = same ? "Low" : "Review";
    rows.push(`| ${topic} | ${(a || "Not present in extracted preview").replace(/\|/g, "/")} | ${(b || "Not present in extracted preview").replace(/\|/g, "/")} | ${difference} | ${risk} |`);
  }
  return withDisclaimer([
    `Comparison focus: ${focus || "General comparison"}`,
    "",
    "| Topic | Document A | Document B | Material difference | Risk |",
    "|---|---|---|---|---|",
    ...rows,
    "",
    "**Most important practical differences**",
    "",
    "- This fallback aligns extracted text sequentially rather than applying legal semantic analysis.",
    "- Review both source panes side by side in Studio and verify every difference against the original documents.",
    "- Re-run with a configured LLM provider for a deeper clause-by-clause legal comparison.",
  ].join("\n"));
}

function chronologyDateKey(value) {
  const text = String(value || "").trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const uk = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/.exec(text);
  if (uk) {
    const year = uk[3].length === 2 ? `20${uk[3]}` : uk[3];
    return `${year}-${uk[2].padStart(2, "0")}-${uk[1].padStart(2, "0")}`;
  }
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) return `9999-${text.toLowerCase()}`;
  return new Date(parsed).toISOString().slice(0, 10);
}

function fallbackChronology(documents, focus) {
  const datePattern = /\b(?:\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}[.-]\d{1,2}[.-]\d{4}|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{2,4}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{2,4})\b/gi;
  const rows = [];
  for (const [docIndex, doc] of documents.entries()) {
    const sentences = normalizeExtractedText(doc.text)
      .split(/(?<=[.!?])\s+|\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    for (const sentence of sentences) {
      const matches = Array.from(sentence.matchAll(datePattern));
      for (const match of matches) {
        rows.push({
          key: chronologyDateKey(match[0]),
          date: match[0],
          event: sentence.slice(0, 260),
          source: `[D${docIndex + 1}] ${doc.filename}`,
        });
        if (rows.length >= 80) break;
      }
      if (rows.length >= 80) break;
    }
    if (rows.length >= 80) break;
  }
  rows.sort((a, b) => a.key.localeCompare(b.key));
  const lines = [
    `Chronology focus: ${focus || "General chronology"}`,
    "",
    "| Date | Event | Source | Significance |",
    "|---|---|---|---|",
    ...rows.map((row) => `| ${row.date} | ${row.event.replace(/\|/g, "/")} | ${row.source.replace(/\|/g, "/")} | ${focus ? `Potentially relevant to ${focus}` : "Extracted dated event"} |`),
  ];
  if (!rows.length) {
    lines.push(`| Date unclear | No dated events were found by the fallback extractor. | Uploaded documents | ${focus || "Review source text manually"} |`);
  }
  lines.push("", "Note: this is a rule-based chronology because the selected Ollama Cloud model did not return a usable chronology.");
  return withDisclaimer(lines.join("\n"));
}

function stripReaderDisclaimer(text) {
  return String(text || "")
    .replace(DISCLAIMER, "")
    .replace(/^\*\*Answer\*\*\s*/i, "")
    .replace(/^answer:\s*/i, "")
    .trim();
}

function cleanReaderSummary(text) {
  let value = stripReaderDisclaimer(text);
  const firstBullet = value.search(/(?:^|\s)-\s+/);
  if (firstBullet > 0) value = value.slice(firstBullet).replace(/\s+-\s+/g, "\n- ");
  const lines = value.split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !/^(?:that's|that is|good\.?|ensure|so\b|we\b)/i.test(line));
  return Array.from(new Set(lines)).join("\n").trim();
}

function cleanReaderAnswer(text) {
  let value = stripReaderDisclaimer(text);
  const answerMarker = /\bSo answer:\s*/i.exec(value);
  if (answerMarker) value = value.slice(answerMarker.index + answerMarker[0].length);
  value = value.replace(/^["“][^"”]+["”]\s*/g, "").trim();
  const sentences = value.split(/(?<=[.!?])\s+/).filter(Boolean);
  return Array.from(new Set(sentences)).join(" ").trim();
}

function fallbackReaderSummary(text) {
  const cleaned = normalizeExtractedText(text);
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  const preview = sentences.slice(0, 3).join(" ");
  return preview || cleaned.slice(0, 500) || "No readable text was captured.";
}

async function generateReaderSummary(env, text) {
  const captured = normalizeExtractedText(text).slice(0, 10000);
  if (!captured) return "No readable text was captured.";
  const system = "You summarise captured writing for a reader tool. Be concise, neutral, and practical. Return only the summary.";
  const userMessage = `Captured text:\n${captured}\n\nReturn a concise summary in 3-5 bullets.`;
  const aiResult = await generateToolAnswer(env, DEFAULT_OLLAMA_MODEL, system, userMessage, 520);
  return cleanReaderSummary(aiResult?.answer) || fallbackReaderSummary(captured);
}

async function answerReaderQuestion(env, text, question) {
  const captured = normalizeExtractedText(text).slice(0, 12000);
  const asked = String(question || "").trim();
  if (!captured || !asked) return "";
  const system = "You answer questions using only the captured text supplied by the user. If the answer is not present, say that the captured text does not contain enough information.";
  const userMessage = `Captured text:\n${captured}\n\nQuestion:\n${asked}\n\nAnswer from the captured text only.`;
  const aiResult = await generateToolAnswer(env, DEFAULT_OLLAMA_MODEL, system, userMessage, 620);
  return cleanReaderAnswer(aiResult?.answer) || "The captured text does not contain enough information to answer that.";
}

function fallbackCameraAnalysis(text) {
  const captured = normalizeExtractedText(text);
  const preview = captured.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 4).join(" ") || captured.slice(0, 700);
  return withDisclaimer([
    "**Summary**",
    preview || "No readable document wording was captured.",
    "",
    "**Important Information**",
    "- Check the extracted wording against the photo before relying on it.",
    "- Ask follow-up questions in the chat panel for clause meaning, risks, or next steps.",
    "",
    "**Suggested Next Steps**",
    "- Correct any OCR mistakes in the extracted wording.",
    "- Save the capture to a folder if it belongs to a matter, research task, or meeting note set.",
    "",
    "**Possible Improvements**",
    "- Retake unclear photos with better lighting and the page filling the frame.",
    "",
    "**Limits**",
    "This is a best-effort OCR analysis and may miss handwriting, small print, or unclear text.",
  ].join("\n"));
}

async function generateCameraAnalysis(env, text, sourceType = "") {
  const captured = normalizeExtractedText(text).slice(0, 12000);
  if (!captured) return fallbackCameraAnalysis("");
  const source = String(sourceType || "document photo").trim().slice(0, 80);
  const system = [
    "You analyse photographed or screenshot document wording captured through OCR.",
    "Use only the captured text. Do not invent missing clauses, signatures, parties, dates, or legal citations.",
    "The source may be paper, an online document, a website/screen, handwritten notes, slide-deck notes, meeting notes, or a photographed legal/business document.",
    "Identify the likely type of information, extract the important details, and suggest practical next steps and improvements.",
    "Be practical and concise for a UK legal/document review workflow.",
  ].join("\n");
  const userMessage = [
    `Source type hint: ${source || "Unknown"}`,
    "",
    "Captured document wording:",
    captured,
    "",
    "Return concise Markdown with these headings:",
    "Document / Source Type",
    "Summary",
    "Important Information",
    "Risks / Questions",
    "Suggested Next Steps",
    "Possible Improvements",
    "Useful Follow-up Questions",
    "Limits",
  ].join("\n");
  const aiResult = await generateToolAnswer(env, DEFAULT_OLLAMA_MODEL, system, userMessage, 700);
  if (!aiResult?.answer || looksLikeMissingDocumentRefusal(aiResult.answer)) return fallbackCameraAnalysis(captured);
  return withDisclaimer(cleanToolAnswer(aiResult.answer));
}

function normalizeCameraNote(user, body) {
  const now = nowIso();
  const noteId = String(body.note_id || "").trim() || id("camnote");
  return {
    note_id: noteId,
    owner_id: user.user_id,
    title: String(body.title || body.filename || "Camera note").trim().slice(0, 120) || "Camera note",
    folder: String(body.folder || "General").trim().slice(0, 80) || "General",
    source_type: String(body.source_type || "Document photo").trim().slice(0, 80),
    filename: String(body.filename || "").trim().slice(0, 180),
    captured_text: normalizeExtractedText(body.captured_text || body.text || "").slice(0, 60000),
    analysis: String(body.analysis || "").trim().slice(0, 60000),
    messages: Array.isArray(body.messages) ? body.messages.slice(0, 30).map((message) => ({
      question: String(message.question || "").trim().slice(0, 1000),
      answer: String(message.answer || "").trim().slice(0, 6000),
    })).filter((message) => message.question || message.answer) : [],
    created_at: body.created_at || now,
    updated_at: now,
  };
}

function clampJsonValue(value, maxChars) {
  if (value === undefined || value === null) return null;
  const raw = JSON.stringify(value);
  if (raw.length <= maxChars) return value;
  return {
    truncated: true,
    type: value.type || "json",
    order: value.order,
    token_count: value.token_count,
    vocabulary_size: value.vocabulary_size,
    transition_count: value.transition_count,
    preview: raw.slice(0, Math.min(4000, maxChars)),
  };
}

function normalizeMiniModelRecord(user, body) {
  const now = nowIso();
  const modelId = String(body.model_id || "").trim() || id("model");
  const sourceText = normalizeExtractedText(body.source_text || "").slice(0, MAX_MINI_MODEL_SOURCE_CHARS);
  const jsonl = String(body.jsonl || "").trim().slice(0, MAX_MINI_MODEL_JSONL_CHARS);
  const stats = body.stats && typeof body.stats === "object" ? {
    chars: Number(body.stats.chars || sourceText.length) || sourceText.length,
    tokens: Number(body.stats.tokens || 0) || 0,
    vocabulary: Number(body.stats.vocabulary || 0) || 0,
    examples: Number(body.stats.examples || 0) || 0,
  } : {
    chars: sourceText.length,
    tokens: sourceText.split(/\s+/).filter(Boolean).length,
    vocabulary: 0,
    examples: jsonl ? jsonl.split(/\n+/).filter(Boolean).length : 0,
  };
  return {
    model_id: modelId,
    owner_id: user.user_id,
    name: String(body.name || "Mini language model").trim().slice(0, 120) || "Mini language model",
    description: String(body.description || "").trim().slice(0, 500),
    training_mode: String(body.training_mode || "browser-ngram-plus-jsonl-export").trim().slice(0, 80),
    source_text: sourceText,
    jsonl,
    stats,
    model_data: clampJsonValue(body.model_data || null, MAX_MINI_MODEL_DATA_CHARS),
    chat_messages: Array.isArray(body.chat_messages) ? body.chat_messages.slice(0, 40).map((message) => ({
      role: String(message.role || "assistant").trim() === "user" ? "user" : "assistant",
      content: String(message.content || "").trim().slice(0, 4000),
    })).filter((message) => message.content) : [],
    created_at: body.created_at || now,
    updated_at: now,
  };
}

async function answerCameraQuestion(env, text, question) {
  const captured = normalizeExtractedText(text).slice(0, 12000);
  const asked = String(question || "").trim();
  if (!captured || !asked) return "";
  const system = [
    "You answer questions about photographed document wording captured through OCR.",
    "Use only the captured text. If the captured text does not contain the answer, say that clearly.",
    "Do not fabricate missing clauses, facts, citations, dates, or parties.",
  ].join("\n");
  const userMessage = [
    "Captured document wording:",
    captured,
    "",
    "Question:",
    asked,
    "",
    "Answer from the captured wording only.",
  ].join("\n");
  const aiResult = await generateToolAnswer(env, DEFAULT_OLLAMA_MODEL, system, userMessage, 680);
  if (!aiResult?.answer || looksLikeMissingDocumentRefusal(aiResult.answer)) {
    return withDisclaimer("The captured text does not contain enough information to answer that.");
  }
  return withDisclaimer(cleanReaderAnswer(aiResult.answer));
}

function isImageFile(file) {
  const name = (file?.name || "").toLowerCase();
  const type = String(file?.type || "").toLowerCase();
  return type.startsWith("image/") || /\.(png|jpe?g|webp|bmp|tiff?)$/.test(name);
}

function cleanOcrText(text) {
  let value = normalizeExtractedText(text).replace(/^#\s*Image Description\s*/i, "").replace(/\*\*/g, "").trim();
  value = value
    .replace(/^The image (?:shows|displays|contains)[\s\S]*?(?=(?:#+\s*)?Text Details\b|Heading:|Body Text:)/i, "")
    .replace(/#+\s*Text Details\s*/gi, "")
    .replace(/\bHeading:\s*/gi, "")
    .replace(/\bBody Text:\s*/gi, "")
    .replace(/\s+\*\s*/g, "\n")
    .trim();
  const structured = /(?:content is structured|text is organized|text is arranged)\s+as follows:\s*([\s\S]+)|text outlines key terms of a legal document:\s*([\s\S]+)/i.exec(value);
  if (structured) {
    value = (structured[1] || structured[2])
      .replace(/\s+\*\s*/g, "\n")
      .replace(/^[-\s]*(Header|List of terms|Text):\s*/gim, "")
      .replace(/\bThe visual style is[\s\S]*$/i, "")
      .trim();
  }
  return normalizeExtractedText(value);
}

async function extractTextFromImageWithAi(env, file) {
  if (!env.AI) return null;
  if (!isImageFile(file)) {
    throw new Response(JSON.stringify({ detail: "Camera OCR requires an image file." }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
  if (file.size > MAX_CAMERA_IMAGE_BYTES) {
    throw new Response(JSON.stringify({ detail: "Image too large for camera OCR. Retake or choose a smaller image under 3MB." }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
  const data = new Uint8Array(await file.arrayBuffer());
  if (typeof env.AI.toMarkdown === "function") {
    try {
      const converted = await Promise.race([
        env.AI.toMarkdown({
          name: file.name || "camera.jpg",
          blob: new Blob([data], { type: file.type || "image/jpeg" }),
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Camera markdown conversion timed out")), 22000)),
      ]);
      const item = Array.isArray(converted) ? converted[0] : converted;
      const markdown = cleanOcrText(item?.data || "");
      if (item?.format === "markdown" && markdown.length >= 5) return markdown;
      if (item?.error) console.log(JSON.stringify({ event: "camera_markdown_failed", message: item.error }));
    } catch (err) {
      console.log(JSON.stringify({ event: "camera_markdown_failed", message: err?.message || String(err) }));
    }
  }
  try {
    const result = await Promise.race([
      env.AI.run("@cf/llava-hf/llava-1.5-7b-hf", {
        image: Array.from(data),
        prompt: "Extract all readable text from this legal or business document image. Return only the OCR text in reading order. If no text is readable, return an empty string.",
        max_tokens: 1400,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Camera OCR timed out")), 22000)),
    ]);
    return cleanOcrText(aiTextFromResult(result) || result?.description || result?.text || "");
  } catch (err) {
    console.log(JSON.stringify({ event: "camera_ocr_failed", message: err?.message || String(err) }));
    return null;
  }
}

async function refreshFastPendingDocuments(env, appId, docs) {
  const retryableStatuses = new Set(["PENDING_EXTRACTION", "PROCESSING", "NOT_EXTRACTED", "STORED_NOT_EXTRACTED", "FAILED_CLOSED"]);
  for (let index = 0; index < docs.length; index += 1) {
    const doc = docs[index];
    const canFastRefresh = Number(doc.size || 0) <= MAX_FAST_PARSE_BYTES;
    const needsRefresh = retryableStatuses.has(doc.text_extraction_status) && !Number(doc.chunk_count || 0);
    if (canFastRefresh && needsRefresh && ["pdf", "docx"].includes(doc.ext) && doc.storage_provider === "R2") {
      const updated = await extractQueuedDocumentFromR2(env, doc);
      if (updated) {
        await kvPut(env, `doc:${appId}:${doc.doc_id}`, updated);
        docs[index] = updated;
      }
    }
  }
  return docs;
}

function sse(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function fallbackStreamChunks(answer) {
  const text = String(answer || "");
  const chunks = text.match(/[\s\S]{1,220}(?:\s+|$)/g) || [text];
  return chunks.filter(Boolean);
}

async function streamChunkedAnswer(answer, onDelta) {
  for (const chunk of fallbackStreamChunks(answer)) {
    onDelta(chunk);
    await new Promise((resolve) => setTimeout(resolve, 8));
  }
}

function streamRun(env, user, appId, app, question) {
  const encoder = new TextEncoder();
  const startedAt = nowIso();
  return new Response(new ReadableStream({
    async start(controller) {
      const send = (event, data) => controller.enqueue(encoder.encode(sse(event, data)));
      try {
        send("status", { message: "Reading uploaded documents", step: "sources" });
        let docs = await documentsForApp(env, appId, app);
        send("status", { message: docs.length ? `Checking ${docs.length} document${docs.length === 1 ? "" : "s"}` : "No uploaded documents found", step: "sources" });
        docs = await refreshFastPendingDocuments(env, appId, docs);
        const pendingDocs = docs.filter((doc) => ["PENDING_EXTRACTION", "PROCESSING"].includes(doc.text_extraction_status));
        send("status", { message: "Selecting relevant citations", step: "citations" });
        const citations = selectCitations(question, docs, 8);
        for (const [index, citation] of citations.entries()) {
          send("citation", { citation, index, total: citations.length });
          await Promise.resolve();
        }
        send("citations", { citations });
        send("status", {
          message: `Trying Ollama (${selectedOllamaModel(app, env)})`,
          step: "answer",
        });

        let streamedAnswer = "";
        let aiResult = await answerWithOllamaCloudStream(env, app, question, citations, (delta) => {
          streamedAnswer += delta;
          send("delta", { delta });
        });

        if (!aiResult) {
          if (streamedAnswer) {
            streamedAnswer = "";
            send("replace", { answer: "" });
          }
          send("status", { message: `Retrying Ollama (${selectedOllamaModel(app, env)})`, step: "answer" });
          aiResult = await answerWithOllamaCloud(env, app, question, citations);
          if (aiResult?.answer) {
            await streamChunkedAnswer(aiResult.answer, (delta) => {
              streamedAnswer += delta;
              send("delta", { delta });
            });
          }
        }

        if (!aiResult) {
          if (streamedAnswer) {
            streamedAnswer = "";
            send("replace", { answer: "" });
          }
          send("status", { message: "Preparing source-only fallback answer", step: "fallback" });
          const finalAnswer = fallbackAnswer(question, docs, pendingDocs, citations);
          await streamChunkedAnswer(finalAnswer, (delta) => {
            streamedAnswer += delta;
            send("delta", { delta });
          });
        }

        const run = {
          run_id: id("run"),
          app_id: appId,
          owner_id: user.user_id,
          question,
          answer: aiResult?.answer || streamedAnswer,
          citations,
          requested_model: app.model || defaultOllamaModel(env),
          model: aiResult?.model || app.model || defaultOllamaModel(env),
          model_status: aiResult?.status || "source_only_no_llm",
          started_at: startedAt,
          finished_at: nowIso(),
        };
        send("done", { run });
      } catch (err) {
        send("error", { detail: err?.message || "Run failed" });
      } finally {
        controller.close();
      }
    },
  }), {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}

function fallbackAnswer(question, docs, pendingDocs, citations) {
  if (citations.length) {
    const hasStrongMatch = citations.some((citation) => citation.score >= 0.5);
    const heading = hasStrongMatch
      ? "I found these source-grounded excerpts for the question:"
      : "I could not find a strong source match, but these are the closest indexed excerpts:";
    return withDisclaimer(`${heading}\n\n${citations.map((c) => `[${c.tag}] ${c.preview}`).join("\n\n")}\n\nUse the cited excerpts above to check any conclusion against the source material.`);
  }
  if (!docs.length) {
    return withDisclaimer(`No uploaded sources are available for this question yet, so I cannot provide uploaded-source citations.\n\nQuestion received: ${question}`);
  }
  if (pendingDocs.length) {
    return withDisclaimer("The uploaded sources are still being processed by the Cloudflare R2 parser. Try again after the document status changes from PENDING_EXTRACTION or PROCESSING.");
  }
  const statuses = docs.map((doc) => `${doc.filename}: ${doc.text_extraction_status || "NOT_INDEXED"}`).join("; ");
  return withDisclaimer(`The uploaded files are stored, but no searchable text has been extracted yet (${statuses}). I cannot answer from sources that have no indexed text.`);
}

function safeObjectPart(value) {
  return String(value || "file").replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 140) || "file";
}

function documentObjectKey(userId, appId, docId, filename) {
  return `${safeObjectPart(userId)}/${safeObjectPart(appId)}/${safeObjectPart(docId)}/${safeObjectPart(filename)}`;
}

function normalizeExtractedText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function hasUsefulExtractedText(text) {
  return normalizeExtractedText(text).length >= MIN_EXTRACTED_TEXT_CHARS;
}

function printableText(text) {
  const value = normalizeExtractedText(text);
  if (value.length < 2) return "";
  const printable = [...value].filter((ch) => {
    const code = ch.charCodeAt(0);
    return code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126);
  }).length;
  return printable / value.length > 0.75 ? value : "";
}

function pdfTokenText(text) {
  const value = String(text || "").replace(/\u0000/g, "");
  if (!value.trim()) return value.includes(" ") ? " " : "";
  const normalized = normalizeExtractedText(value);
  const printable = [...normalized].filter((ch) => {
    const code = ch.charCodeAt(0);
    return (code >= 32 && code !== 0xfffd) || code === 9 || code === 10 || code === 13;
  }).length;
  return printable / normalized.length > 0.75 ? normalized : "";
}

function decodePdfString(value) {
  return value
    .replace(/\\([nrtbf()\\])/g, (_, ch) => ({ n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" })[ch] || ch)
    .replace(/\\([0-7]{1,3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)));
}

function decodePdfHex(value) {
  const cleaned = value.replace(/\s+/g, "");
  const bytes = [];
  for (let i = 0; i + 1 < cleaned.length; i += 2) {
    const byte = parseInt(cleaned.slice(i, i + 2), 16);
    if (!Number.isNaN(byte)) bytes.push(byte);
  }
  return decodePdfBytes(new Uint8Array(bytes));
}

function decodePdfCMapDest(value) {
  const cleaned = String(value || "").replace(/\s+/g, "");
  const bytes = [];
  for (let i = 0; i + 1 < cleaned.length; i += 2) {
    const byte = parseInt(cleaned.slice(i, i + 2), 16);
    if (!Number.isNaN(byte)) bytes.push(byte);
  }
  const data = new Uint8Array(bytes);
  if (data.length >= 2 && data[0] === 0xfe && data[1] === 0xff) return decodeUtf16Be(data, 2);
  if (data.length >= 2 && data.length % 2 === 0) return decodeUtf16Be(data);
  return decodePdfBytes(data);
}

function incrementHex(value, offset) {
  const width = value.length;
  const next = parseInt(value, 16) + offset;
  if (!Number.isFinite(next)) return value;
  return next.toString(16).toUpperCase().padStart(width, "0").slice(-width);
}

function parsePdfUnicodeMap(sources) {
  const map = new Map();
  for (const raw of sources) {
    for (const block of raw.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
      for (const line of block[1].split(/\r?\n/)) {
        const match = /^\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*$/.exec(line);
        if (match) map.set(match[1].toUpperCase(), decodePdfCMapDest(match[2]));
      }
    }
    for (const block of raw.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
      for (const line of block[1].split(/\r?\n/)) {
        const match = /^\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(?:<([0-9A-Fa-f]+)>|\[((?:\s*<[^>]+>)+)\s*\])\s*$/.exec(line);
        if (!match) continue;
        const start = parseInt(match[1], 16);
        const end = parseInt(match[2], 16);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end - start > 512) continue;
        if (match[4]) {
          const values = [...match[4].matchAll(/<([0-9A-Fa-f]+)>/g)].map((item) => item[1]);
          values.forEach((dest, index) => map.set(incrementHex(match[1], index), decodePdfCMapDest(dest)));
        } else {
          for (let code = start; code <= end; code += 1) {
            const offset = code - start;
            map.set(code.toString(16).toUpperCase().padStart(match[1].length, "0"), decodePdfCMapDest(incrementHex(match[3], offset)));
          }
        }
      }
    }
  }
  return map;
}

function mergePdfUnicodeMaps(maps) {
  const merged = new Map();
  for (const map of maps) {
    for (const [key, value] of map.entries()) merged.set(key, value);
  }
  return merged;
}

function parsePdfFontUnicodeRefs(raw) {
  const refs = new Map();
  for (const match of raw.matchAll(/(?:^|[\r\n])(\d+)\s+0\s+obj([\s\S]*?)endobj/g)) {
    const objectId = match[1];
    const block = match[2].trim();
    if (/\bstream\b/.test(block)) continue;
    const dict = /^<<([\s\S]*?)>>$/.exec(block);
    if (!dict) continue;
    const body = dict[1];
    if (!/\/Type\s*\/Font\b|\/Subtype\s*\/Type0\b/.test(body)) continue;
    const toUnicode = /\/ToUnicode\s+(\d+)\s+0\s+R/.exec(body);
    if (toUnicode) refs.set(objectId, toUnicode[1]);
  }
  return refs;
}

function parsePdfFontAliases(raw, fontUnicodeRefs, unicodeMapsByObjectId) {
  const aliases = new Map();
  for (const fontBlock of raw.matchAll(/\/Font\s*<<([\s\S]*?)>>/g)) {
    for (const match of fontBlock[1].matchAll(/\/([A-Za-z][A-Za-z0-9._-]*)\s+(\d+)\s+0\s+R/g)) {
      const cmapId = fontUnicodeRefs.get(match[2]);
      const cmap = cmapId ? unicodeMapsByObjectId.get(cmapId) : null;
      if (cmap?.size) aliases.set(match[1], cmap);
    }
  }
  return aliases;
}

function decodePdfHexWithMap(value, unicodeMap) {
  if (!unicodeMap?.size) return "";
  const cleaned = String(value || "").replace(/\s+/g, "").toUpperCase();
  const lengths = [...new Set([...unicodeMap.keys()].map((key) => key.length))].sort((a, b) => b - a);
  let text = "";
  let matched = 0;
  for (let i = 0; i < cleaned.length;) {
    let found = false;
    for (const length of lengths) {
      const key = cleaned.slice(i, i + length);
      if (unicodeMap.has(key)) {
        text += unicodeMap.get(key);
        i += length;
        matched += 1;
        found = true;
        break;
      }
    }
    if (!found) {
      text += decodePdfHex(cleaned.slice(i, i + 2));
      i += 2;
    }
  }
  return matched ? text : "";
}

function decodeUtf16Be(bytes, offset = 0) {
  let text = "";
  for (let i = offset; i + 1 < bytes.length; i += 2) {
    text += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
  }
  return text;
}

function decodePdfBytes(bytes) {
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return decodeUtf16Be(bytes, 2);
  let zeroEven = 0;
  let pairs = 0;
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    pairs += 1;
    if (bytes[i] === 0 && bytes[i + 1] >= 32) zeroEven += 1;
  }
  if (pairs > 2 && zeroEven / pairs > 0.55) return decodeUtf16Be(bytes);
  return new TextDecoder("latin1").decode(bytes);
}

function collectPdfText(raw, unicodeMap) {
  const pieces = [];
  let activeMap = unicodeMap;
  const decodeHex = (value) => decodePdfHexWithMap(value, activeMap) || decodePdfHex(value);
  const decodeArray = (value) => {
    const out = [];
    for (const item of String(value || "").matchAll(/\((?:\\.|[^\\)])*\)|<([0-9A-Fa-f\s]+)>|-?\d+(?:\.\d+)?/g)) {
      const token = item[0];
      if (token.startsWith("(")) out.push(decodePdfString(token.slice(1, -1)));
      else if (token.startsWith("<")) out.push(decodeHex(item[1]));
    }
    return out.join("");
  };
  const pattern = /\/([A-Za-z][A-Za-z0-9._-]*)\s+[-+]?\d*\.?\d+\s+Tf|(\((?:\\.|[^\\)])*\)|<([0-9A-Fa-f\s]+)>|\[(.*?)\])\s*(Tj|TJ|['"])|\bET\b/gs;
  for (const match of raw.matchAll(pattern)) {
    if (match[1]) {
      activeMap = unicodeMap?.fontMaps?.get(match[1]) || unicodeMap;
      continue;
    }
    if (match[0] === "ET") {
      pieces.push(" ");
      continue;
    }
    const operand = match[2];
    if (!operand) continue;
    if (operand.startsWith("(")) pieces.push(pdfTokenText(decodePdfString(operand.slice(1, -1))));
    else if (operand.startsWith("<")) pieces.push(pdfTokenText(decodeHex(match[3])));
    else if (operand.startsWith("[")) pieces.push(pdfTokenText(decodeArray(match[4])));
  }
  return normalizeExtractedText(pieces.join(""));
}

async function inflatePdfStream(bytes) {
  for (const format of ["deflate", "deflate-raw"]) {
    try {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch {
      // Try the next supported PDF deflate variant.
    }
  }
  return null;
}

function asciiBytes(value) {
  return new TextEncoder().encode(value);
}

function indexOfBytes(data, pattern, start = 0) {
  outer:
  for (let i = start; i <= data.length - pattern.length; i += 1) {
    for (let j = 0; j < pattern.length; j += 1) {
      if (data[i + j] !== pattern[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function pdfStreamBody(data, streamAt, endstreamAt) {
  let start = streamAt + 6;
  if (data[start] === 13 && data[start + 1] === 10) start += 2;
  else if (data[start] === 10 || data[start] === 13) start += 1;
  let end = endstreamAt;
  if (end >= 2 && data[end - 2] === 13 && data[end - 1] === 10) end -= 2;
  else if (end >= 1 && (data[end - 1] === 10 || data[end - 1] === 13)) end -= 1;
  return data.slice(start, end);
}

function pdfStreamEntries(data) {
  const streamToken = asciiBytes("stream");
  const endstreamToken = asciiBytes("endstream");
  const streams = [];
  let offset = 0;
  while (offset < data.length) {
    const streamAt = indexOfBytes(data, streamToken, offset);
    if (streamAt < 0) break;
    const endstreamAt = indexOfBytes(data, endstreamToken, streamAt + streamToken.length);
    if (endstreamAt < 0) break;
    const headerStart = Math.max(0, streamAt - 2000);
    const header = new TextDecoder("latin1").decode(data.slice(headerStart, streamAt));
    const objectMatches = [...header.matchAll(/(?:^|[\r\n])(\d+)\s+0\s+obj/g)];
    const objectId = objectMatches.length ? objectMatches[objectMatches.length - 1][1] : "";
    streams.push({
      objectId,
      header,
      flate: /\/FlateDecode\b/.test(header),
      body: pdfStreamBody(data, streamAt, endstreamAt),
    });
    offset = endstreamAt + endstreamToken.length;
  }
  return streams;
}

function flatePdfStreams(data) {
  return pdfStreamEntries(data).filter((entry) => entry.flate).map((entry) => entry.body);
}

function isLikelyPdfContentStream(source) {
  const text = String(source?.text || "");
  if (!/\bBT\b/.test(text) || !/(?:Tj|TJ|['"])\b/.test(text)) return false;
  const header = String(source?.header || "");
  if (/\/Subtype\s*\/Image\b|\/FontFile\d?\b|\/ToUnicode\b/.test(header)) return false;
  if (/begincmap|beginbf(?:char|range)/.test(text.slice(0, 1200))) return false;
  return true;
}

async function extractPdfText(data) {
  const raw = new TextDecoder("latin1").decode(data);
  const sources = [{ objectId: "", header: "", text: raw }];
  for (const entry of pdfStreamEntries(data)) {
    if (entry.flate) {
      const inflated = await inflatePdfStream(entry.body);
      if (inflated) sources.push({ objectId: entry.objectId, header: entry.header, text: new TextDecoder("latin1").decode(inflated) });
    } else if (!/\/Subtype\s*\/Image\b|\/FontFile\d?\b|\/DCTDecode\b/.test(entry.header)) {
      sources.push({ objectId: entry.objectId, header: entry.header, text: new TextDecoder("latin1").decode(entry.body) });
    }
  }
  const unicodeMapsByObjectId = new Map();
  for (const source of sources) {
    if (!source.objectId || !/beginbf(?:char|range)/.test(source.text)) continue;
    const map = parsePdfUnicodeMap([source.text]);
    if (map.size) unicodeMapsByObjectId.set(source.objectId, map);
  }
  const fontUnicodeRefs = parsePdfFontUnicodeRefs(raw);
  const mergedMap = mergePdfUnicodeMaps(unicodeMapsByObjectId.values());
  mergedMap.fontMaps = parsePdfFontAliases(raw, fontUnicodeRefs, unicodeMapsByObjectId);
  const contentSources = sources.filter((source) => source.objectId && isLikelyPdfContentStream(source));
  const extracted = normalizeExtractedText(contentSources.map((source) => collectPdfText(source.text, mergedMap)).join(" "));
  return extracted || collectPdfText(raw, mergedMap);
}

function extractXmlTextFromDocx(data) {
  const raw = new TextDecoder("latin1").decode(data);
  const xmlMatch = raw.match(/<w:document[\s\S]*?<\/w:document>/);
  return xmlMatch ? textFromWordXml(xmlMatch[0]) : "";
}

function u16le(data, offset) {
  return data[offset] | (data[offset + 1] << 8);
}

function u32le(data, offset) {
  return (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)) >>> 0;
}

function findEndOfCentralDirectory(data) {
  const min = Math.max(0, data.length - 0xffff - 22);
  for (let i = data.length - 22; i >= min; i -= 1) {
    if (u32le(data, i) === 0x06054b50) return i;
  }
  return -1;
}

async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzipEntry(data, entry) {
  const local = entry.localHeaderOffset;
  if (u32le(data, local) !== 0x04034b50) return "";
  const nameLength = u16le(data, local + 26);
  const extraLength = u16le(data, local + 28);
  const start = local + 30 + nameLength + extraLength;
  const end = start + entry.compressedSize;
  if (start < 0 || end > data.length || end < start) return "";
  const compressed = data.slice(start, end);
  let bytes;
  if (entry.method === 0) bytes = compressed;
  else if (entry.method === 8) bytes = await inflateRaw(compressed);
  else return "";
  return new TextDecoder().decode(bytes);
}

function docxEntries(data) {
  const eocd = findEndOfCentralDirectory(data);
  if (eocd < 0) return [];
  const centralDirectorySize = u32le(data, eocd + 12);
  const centralDirectoryOffset = u32le(data, eocd + 16);
  const end = Math.min(data.length, centralDirectoryOffset + centralDirectorySize);
  return docxEntriesFromCentralDirectory(data.slice(centralDirectoryOffset, end));
}

function docxEntriesFromCentralDirectory(data) {
  const entries = [];
  let offset = 0;
  while (offset + 46 <= data.length && u32le(data, offset) === 0x02014b50) {
    const method = u16le(data, offset + 10);
    const compressedSize = u32le(data, offset + 20);
    const nameLength = u16le(data, offset + 28);
    const extraLength = u16le(data, offset + 30);
    const commentLength = u16le(data, offset + 32);
    const localHeaderOffset = u32le(data, offset + 42);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;
    const name = new TextDecoder().decode(data.slice(nameStart, nameEnd));
    entries.push({ name, method, compressedSize, localHeaderOffset });
    offset = nameEnd + extraLength + commentLength;
  }
  return entries;
}

function decodeXmlEntities(text) {
  return String(text || "")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function textFromWordXml(xml) {
  return normalizeExtractedText(
    decodeXmlEntities(
      String(xml || "")
        .replace(/<w:tab\/>/g, " ")
        .replace(/<w:br\/>/g, "\n")
        .replace(/<\/w:(?:p|tr)>/g, "\n")
        .replace(/<\/w:tc>/g, " ")
        .replace(/<[^>]+>/g, " "),
    ),
  );
}

async function extractDocxText(data) {
  const entries = docxTextEntries(docxEntries(data));
  if (!entries.length) return extractXmlTextFromDocx(data);
  const parts = [];
  for (const entry of entries) {
    try {
      const xml = await unzipEntry(data, entry);
      const text = textFromWordXml(xml);
      if (text) parts.push(text);
    } catch {
      // Keep best-effort extraction for remaining DOCX parts.
    }
  }
  return normalizeExtractedText(parts.join("\n"));
}

async function readFileSlice(file, maxBytes) {
  const end = Math.min(file.size, maxBytes);
  return new Uint8Array(await file.slice(0, end).arrayBuffer());
}

async function readFileRange(file, start, end) {
  const safeStart = Math.max(0, Math.min(file.size, start));
  const safeEnd = Math.max(safeStart, Math.min(file.size, end));
  return new Uint8Array(await file.slice(safeStart, safeEnd).arrayBuffer());
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value >= 1024 * 1024) return `${Math.round(value / (1024 * 1024))}MB`;
  if (value >= 1024) return `${Math.round(value / 1024)}KB`;
  return `${value}B`;
}

function docxTextEntries(entries) {
  return entries
    .filter((entry) => /^word\/(?:document|footnotes|endnotes|comments|header\d+|footer\d+)\.xml$/i.test(entry.name))
    .sort((a, b) => {
      if (a.name === "word/document.xml") return -1;
      if (b.name === "word/document.xml") return 1;
      return a.name.localeCompare(b.name);
    });
}

async function unzipEntryFromFile(file, entry) {
  const header = await readFileRange(file, entry.localHeaderOffset, entry.localHeaderOffset + 30);
  if (header.length < 30 || u32le(header, 0) !== 0x04034b50) return "";
  const nameLength = u16le(header, 26);
  const extraLength = u16le(header, 28);
  const start = entry.localHeaderOffset + 30 + nameLength + extraLength;
  const end = start + entry.compressedSize;
  if (start < 0 || end > file.size || end < start) return "";
  const compressed = await readFileRange(file, start, end);
  let bytes;
  if (entry.method === 0) bytes = compressed;
  else if (entry.method === 8) bytes = await inflateRaw(compressed);
  else return "";
  return new TextDecoder().decode(bytes);
}

async function extractDocxTextForCompare(file) {
  const fallback = async (message) => {
    const data = await readFileSlice(file, Math.min(file.size, MAX_UPLOAD_BYTES));
    const text = await extractDocxText(data);
    return {
      text,
      readBytes: data.length,
      truncated: file.size > data.length,
      parser: "cloudflare-docx",
      message,
    };
  };

  const tailSize = Math.min(file.size, DOCX_CENTRAL_DIRECTORY_LOOKBACK_BYTES);
  const tailStart = file.size - tailSize;
  const tail = await readFileRange(file, tailStart, file.size);
  const eocd = findEndOfCentralDirectory(tail);
  if (eocd < 0) return fallback("DOCX central directory was not found; used best-effort buffered extraction.");

  const centralDirectorySize = u32le(tail, eocd + 12);
  const centralDirectoryOffset = u32le(tail, eocd + 16);
  if (!centralDirectorySize || centralDirectoryOffset + centralDirectorySize > file.size) {
    return fallback("DOCX central directory metadata was invalid; used best-effort buffered extraction.");
  }

  const centralDirectory = await readFileRange(file, centralDirectoryOffset, centralDirectoryOffset + centralDirectorySize);
  const entries = docxTextEntries(docxEntriesFromCentralDirectory(centralDirectory));
  if (!entries.length) return fallback("DOCX text entries were not found; used best-effort buffered extraction.");

  const parts = [];
  let readBytes = tail.length + centralDirectory.length;
  let xmlBytes = 0;
  let truncated = false;
  for (const entry of entries) {
    if (xmlBytes + entry.compressedSize > MAX_COMPARE_DOCX_XML_BYTES) {
      truncated = true;
      break;
    }
    try {
      const xml = await unzipEntryFromFile(file, entry);
      readBytes += 30 + entry.name.length + entry.compressedSize;
      xmlBytes += entry.compressedSize;
      const text = textFromWordXml(xml);
      if (text) parts.push(text);
    } catch {
      truncated = true;
    }
  }

  return {
    text: normalizeExtractedText(parts.join("\n")),
    readBytes,
    truncated,
    parser: "cloudflare-docx-stream",
    message: truncated
      ? "DOCX text extracted from the first supported Word XML parts within Worker limits."
      : "DOCX text extracted from Word XML parts without buffering the whole file.",
  };
}

async function plainTextFromFile(file) {
  const name = (file.name || "document").toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".md")) {
    const data = await readFileSlice(file, MAX_SEARCHABLE_CHARS);
    return {
      text: normalizeExtractedText(new TextDecoder().decode(data)),
      status: "EXTRACTED",
      message: file.size > MAX_SEARCHABLE_CHARS
        ? "Text extracted and indexed up to the Worker indexing limit."
        : "Text extracted from plain text upload.",
    };
  }
  if (name.endsWith(".pdf")) {
    const data = await readFileSlice(file, Math.min(file.size, MAX_FAST_PARSE_BYTES));
    const text = await extractPdfText(data);
    const extracted = hasUsefulExtractedText(text);
    return {
      text,
      status: extracted ? "EXTRACTED_BEST_EFFORT" : "NOT_EXTRACTED",
      message: extracted
        ? `Best-effort PDF text extraction completed and indexed ${Math.min(text.length, MAX_SEARCHABLE_CHARS)} characters for RAG.`
        : "PDF stored in R2, but no extractable text was found. If this is a scanned PDF, use Camera OCR or upload a searchable PDF/DOCX.",
    };
  }
  if (name.endsWith(".docx")) {
    const extracted = await extractDocxTextForCompare(file);
    const text = extracted.text;
    const hasText = hasUsefulExtractedText(text);
    return {
      text,
      status: hasText ? "EXTRACTED_BEST_EFFORT" : "NOT_EXTRACTED",
      message: hasText
        ? `Best-effort DOCX text extraction completed and indexed ${Math.min(text.length, MAX_SEARCHABLE_CHARS)} characters for RAG.`
        : "DOCX stored in R2, but text extraction is unavailable for this document in the Worker parser.",
    };
  }
  if (/\.(png|jpe?g|webp|bmp|tiff?)$/.test(name)) {
    return {
      text: "",
      status: "STORED_NOT_EXTRACTED",
      message: "Image stored in R2. OCR is not run inside the Worker, so this source has no searchable text yet.",
    };
  }
  throw new Response(JSON.stringify({ detail: "Unsupported file type. Upload PDF, DOCX, TXT, MD, PNG, JPG, JPEG, WEBP, BMP, or TIFF." }), {
    status: 400,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function canQueueR2Parsing(env, file) {
  const name = (file.name || "document").toLowerCase();
  return Boolean(env.DOCUMENTS_R2 && env.DOCUMENT_PARSE_QUEUE && /\.(pdf|docx)$/.test(name));
}

function pendingR2Extraction(file) {
  const name = (file.name || "document").toLowerCase();
  const kind = name.endsWith(".docx") ? "DOCX" : "PDF";
  return {
    text: "",
    status: "PENDING_EXTRACTION",
    message: `${kind} stored in R2. Background parser queued for cloud extraction.`,
  };
}

async function fastTextFromQueuedFile(file) {
  const name = (file.name || "document").toLowerCase();
  if (name.endsWith(".pdf")) {
    const data = await readFileSlice(file, Math.min(file.size, MAX_FAST_PARSE_BYTES));
    const text = await extractPdfText(data);
    const extracted = hasUsefulExtractedText(text);
    return {
      text,
      status: extracted ? "EXTRACTED_BEST_EFFORT" : "NOT_EXTRACTED",
      message: extracted
        ? `Fast Cloudflare parser extracted text during upload and indexed ${Math.min(text.length, MAX_SEARCHABLE_CHARS)} characters for RAG.`
        : "PDF stored in R2, but the Worker parser found no searchable text. If this is a scanned PDF, use Camera OCR or upload a searchable PDF/DOCX.",
    };
  }
  if (name.endsWith(".docx")) {
    const extracted = await extractDocxTextForCompare(file);
    const text = extracted.text;
    const hasText = hasUsefulExtractedText(text);
    return {
      text,
      status: hasText ? "EXTRACTED_BEST_EFFORT" : "NOT_EXTRACTED",
      message: hasText
        ? `Fast Cloudflare parser extracted DOCX text during upload and indexed ${Math.min(text.length, MAX_SEARCHABLE_CHARS)} characters for RAG.`
        : "DOCX stored in R2, but the Worker parser found no searchable text.",
    };
  }
  return pendingR2Extraction(file);
}

async function textForToolFile(file) {
  if (!file || typeof file === "string") {
    throw new Response(JSON.stringify({ detail: "File is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
  if (file.size > MAX_COMPARE_UPLOAD_BYTES) {
    throw new Response(JSON.stringify({ detail: `File too large for comparison (max ${formatBytes(MAX_COMPARE_UPLOAD_BYTES)} per document).` }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const name = (file.name || "document").toLowerCase();
  let text = "";
  let parser = "unknown";
  let truncated = false;
  let readBytes = 0;
  let parserMessage = "";

  if (name.endsWith(".txt") || name.endsWith(".md")) {
    const data = await readFileSlice(file, MAX_COMPARE_TEXT_BYTES);
    text = normalizeExtractedText(new TextDecoder().decode(data));
    parser = "plain-text";
    readBytes = data.length;
    truncated = file.size > data.length;
    parserMessage = truncated
      ? "Plain text extracted up to the comparison parser limit."
      : "Plain text extracted.";
  } else if (name.endsWith(".pdf")) {
    const maxBytes = Math.min(file.size, MAX_FAST_PARSE_BYTES);
    const data = await readFileSlice(file, maxBytes);
    text = await extractPdfText(data);
    parser = "cloudflare-pdf";
    readBytes = data.length;
    truncated = file.size > maxBytes;
    parserMessage = truncated
      ? "PDF text extracted from the first parsed segment to stay within Worker limits."
      : "PDF text extracted by the Worker parser.";
  } else if (name.endsWith(".docx")) {
    const extracted = await extractDocxTextForCompare(file);
    text = extracted.text;
    parser = extracted.parser;
    readBytes = extracted.readBytes;
    truncated = extracted.truncated;
    parserMessage = extracted.message;
  } else if (/\.(png|jpe?g|webp|bmp|tiff?)$/.test(name)) {
    throw new Response(JSON.stringify({ detail: "Compare supports PDF, DOCX, TXT, and MD. Use Camera OCR to capture image text first." }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } else {
    throw new Response(JSON.stringify({ detail: "Unsupported file type. Upload PDF, DOCX, TXT, or MD." }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  return {
    filename: file.name || "document",
    size: file.size,
    read_bytes: readBytes,
    parser,
    parser_message: parserMessage,
    truncated,
    text: normalizeExtractedText(text),
  };
}

async function textForReaderFile(file) {
  if (!file || typeof file === "string") {
    throw new Response(JSON.stringify({ detail: "File is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
  if (file.size > MAX_COMPARE_UPLOAD_BYTES) {
    throw new Response(JSON.stringify({ detail: `File too large for Guided Reader (max ${formatBytes(MAX_COMPARE_UPLOAD_BYTES)}).` }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const name = (file.name || "document").toLowerCase();
  let text = "";
  let parser = "unknown";
  let readBytes = 0;
  let truncated = false;
  let parserMessage = "";

  if (name.endsWith(".txt") || name.endsWith(".md")) {
    const data = await readFileSlice(file, MAX_COMPARE_TEXT_BYTES);
    text = normalizeExtractedText(new TextDecoder().decode(data));
    parser = "plain-text";
    readBytes = data.length;
    truncated = file.size > data.length;
    parserMessage = truncated ? "Plain text extracted up to the Guided Reader limit." : "Plain text extracted.";
  } else if (name.endsWith(".pdf")) {
    const maxBytes = Math.min(file.size, MAX_FAST_PARSE_BYTES);
    const data = await readFileSlice(file, maxBytes);
    text = await extractPdfText(data);
    parser = "cloudflare-pdf";
    readBytes = data.length;
    truncated = file.size > maxBytes;
    parserMessage = truncated
      ? "PDF text extracted from the first parsed segment to stay within Worker limits."
      : "PDF text extracted by the Worker parser.";
  } else if (name.endsWith(".docx")) {
    const extracted = await extractDocxTextForCompare(file);
    text = extracted.text;
    parser = extracted.parser;
    readBytes = extracted.readBytes;
    truncated = extracted.truncated;
    parserMessage = extracted.message;
  } else if (name.endsWith(".doc")) {
    throw new Response(JSON.stringify({ detail: "Legacy .doc files are not readable in the Cloudflare Worker. Save the document as .docx, PDF, TXT, or MD and upload again." }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } else {
    throw new Response(JSON.stringify({ detail: "Unsupported file type. Upload PDF, DOCX, TXT, or MD." }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const normalized = normalizeExtractedText(text).slice(0, MAX_SEARCHABLE_CHARS);
  return {
    filename: file.name || "document",
    size: file.size,
    read_bytes: readBytes,
    parser,
    parser_message: parserMessage,
    truncated: truncated || text.length > MAX_SEARCHABLE_CHARS,
    text: normalized,
  };
}

async function readStreamPrefix(stream, maxBytes) {
  const reader = stream.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = maxBytes - total;
      const next = value.byteLength > remaining ? value.slice(0, remaining) : value;
      chunks.push(next);
      total += next.byteLength;
      if (value.byteLength > remaining) break;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const data = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return data;
}

async function extractQueuedDocumentFromR2(env, doc) {
  if (!env.DOCUMENTS_R2 || !doc.storage_path) return null;
  const object = await env.DOCUMENTS_R2.get(doc.storage_path);
  if (!object?.body) return null;
  const data = await readStreamPrefix(object.body, doc.ext === "docx" ? MAX_R2_PARSE_BYTES : Math.min(MAX_R2_PARSE_BYTES, Math.max(MAX_FAST_PARSE_BYTES, doc.size || MAX_FAST_PARSE_BYTES)));
  let extracted = "";
  if (doc.ext === "pdf") extracted = await extractPdfText(data);
  else if (doc.ext === "docx") extracted = await extractDocxText(data);
  else return null;
  const hasText = hasUsefulExtractedText(extracted);
  const text = hasText ? extracted.slice(0, MAX_SEARCHABLE_CHARS) : "";
  const chunks = chunkText(text);
  return {
    ...doc,
    chunk_count: chunks.length,
    char_count: extracted.length,
    indexed_char_count: text.length,
    index_truncated: extracted.length > text.length,
    text_extraction_status: hasText ? "EXTRACTED_BEST_EFFORT" : "NOT_EXTRACTED",
    text_extraction_message: hasText
      ? "Fast Cloudflare parser extracted text on demand."
      : "Fast Cloudflare parser could not extract searchable text. If this is a scanned PDF, use Camera OCR or upload a searchable PDF/DOCX.",
    parsed_at: nowIso(),
    parser: "cloudflare-fast-r2",
    text,
    chunks,
  };
}

function bailiiFromUrl(url) {
  const match = /^https?:\/\/caselaw\.nationalarchives\.gov\.uk\/(.+?)\/?$/.exec(url || "");
  if (!match) return null;
  const parts = match[1].split("/");
  const map = {
    "uksc": "uk/cases/UKSC",
    "ukpc": "uk/cases/UKPC",
    "ewca/civ": "ew/cases/EWCA/Civ",
    "ewca/crim": "ew/cases/EWCA/Crim",
    "ewhc/admin": "ew/cases/EWHC/Admin",
    "ewhc/ch": "ew/cases/EWHC/Ch",
    "ewhc/kb": "ew/cases/EWHC/KB",
    "ewhc/comm": "ew/cases/EWHC/Comm",
    "ewfc": "ew/cases/EWFC",
    "ewcop": "ew/cases/EWCOP",
    "eat": "uk/cases/UKEAT",
    "ukut/aac": "uk/cases/UKUT/AAC",
    "ukut/iac": "uk/cases/UKUT/IAC",
  };
  for (const n of [3, 2, 1]) {
    if (parts.length >= n + 2) {
      const prefix = parts.slice(0, n).join("/").toLowerCase();
      if (map[prefix]) return `https://www.bailii.org/${map[prefix]}/${parts[n]}/${parts[n + 1]}.html`;
    }
  }
  return null;
}

function parseAtom(xml, limit = 20) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, limit).map((entry) => {
    const block = entry[1];
    const pick = (tag) => {
      const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(block);
      return match ? match[1].replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
    };
    const link = /<link[^>]+href="([^"]+)"/.exec(block)?.[1] || "";
    const title = pick("title");
    const neutral = /\[\d{4}\]\s+[A-Z][A-Z0-9 ]+\s+\d+/.exec(title)?.[0] || "";
    return {
      title,
      neutral_citation: neutral,
      date: pick("updated").slice(0, 10),
      url: link,
      bailii_url: bailiiFromUrl(link),
      summary: pick("summary").slice(0, 300),
    };
  });
}

function normalizeCaseLawSourceUrl(value) {
  try {
    const parsed = new URL(String(value || "").trim());
    if (parsed.protocol !== "https:") return "";
    const host = parsed.hostname.toLowerCase();
    if (host !== "caselaw.nationalarchives.gov.uk" && host !== "www.bailii.org" && host !== "bailii.org") return "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function cleanCaseLawHtml(html) {
  return normalizeExtractedText(
    decodeXmlEntities(
      String(html || "")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<header[\s\S]*?<\/header>/gi, " ")
        .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
        .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
        .replace(/<\/(?:article|section|div|p|h[1-6]|li|tr|blockquote)>/gi, "\n")
        .replace(/<[^>]+>/g, " "),
    ),
  );
}

async function fetchCaseLawSourceText(sourceUrl) {
  const normalized = normalizeCaseLawSourceUrl(sourceUrl);
  if (!normalized) return { url: "", text: "", status: "invalid_source" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(normalized, {
      headers: { "User-Agent": "ADA-Studio-Cloudflare/1.0" },
      signal: controller.signal,
    });
    if (!res.ok || !res.body) return { url: normalized, text: "", status: `source_fetch_${res.status}` };
    const data = await readStreamPrefix(res.body, MAX_CASELAW_PAGE_BYTES);
    const raw = new TextDecoder().decode(data);
    const contentType = res.headers.get("Content-Type") || "";
    const text = /html|xml/i.test(contentType) || /<\/?[a-z][\s\S]*>/i.test(raw)
      ? cleanCaseLawHtml(raw)
      : normalizeExtractedText(decodeXmlEntities(raw));
    return {
      url: normalized,
      text: text.slice(0, MAX_CASELAW_EXCERPT_CHARS),
      status: text ? "source_excerpt" : "empty_source",
    };
  } catch (err) {
    console.log(JSON.stringify({ event: "case_law_source_fetch_failed", url: normalized, message: err?.message || String(err) }));
    return { url: normalized, text: "", status: "source_fetch_failed" };
  } finally {
    clearTimeout(timeout);
  }
}

async function generateCaseLawAnswer(env, requestedModel, system, userMessage, maxTokens = 850) {
  return await generateToolAnswerWithOllamaCloud(env, requestedModel || DEFAULT_OLLAMA_MODEL, system, userMessage, maxTokens);
}

function caseLawFallbackSummary(payload, source, mode = "detailed") {
  const title = normalizeExtractedText(payload.title || "Selected judgment");
  const neutral = normalizeExtractedText(payload.neutral_citation || "");
  const date = normalizeExtractedText(payload.date || "");
  const focus = normalizeExtractedText(payload.question || payload.focus || "");
  const resultSummary = normalizeExtractedText(payload.summary || "");
  const sourceText = normalizeExtractedText(source?.text || "");
  const sourceUrl = source?.url || normalizeCaseLawSourceUrl(payload.url) || normalizeCaseLawSourceUrl(payload.bailii_url);
  const availableSummary = resultSummary || sourceText.slice(0, 700);
  if (mode === "quick") {
    return withDisclaimer([
      `Issue: ${focus || (availableSummary ? availableSummary.slice(0, 170) : "Not clear from the available metadata.")}`,
      `Held / result: ${availableSummary ? availableSummary.slice(0, 220) : "Not clear from the available excerpt."}`,
      `Use: Treat as a lead authority only after reading the full judgment${sourceUrl ? ` at ${sourceUrl}` : ""}.`,
    ].join("\n"));
  }
  const lines = [
    "**Snapshot**",
    `${title}${neutral ? ` (${neutral})` : ""}${date ? `, ${date}` : ""}. ${source?.status ? `Source status: ${source.status}.` : ""}`.trim(),
    "",
    "**Issues**",
    focus || "Not clear from the available excerpt.",
    "",
    "**Held / Result**",
    availableSummary || "Not clear from the available excerpt.",
    "",
    "**Reasoning**",
    sourceText ? sourceText.slice(0, 900) : "No judgment excerpt was available to extract reasoning safely.",
    "",
    "**Why It Matters**",
    resultSummary || "Use this as a research lead, then verify the proposition in the full judgment.",
    "",
    "**Use in Argument**",
    sourceUrl ? `Check the full judgment before relying on any proposition: ${sourceUrl}` : "Open the linked source judgment before relying on any proposition.",
    "",
    "**Limits**",
    "The AI provider did not return a usable summary, so this is a source-only fallback. It may not identify the final holding or ratio unless that appears in the available metadata or excerpt.",
  ];
  return withDisclaimer(lines.join("\n\n"));
}

function looksLikeCaseLawRefusal(answer) {
  return looksLikeMissingDocumentRefusal(answer)
    || /uploaded sources do not contain sufficient information/i.test(String(answer || ""))
    || /do not contain sufficient information to answer/i.test(String(answer || ""));
}

function cleanCaseLawAnswer(answer) {
  let text = cleanToolAnswer(answer).replace(DISCLAIMER, "").trim();
  const snapshotIndex = text.search(/\*\*\s*Snapshot\s*\*\*/i);
  if (snapshotIndex > 0) {
    text = text.slice(snapshotIndex).trim();
  } else {
    const sectionIndex = text.search(/(?:^|\n|\.\s+)(?:#{1,3}\s*)?(?:\*\*)?(?:Snapshot|Issues|Issue)(?:\*\*)?\s*:?/i);
    if (sectionIndex > 0 && sectionIndex < 4000) text = text.slice(sectionIndex).trim();
  }
  text = text
    .replace(/^(?:let's craft[^.?!]*(?:[.?!]|$)\s*)+/i, "")
    .replace(/^(?:we|i|the excerpt|the case|so we|therefore)[^*#\n]*(?:need|should|can|must|will|only have|don't have)[\s\S]{0,1800}?(?=(?:\*\*\s*)?(?:Snapshot|Issues|Issue)(?:\s*\*\*)?\s*:?\s*)/i, "")
    .replace(/\b(?:Provide snapshot, key points, practical relevance, limits\.?|Use only supplied info\.?|Avoid inventing\.?|Return concise Markdown[^.?!]*(?:[.?!]|$))\s*/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return withDisclaimer(text || answer);
}

function compactCaseLawQuickSummary(answer) {
  const withoutDisclaimer = cleanCaseLawAnswer(answer).replace(DISCLAIMER, "").trim();
  const lines = withoutDisclaimer
    .split(/\n+/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
  const labelled = lines.filter((line) => /^(Issue|Held(?:\s*\/\s*result)?|Result|Use|Why it matters):/i.test(line));
  if (labelled.length >= 2) {
    return withDisclaimer(labelled.slice(0, 3).join("\n"));
  }
  const sentences = withoutDisclaimer.match(/[^.!?]+[.!?]+/g) || [];
  const filtered = sentences.filter((sentence) => {
    const value = sentence.trim();
    return !/^(?:we|i|let's|provide|use only|avoid inventing|so we)\b/i.test(value)
      && !/\b(?:we must|we need|we should|we can|let's craft)\b/i.test(value);
  });
  const compactSource = (filtered.length ? filtered : sentences).length ? (filtered.length ? filtered : sentences).slice(0, 3).join(" ") : withoutDisclaimer;
  const compact = compactSource
    .replace(/\s+/g, " ")
    .trim();
  const parts = compact.match(/[^.!?]+[.!?]+/g) || [compact];
  return withDisclaimer([
    `Issue: ${parts[0]?.trim() || "Not clear from the available metadata."}`,
    `Held / result: ${parts[1]?.trim() || "Not clear from the available excerpt."}`,
    `Use: ${parts[2]?.trim() || "Read the full judgment before relying on the point."}`,
  ].join("\n").slice(0, 900));
}

function caseLawPrompt(payload, source, mode = "detailed") {
  const title = normalizeExtractedText(payload.title || "Selected judgment");
  const neutral = normalizeExtractedText(payload.neutral_citation || "");
  const date = normalizeExtractedText(payload.date || "");
  const focus = normalizeExtractedText(payload.question || payload.focus || "");
  const resultSummary = normalizeExtractedText(payload.summary || "");
  const sourceUrl = source?.url || normalizeCaseLawSourceUrl(payload.url) || "";
  const bailiiUrl = normalizeCaseLawSourceUrl(payload.bailii_url || "");
  const outputInstruction = mode === "quick"
    ? "Return exactly three short lines with these labels: Issue:, Held / result:, Use:. Maximum 120 words total. If a point is not clear from the supplied material, say 'Not clear from the available excerpt.'"
    : [
      "Start the first character of your answer with **Snapshot**.",
      "Return concise Markdown with exactly these headings: Snapshot, Issues, Held / Result, Reasoning, Why It Matters, Use in Argument, Limits.",
      "Do not include preamble, drafting notes, hidden reasoning, or commentary about what you are going to write.",
      "Snapshot: one short paragraph identifying the case, court/date if available, and source basis.",
      "Issues, Held / Result, Reasoning, Why It Matters, and Use in Argument: use 1-3 tight bullets each.",
      "For any unsupported point write 'Not clear from the available excerpt' instead of guessing.",
    ].join(" ");
  return [
    "Summarise this UK case-law result from the supplied metadata and judgment excerpt.",
    "Do not mention uploaded documents. Do not invent facts, holdings, citations, procedural history, or party names not present in the supplied material.",
    "If the excerpt is incomplete, state that limitation and summarise only what can be supported.",
    "Prefer the ratio, legal test, procedural result, and practical litigation relevance over background narrative.",
    focus ? `User focus: ${focus}` : "",
    "",
    `Title: ${title}`,
    neutral ? `Neutral citation: ${neutral}` : "",
    date ? `Date: ${date}` : "",
    sourceUrl ? `Find Case Law URL: ${sourceUrl}` : "",
    bailiiUrl ? `BAILII URL: ${bailiiUrl}` : "",
    resultSummary ? `Search-result summary: ${resultSummary}` : "",
    "",
    "Judgment excerpt:",
    source?.text || "No judgment excerpt could be fetched. Use only the metadata above.",
    "",
    outputInstruction,
  ].filter((line) => line !== "").join("\n");
}

function caseLawCitation(payload, source) {
  const title = normalizeExtractedText(payload.title || "Selected judgment");
  const neutral = normalizeExtractedText(payload.neutral_citation || "");
  const resultSummary = normalizeExtractedText(payload.summary || "");
  const preview = normalizeExtractedText(source?.text || resultSummary || title).slice(0, 700);
  return {
    tag: "C1",
    title,
    neutral_citation: neutral,
    url: source?.url || normalizeCaseLawSourceUrl(payload.url) || "",
    bailii_url: normalizeCaseLawSourceUrl(payload.bailii_url || ""),
    preview,
  };
}

async function summariseCaseLaw(env, payload, requestedModel = DEFAULT_OLLAMA_MODEL, options = {}) {
  const sourceUrl = normalizeCaseLawSourceUrl(payload.url) || normalizeCaseLawSourceUrl(payload.bailii_url);
  const source = await fetchCaseLawSourceText(sourceUrl);
  const system = [
    "You are ADA Studio's UK case-law summariser.",
    "Summarise only the supplied Find Case Law/BAILII metadata and excerpt.",
    "Do not answer from uploaded document context. Do not fabricate legal propositions or citations.",
    "Keep the output practical for a UK legal research workflow.",
  ].join("\n");
  const aiResult = await generateCaseLawAnswer(env, requestedModel, system, caseLawPrompt(payload, source, options.mode), options.maxTokens || 1600);
  let answer = aiResult?.answer && !looksLikeCaseLawRefusal(aiResult.answer)
    ? cleanCaseLawAnswer(aiResult.answer)
    : caseLawFallbackSummary(payload, source, options.mode);
  if (options.mode === "quick") answer = compactCaseLawQuickSummary(answer);
  return {
    answer,
    model: aiResult?.model || "case-law-source-fallback",
    status: aiResult?.status || "fallback_case_metadata",
    source,
    citation: caseLawCitation(payload, source),
  };
}

const BRIEF_STYLE_CONFIG = {
  skeleton_argument: {
    label: "Skeleton argument",
    first_heading: "**Issue**",
    instruction: "Draft in a UK skeleton argument style with headings: Issue, Short Answer, Authorities, Submissions, Distinguishing Points / Weaknesses, Relief / Outcome Sought, Limits.",
  },
  advice_note: {
    label: "Advice note",
    first_heading: "**Executive Summary**",
    instruction: "Draft in an advice note style with headings: Executive Summary, Relevant Authorities, Legal Analysis, Application to the Matter, Risks, Recommended Next Steps, Limits.",
  },
  memo: {
    label: "Internal memo",
    first_heading: "**Question Presented**",
    instruction: "Draft in an internal legal memo style with headings: Question Presented, Brief Answer, Authorities, Discussion, Counterarguments, Practical Points, Limits.",
  },
};

function briefStyleConfig(style) {
  return BRIEF_STYLE_CONFIG[style] || BRIEF_STYLE_CONFIG.skeleton_argument;
}

function compactPinnedCase(pin, index) {
  const title = normalizeExtractedText(pin.title || `Pinned authority ${index + 1}`);
  const neutral = normalizeExtractedText(pin.neutral_citation || "");
  const date = normalizeExtractedText(pin.date || "");
  const summary = normalizeExtractedText(pin.ai_summary || pin.summary || pin.description || "").slice(0, MAX_BRIEF_AUTHORITY_SUMMARY_CHARS);
  const url = normalizeCaseLawSourceUrl(pin.url || "");
  const bailiiUrl = normalizeCaseLawSourceUrl(pin.bailii_url || "");
  return {
    tag: `C${index + 1}`,
    title,
    neutral_citation: neutral,
    date,
    url,
    bailii_url: bailiiUrl,
    summary,
    pinned_at: pin.pinned_at,
  };
}

function briefAuthorityBlock(bundle) {
  return bundle.map((item) => [
    `[${item.tag}] ${item.title}${item.neutral_citation ? `, ${item.neutral_citation}` : ""}${item.date ? ` (${item.date})` : ""}`,
    item.url ? `Find Case Law: ${item.url}` : "",
    item.bailii_url ? `BAILII: ${item.bailii_url}` : "",
    item.summary ? `Available summary: ${item.summary}` : "Available summary: No search-result summary was pinned. Use only the title/citation as a research lead.",
  ].filter(Boolean).join("\n")).join("\n\n");
}

function briefPrompt(matter, style, bundle) {
  const config = briefStyleConfig(style);
  return [
    "Matter / question:",
    matter,
    "",
    "Pinned authorities:",
    briefAuthorityBlock(bundle),
    "",
    config.instruction,
    `Start the first character of the answer with ${config.first_heading}.`,
    "Produce a full, developed draft. Do not be terse. Use paragraphs and bullet points where helpful.",
    "Discuss the practical legal effect of each pinned authority and apply it to the matter.",
    "Include counterarguments, limits, and next steps if they are relevant to the selected style.",
    "Do not describe what this style should contain. Do not narrate your drafting process.",
    "Use only the pinned authorities and the matter description above for case-specific propositions.",
    "Cite authorities with [C1], [C2], etc. Do not invent cases, neutral citations, procedural history, holdings, statutes, or facts.",
    "If the pinned summaries are too thin for a proposition, say that the authority should be verified in the full judgment.",
    "Return the final draft only.",
  ].join("\n");
}

function normalizeBriefHeadings(text) {
  const headings = [
    "Advice note",
    "Skeleton argument",
    "Internal memo",
    "Question Presented",
    "Executive Summary",
    "Issue",
    "Short Answer",
    "Brief Answer",
    "Authorities",
    "Relevant Authorities",
    "Legal Analysis",
    "Application to the Matter",
    "Submissions",
    "Discussion",
    "Counterarguments",
    "Distinguishing Points / Weaknesses",
    "Risks",
    "Practical Points",
    "Recommended Next Steps",
    "Relief / Outcome Sought",
    "Limits",
  ];
  let output = String(text || "");
  for (const heading of headings) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    output = output.replace(new RegExp(`(^|\\n)\\s*(?:#{1,4}\\s*)?(?:\\*\\*)?(${escaped})(?:\\*\\*)?\\s*:?\\s*`, "gi"), (_, prefix, found) => {
      const clean = found.replace(/\s+/g, " ").trim();
      return `${prefix}${prefix ? "\n" : ""}**${clean.replace(/\b\w/g, (char) => char.toUpperCase())}**\n`;
    });
  }
  return output
    .replace(/(\*\*[^\n*]+\*\*)\s*\n\s*(\*\*[^\n*]+\*\*)/g, (match, first, second) => (
      first.toLowerCase() === second.toLowerCase() ? first : match
    ))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripBriefInstructionLeak(text) {
  const instructionLine = /^(?:,?\s*)?(?:Relevant Authorities|Authorities|Legal Analysis|Application to the Matter|Risks|Recommended Next Steps|Limits|Counterarguments|Practical Points)(?:\s*,\s*(?:Relevant Authorities|Authorities|Legal Analysis|Application to the Matter|Risks|Recommended Next Steps|Limits|Counterarguments|Practical Points))+\.?$/i;
  const promptLine = /^(?:we must|we need|we should|use paragraphs|use bullet points|cite authorities|no invented|do not invent|the matter description is minimal|discuss claimant arguments|return the final draft|start the first character)\b/i;
  const promptFragment = /\b(?:use the pinned authorities|provide arguments|provide practical|provide thorough|provide counterarguments|use english law|use citations|use paragraphs|no other authorities|ensure not to fabricate|defendant counterarguments|claimant arguments|evidential gaps|settlement points|limits, next steps)\b/i;
  const chatterLine = /^(?:let'?s\b|stop\b|ok\.?$|this is repetitive\b|now\s+(?:write|draft)|write the note\b|draft the note\b|final answer\b)/i;
  return String(text || "")
    .split(/\n/)
    .filter((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (index < 20 && /^g\.,/i.test(trimmed)) return false;
      if (index < 12 && instructionLine.test(trimmed)) return false;
      if (index < 16 && promptLine.test(trimmed)) return false;
      if (index < 16 && promptFragment.test(trimmed)) return false;
      if (index < 80 && chatterLine.test(trimmed)) return false;
      if (index < 16 && /^(?:the user asks|the selected style|the brief should|the output should)\b/i.test(trimmed)) return false;
      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanBriefAnswer(answer, style = "skeleton_argument") {
  const config = briefStyleConfig(style);
  let text = cleanAssistantAnswer(answer).replace(DISCLAIMER, "").trim();
  const firstUseful = text.search(/(?:\*\*\s*)?(?:Skeleton Argument|Advice Note|Internal Memo|Question Presented|Executive Summary|Issue|Short Answer|Brief Answer|Relevant Authorities|Legal Analysis)(?:\s*\*\*)?\s*:?/i);
  if (firstUseful > 0 && firstUseful < 3000) text = text.slice(firstUseful).trim();
  text = text
    .replace(/^(?:we need|we should|we must|the user wants|drafting approach|final draft:|use headings|no invented cases|return the final draft)[\s\S]{0,1800}?(?=(?:\*\*)?(?:Skeleton Argument|Advice Note|Internal Memo|Issue|Executive Summary|Question Presented|Short Answer|Brief Answer))/i, "")
    .replace(/^["“]\s*/, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!/^\s*(?:#{1,4}\s*)?(?:\*\*)?(?:Advice Note|Skeleton Argument|Internal Memo|Question Presented|Executive Summary|Issue|Short Answer|Brief Answer)/i.test(text)) {
    text = `${config.first_heading}\n${text}`;
  }
  const cleaned = stripBriefInstructionLeak(normalizeBriefHeadings(text || answer))
    .replace(/^(\*\*([^\n*]+)\*\*)\s*(?:\r?\n)+\s*\*\*\2\*\*\s*/i, "$1\n\n")
    .trim();
  return withDisclaimer(cleaned);
}

function fallbackBriefDraft(matter, style, bundle) {
  const config = briefStyleConfig(style);
  const authorities = bundle.length
    ? bundle.map((item) => `- [${item.tag}] ${item.title}${item.neutral_citation ? `, ${item.neutral_citation}` : ""}${item.date ? ` (${item.date})` : ""}: ${item.summary || "No pinned summary available; verify the full judgment before relying on it."}`).join("\n")
    : "- No authorities were pinned.";
  const proposition = bundle.length
    ? "The pinned authorities should be treated as research leads unless their full judgments are reviewed."
    : "No authority-backed proposition can be drafted because no authorities were pinned.";
  const heading = config.label;
  return withDisclaimer([
    `**${heading}**`,
    "",
    "**Matter / Question**",
    matter,
    "",
    "**Short Answer**",
    proposition,
    "",
    "**Authorities**",
    authorities,
    "",
    "**Legal Analysis**",
    bundle.length
      ? bundle.map((item) => `- [${item.tag}] supports only the propositions visible in the pinned metadata or summary. ${item.summary ? `Available proposition: ${item.summary}` : "No summary was pinned, so no legal proposition can safely be extracted without reading the full judgment."}`).join("\n")
      : "- No authority-backed analysis is available.",
    "",
    "**Application to the Matter**",
    "- Apply the pinned authorities only after checking whether the facts, contractual wording, procedural posture, and remedy sought match the user's matter.",
    "- Where the matter turns on wording or facts not supplied here, obtain those facts before treating the draft as complete.",
    "",
    "**Risks / Counterarguments**",
    "- The other side may distinguish a pinned authority if its facts, statutory context, or remedy differ from the present matter.",
    "- A court or opponent may reject any proposition that is not tied to a pinpoint passage in the full judgment.",
    "",
    "**Next Steps**",
    "- Open and verify each full judgment.",
    "- Add pinpoint references and the exact proposition for each authority.",
    "- Re-run draft generation after pinning stronger case summaries if more detail is needed.",
  ].join("\n"));
}

function looksLikeBriefRefusal(answer) {
  const value = String(answer || "");
  const start = value.slice(0, 1500);
  return looksLikeMissingDocumentRefusal(value)
    || /(?:cannot|can't|unable to)\s+(?:draft|generate|prepare)/i.test(String(answer || ""))
    || /(?:no|not enough)\s+(?:pinned|authority|authorities|information|context)/i.test(value)
    || /^(?:advice note|skeleton argument|internal memo)\s+should\b/i.test(start.trim())
    || /^(?:we must|we need|we should|so we|use headings|no invented cases|return the final draft)\b/i.test(start.trim());
}

async function generateBrief(env, user, body) {
  const matter = normalizeExtractedText(body.matter || "").slice(0, MAX_BRIEF_MATTER_CHARS);
  if (!matter) throw new Response(JSON.stringify({ detail: "Describe the matter first." }), {
    status: 422,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
  const pins = await kvList(env, `pin:${user.user_id}:`);
  pins.sort((a, b) => String(a.pinned_at).localeCompare(String(b.pinned_at)));
  if (!pins.length) throw new Response(JSON.stringify({ detail: "Pin at least one case before generating a brief." }), {
    status: 422,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
  const style = BRIEF_STYLE_CONFIG[body.style] ? body.style : "skeleton_argument";
  const requestedMaxTokens = normalizeMaxTokens(body.max_tokens ?? body.maxTokens ?? DEFAULT_BRIEF_OUTPUT_TOKENS, DEFAULT_BRIEF_OUTPUT_TOKENS);
  const bundle = pins.slice(0, MAX_BRIEF_AUTHORITIES).map(compactPinnedCase);
  const system = [
    "You are ADA Studio's UK legal brief drafter.",
    "Draft only from the supplied matter and pinned authorities.",
    "Do not fabricate authorities, holdings, facts, statutes, or procedural history.",
    "Use clear Markdown and preserve the supplied citation tags.",
  ].join("\n");
  const aiResult = await generateToolAnswer(
    env,
    body.model || DEFAULT_OLLAMA_MODEL,
    system,
    briefPrompt(matter, style, bundle),
    requestedMaxTokens,
  );
  const cleanedAiAnswer = aiResult?.answer ? cleanBriefAnswer(aiResult.answer, style) : "";
  const answer = cleanedAiAnswer && !looksLikeBriefRefusal(cleanedAiAnswer)
    ? cleanedAiAnswer
    : fallbackBriefDraft(matter, style, bundle);
  const brief = {
    brief_id: id("brief"),
    owner_id: user.user_id,
    matter,
    style,
    style_label: briefStyleConfig(style).label,
    answer,
    bundle,
    model: aiResult?.model || "pinned-authority-fallback",
    model_status: aiResult?.status || "fallback_pinned_authorities",
    max_tokens: requestedMaxTokens,
    created_at: nowIso(),
  };
  await kvPut(env, `brief:${user.user_id}:${brief.brief_id}`, brief);
  return brief;
}

function draftingTypeLabel(value) {
  return DRAFTING_DOCUMENT_TYPES[value] || DRAFTING_DOCUMENT_TYPES.custom_letter;
}

function draftingField(value, limit = MAX_DRAFTING_FIELD_CHARS) {
  return normalizeExtractedText(value || "").slice(0, limit);
}

function normalizeDraftingInput(body) {
  const document_type = DRAFTING_DOCUMENT_TYPES[body.document_type] ? body.document_type : "custom_letter";
  return {
    document_type,
    document_type_label: draftingTypeLabel(document_type),
    sender_name: draftingField(body.sender_name, 500),
    sender_address: draftingField(body.sender_address, 1500),
    recipient_name: draftingField(body.recipient_name, 500),
    recipient_address: draftingField(body.recipient_address, 1500),
    client_name: draftingField(body.client_name, 500),
    matter_reference: draftingField(body.matter_reference, 500),
    date: draftingField(body.date, 100) || nowIso().slice(0, 10),
    subject: draftingField(body.subject, 800),
    background_facts: draftingField(body.background_facts),
    basis_of_claim: draftingField(body.basis_of_claim),
    key_issues: draftingField(body.key_issues),
    chronology: draftingField(body.chronology),
    desired_outcome: draftingField(body.desired_outcome),
    response_deadline: draftingField(body.response_deadline, 500),
    tone: draftingField(body.tone, 200) || "Formal and firm",
    additional_instructions: draftingField(body.additional_instructions),
    model: body.model || DEFAULT_OLLAMA_MODEL,
  };
}

function validateDraftingInput(input) {
  const required = input.document_type === "letter_of_claim"
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
  return required.filter(([key]) => !input[key]).map(([, message]) => message);
}

function draftingPrompt(input, pins) {
  const authorities = pins.slice(0, MAX_BRIEF_AUTHORITIES).map(compactPinnedCase);
  const fieldLines = [
    `Document type: ${input.document_type_label}`,
    `Sender name: ${input.sender_name}`,
    `Sender address:\n${input.sender_address}`,
    `Recipient name: ${input.recipient_name}`,
    `Recipient address:\n${input.recipient_address}`,
    `Client name: ${input.client_name}`,
    `Matter/reference number: ${input.matter_reference}`,
    `Date: ${input.date}`,
    `Subject/RE line: ${input.subject}`,
    `Background facts:\n${input.background_facts}`,
    `Basis of claim:\n${input.basis_of_claim}`,
    `Key legal or factual issues:\n${input.key_issues}`,
    `Chronology/key events:\n${input.chronology}`,
    `Desired outcome/remedy:\n${input.desired_outcome}`,
    `Response deadline: ${input.response_deadline}`,
    `Tone/formality preference: ${input.tone}`,
    `Additional instructions:\n${input.additional_instructions}`,
  ].join("\n\n");
  const authorityText = authorities.length
    ? authorities.map((item) => `[${item.tag}] ${item.title} ${item.neutral_citation || ""}\n${item.summary || "No summary supplied."}`).join("\n\n")
    : "No pinned authorities supplied.";
  const locSections = input.document_type === "letter_of_claim"
    ? "For a letter of claim, use formal sections: Parties, Background, Chronology, Basis of claim, Losses/remedy sought, Documents relied on, Required response, Deadline, Next steps."
    : "Use professional legal correspondence structure with address blocks, date, reference line, subject line, salutation, opening, body sections, requested action, closing, and sign-off.";
  return [
    "# Drafting inputs",
    fieldLines,
    "# Pinned authorities or documents relied on",
    authorityText,
    "# Required output",
    locSections,
    "Return only the finished legal letter. Do not include commentary about how it was drafted.",
  ].join("\n\n");
}

function fallbackDraftingLetter(input, pins) {
  const authorities = pins.slice(0, 6).map(compactPinnedCase);
  const salutationName = input.recipient_name ? input.recipient_name.split(/\s+/).slice(-1)[0] : "Sir/Madam";
  const lines = [
    input.sender_name,
    input.sender_address,
    "",
    input.recipient_name,
    input.recipient_address,
    "",
    input.date,
    input.matter_reference ? `Our ref: ${input.matter_reference}` : "",
    "",
    input.subject ? `Re: ${input.subject}` : `Re: ${input.client_name || "Our client"} - ${input.document_type_label}`,
    "",
    `Dear ${salutationName},`,
    "",
  ].filter((line) => line !== undefined && line !== null);
  if (input.document_type === "letter_of_claim") {
    lines.push(
      "LETTER OF CLAIM",
      "",
      "Parties",
      `${input.sender_name || "We"} write in relation to ${input.client_name || "our client"} and the proposed claim against ${input.recipient_name || "you"}.`,
      "",
      "Background",
      input.background_facts,
      "",
      "Chronology",
      input.chronology || "The relevant chronology should be checked against the underlying documents before this letter is sent.",
      "",
      "Basis of claim",
      input.basis_of_claim,
      "",
      "Losses/remedy sought",
      input.desired_outcome,
      "",
      "Documents relied on",
      authorities.length ? authorities.map((item) => `- [${item.tag}] ${item.title} ${item.neutral_citation || ""}`).join("\n") : "We rely on the documents and correspondence referred to above.",
      "",
      "Required response",
      `Please provide your substantive response and proposals for resolution by ${input.response_deadline}.`,
      "",
      "Deadline",
      input.response_deadline,
      "",
      "Next steps",
      "If no satisfactory response is received by the deadline, our client reserves all rights, including the right to commence proceedings without further notice.",
    );
  } else {
    lines.push(
      input.background_facts,
      "",
      input.key_issues ? `Key issues\n${input.key_issues}` : "",
      input.chronology ? `Chronology\n${input.chronology}` : "",
      input.desired_outcome ? `Requested action\n${input.desired_outcome}` : "",
      input.response_deadline ? `Please respond by ${input.response_deadline}.` : "",
      input.additional_instructions || "",
    );
  }
  lines.push(
    "",
    "All rights are reserved.",
    "",
    "Yours faithfully,",
    "",
    input.sender_name || "ADA Studio",
  );
  return withDisclaimer(lines.filter((line) => line !== undefined && line !== null).join("\n"));
}

function looksLikeDraftingRefusal(answer) {
  return looksLikeMissingDocumentRefusal(answer)
    || /(?:cannot|can't|unable to)\s+(?:draft|generate|prepare)/i.test(String(answer || ""));
}

function normalizeDraftingRecord(record) {
  const documentType = record.document_type || record.style || "custom_letter";
  const draftText = record.draft_text || record.answer || "";
  return {
    ...record,
    draft_id: record.draft_id || record.brief_id,
    brief_id: record.brief_id || record.draft_id,
    record_label: "Drafting Tool",
    kind: record.kind || "drafting_tool",
    document_type: documentType,
    document_type_label: record.document_type_label || draftingTypeLabel(documentType),
    draft_text: draftText,
    answer: draftText,
  };
}

async function generateDraftingDocument(env, user, body) {
  const input = normalizeDraftingInput(body || {});
  const validationErrors = validateDraftingInput(input);
  if (validationErrors.length) throw new Response(JSON.stringify({ detail: validationErrors.join(" ") }), {
    status: 422,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
  const pins = await kvList(env, `pin:${user.user_id}:`);
  pins.sort((a, b) => String(a.pinned_at).localeCompare(String(b.pinned_at)));
  const system = [
    "You are ADA Studio's UK legal correspondence drafting assistant.",
    "Draft a professional legal letter from the supplied structured inputs only.",
    "Do not fabricate facts, authorities, documents, deadlines, losses, addresses, or admissions.",
    "Use clean letter formatting with address blocks, date, reference/subject line, salutation, headings where appropriate, and a professional sign-off.",
    "For letters of claim, include reservation of rights wording and avoid overstatement.",
  ].join("\n");
  const requestedMaxTokens = normalizeMaxTokens(body.max_tokens ?? body.maxTokens ?? DEFAULT_BRIEF_OUTPUT_TOKENS, DEFAULT_BRIEF_OUTPUT_TOKENS);
  const aiResult = await generateToolAnswer(env, input.model, system, draftingPrompt(input, pins), requestedMaxTokens);
  const cleanAnswer = aiResult?.answer ? cleanToolAnswer(aiResult.answer).replace(DISCLAIMER, "").trim() : "";
  const draftText = cleanAnswer && !looksLikeDraftingRefusal(cleanAnswer)
    ? withDisclaimer(cleanAnswer)
    : fallbackDraftingLetter(input, pins);
  const draft = {
    draft_id: id("draft"),
    brief_id: id("brief"),
    owner_id: user.user_id,
    kind: "drafting_tool",
    ...input,
    draft_text: draftText,
    answer: draftText,
    bundle: pins.slice(0, MAX_BRIEF_AUTHORITIES).map(compactPinnedCase),
    model: aiResult?.model || input.model,
    model_status: aiResult?.status || "rule_based_drafting_fallback",
    max_tokens: requestedMaxTokens,
    created_at: nowIso(),
  };
  await kvPut(env, `brief:${user.user_id}:${draft.brief_id}`, draft);
  return normalizeDraftingRecord(draft);
}

async function caseLawSearch(query) {
  const url = new URL(`${FCL_BASE}/atom.xml`);
  if (query) url.searchParams.set("query", query);
  else url.searchParams.set("order", "-date");
  url.searchParams.set("per_page", "20");
  const res = await fetch(url, { headers: { "User-Agent": "ADA-Studio-Cloudflare/1.0" } });
  if (!res.ok) throw new Response(JSON.stringify({ detail: `Case law fetch failed: ${res.status}` }), {
    status: 502,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
  const xml = res.body
    ? new TextDecoder().decode(await readStreamPrefix(res.body, MAX_CASELAW_FEED_BYTES))
    : await res.text();
  const results = parseAtom(xml);
  return { count: results.length, results, ...(query ? { query } : {}) };
}

async function guestSession(env, guestId) {
  const stableGuestId = String(guestId || "").trim() || crypto.randomUUID();
  const guestHash = await sha256(stableGuestId);
  const user_id = `guest_${guestHash.slice(0, 24)}`;
  let user = await kvGet(env, `user:${user_id}`);
  if (!user) {
    user = {
      user_id,
      email: "workspace@ada.local",
      name: "Workspace",
      auth_provider: "guest",
      created_at: nowIso(),
    };
    await kvPut(env, `user:${user_id}`, user);
  }
  return { token: await makeToken(env, user_id), user: stripInternal(user) };
}

function selectedFeatureLabels(modules) {
  const labels = {
    rag: "document RAG with citations",
    caselaw: "UK case-law search",
    camera: "camera OCR capture",
    compare: "document comparison",
    chronology: "chronology builder",
    model_lab: "mini model training lab",
    guided_reader: "saccadic guided reader",
    brief_export: "brief export",
    audit: "audit metadata",
  };
  return modules.map((id) => labels[id] || id).join(", ");
}

function inferAppTypeFromDescription(description, modules) {
  const text = `${description} ${modules.join(" ")}`.toLowerCase();
  if (/\bchronolog|timeline|events?\b/.test(text)) return "chronology_builder";
  if (/\bletter|correspondence|notice|email\b/.test(text)) return "letter_generator";
  if (/\bresearch|case law|caselaw|authorit|judgment|brief\b/.test(text)) return "research_assistant";
  return "contract_reviewer";
}

function titleFromDescription(description, appType) {
  const cleaned = String(description || "")
    .replace(/\s+/g, " ")
    .replace(/^(build|create|make|design)\s+(me\s+)?(a|an|the)?\s*/i, "")
    .trim();
  const words = cleaned.split(/\s+/).slice(0, 6).join(" ");
  const fallback = APP_TYPES[appType]?.label || "Legal Assistant";
  return words ? words.replace(/[^\w\s&-]/g, "").replace(/\b\w/g, (ch) => ch.toUpperCase()).slice(0, 72) : fallback;
}

function fallbackAppConfig(description, modules, env) {
  const app_type = inferAppTypeFromDescription(description, modules);
  const features = selectedFeatureLabels(modules);
  return {
    name: titleFromDescription(description, app_type),
    app_type,
    jurisdiction: "United Kingdom",
    system_instructions: `You are a careful UK legal assistant configured for: ${description || APP_TYPES[app_type].label}. Use these enabled capabilities where relevant: ${features || "document review"}. Ground document answers in uploaded sources, avoid fabricating law or facts, and preserve uncertainty.`,
    output_format: APP_TYPES[app_type]?.default_format || "Markdown with clear headings, citations, assumptions, and next steps.",
    safety_rules: "State that the output is legal information, not legal advice. Flag uncertainty and cite sources where available.",
    model: defaultOllamaModel(env),
    modules,
  };
}

function extractJsonObject(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  const candidate = fenced ? fenced[1] : raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function sanitizeAppConfig(value, description, modules, env) {
  const fallback = fallbackAppConfig(description, modules, env);
  const raw = value && typeof value === "object" ? value : {};
  const app_type = APP_TYPES[raw.app_type] ? raw.app_type : fallback.app_type;
  return {
    name: String(raw.name || fallback.name).trim().slice(0, 80) || fallback.name,
    app_type,
    jurisdiction: String(raw.jurisdiction || fallback.jurisdiction).trim().slice(0, 80) || "United Kingdom",
    system_instructions: String(raw.system_instructions || fallback.system_instructions).trim().slice(0, 2500),
    output_format: String(raw.output_format || APP_TYPES[app_type]?.default_format || fallback.output_format).trim().slice(0, 1200),
    safety_rules: String(raw.safety_rules || fallback.safety_rules).trim().slice(0, 1200),
    model: selectedOllamaModel({ model: raw.model }, env),
    modules,
  };
}

function appConfigMessages(description, modules) {
  const allowedTypes = Object.keys(APP_TYPES).join(", ");
  const allowedModules = ALLOWED_APP_MODULES.join(", ");
  return [
    {
      role: "system",
      content: [
        "You generate ADA Studio legal AI app configurations.",
        "Return strict JSON only. No Markdown, prose, comments, or reasoning.",
        `Allowed app_type values: ${allowedTypes}.`,
        `Allowed modules: ${allowedModules}.`,
        "JSON keys: name, app_type, jurisdiction, system_instructions, output_format, safety_rules, model, modules.",
        "The system_instructions must be specific enough to run the assistant, grounded in UK legal information, and must prohibit fabricated law, facts, citations, or document content.",
      ].join("\n"),
    },
    {
      role: "user",
      content: `Plain-English app description:\n${description}\n\nSelected modules, in canvas order:\n${modules.join(", ")}`,
    },
  ];
}

async function generateConfigWithOllamaCloud(env, description, modules) {
  if (!canUseOllama(env)) return null;
  try {
    const response = await fetch(`${ollamaHost(env)}/api/chat`, {
      method: "POST",
      headers: ollamaHeaders(env),
      body: JSON.stringify({
        model: defaultOllamaModel(env),
        messages: appConfigMessages(description, modules),
        stream: false,
        options: { temperature: 0.15, num_predict: 900 },
      }),
    });
    if (!response.ok) return null;
    return extractJsonObject(aiTextFromResult(await response.json()));
  } catch {
    return null;
  }
}

async function generateAppConfig(env, description, modules) {
  const generated = await generateConfigWithOllamaCloud(env, description, modules);
  return {
    config: sanitizeAppConfig(generated, description, modules, env),
    generated_by: generated ? "llm" : "fallback",
  };
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  const method = request.method;
  const path = url.pathname.replace(/^\/api/, "") || "/";

  if (method === "OPTIONS") return new Response(null, { status: 204 });

  if (method === "GET" && path === "/meta/models") {
    return json({ models: await availableOllamaModels(env), app_types: Object.entries(APP_TYPES).map(([id, config]) => ({ id, ...config })) });
  }

  if (method === "POST" && path === "/auth/guest") {
    const body = await parseJson(request);
    return json(await guestSession(env, body.guest_id));
  }

  if (method === "POST" && path === "/auth/register") {
    const body = await parseJson(request);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();
    if (!email || !password || password.length < 6 || !name) return error(422, "Name, email, and a password of at least 6 characters are required.");
    if (await kvGet(env, `user_email:${email}`)) return error(400, "Email already registered");
    const user_id = id("user");
    const password_salt = id("salt");
    const user = {
      user_id,
      email,
      name,
      password_salt,
      password_hash: await hashPassword(password, password_salt),
      auth_provider: "password",
      created_at: nowIso(),
    };
    await kvPut(env, `user:${user_id}`, user);
    await kvPut(env, `user_email:${email}`, { user_id });
    return json({ token: await makeToken(env, user_id), user: stripInternal(user) });
  }

  if (method === "POST" && path === "/auth/login") {
    const body = await parseJson(request);
    const email = String(body.email || "").trim().toLowerCase();
    const userRef = await kvGet(env, `user_email:${email}`);
    const user = userRef ? await kvGet(env, `user:${userRef.user_id}`) : null;
    if (!user || user.password_hash !== await hashPassword(String(body.password || ""), user.password_salt)) return error(401, "Invalid email or password");
    return json({ token: await makeToken(env, user.user_id), user: stripInternal(user) });
  }

  if (method === "POST" && path === "/auth/logout") return json({ ok: true });

  const user = await requireUser(request, env);

  if (method === "GET" && path === "/auth/me") return json(stripInternal(user));

  if (method === "POST" && path === "/apps/generate-config") {
    const body = await parseJson(request);
    const description = String(body.prompt || body.description || "").trim();
    if (!description) return error(422, "Describe the app first.");
    const modules = sanitizeAppModules(body.modules, []);
    return json(await generateAppConfig(env, description, modules));
  }

  if (method === "GET" && path === "/apps") {
    const apps = await kvList(env, `app:${user.user_id}:`);
    apps.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    for (const app of apps) {
      app.doc_count = Array.isArray(app.document_ids) ? app.document_ids.length : (await kvList(env, `doc:${app.app_id}:`)).length;
    }
    return json(apps.map(publicApp));
  }

  if (method === "POST" && path === "/apps") {
    const body = await parseJson(request);
    if (!APP_TYPES[body.app_type]) return error(422, "Unsupported app type");
    const app_id = id("app");
    const defaults = APP_TYPES[body.app_type];
    const app = {
      app_id,
      owner_id: user.user_id,
      name: String(body.name || "").trim(),
      app_type: body.app_type,
      jurisdiction: body.jurisdiction || "United Kingdom",
      system_instructions: body.system_instructions || defaults.default_instructions,
      output_format: body.output_format || defaults.default_format,
      safety_rules: body.safety_rules || "",
      model: body.model || DEFAULT_OLLAMA_MODEL,
      modules: sanitizeAppModules(body.modules),
      document_ids: [],
      created_at: nowIso(),
    };
    if (!app.name) return error(422, "App name is required");
    await kvPut(env, `app:${user.user_id}:${app_id}`, app);
    return json(app);
  }

  const appMatch = /^\/apps\/([^/]+)(?:\/(.*))?$/.exec(path);
  if (appMatch) {
    const appId = appMatch[1];
    const rest = appMatch[2] || "";
    const appKey = `app:${user.user_id}:${appId}`;
    const app = await kvGet(env, appKey);
    if (!app) return error(404, "App not found");

    if (method === "GET" && !rest) {
      return json(publicApp({ ...app, doc_count: (await documentsForApp(env, appId, app)).length }));
    }
    if (method === "PUT" && !rest) {
      const body = await parseJson(request);
      const incoming = { ...body };
      delete incoming["requires_" + "human_" + "review"];
      if ("modules" in incoming) incoming.modules = sanitizeAppModules(incoming.modules, app.modules || []);
      const updated = { ...app, ...incoming, owner_id: user.user_id, app_id: appId };
      delete updated["requires_" + "human_" + "review"];
      await kvPut(env, appKey, updated);
      return json(publicApp(updated));
    }
    if (method === "DELETE" && !rest) {
      await kvDelete(env, appKey);
      for (const item of await documentsForApp(env, appId, app)) await kvDelete(env, `doc:${appId}:${item.doc_id}`);
      for (const item of await kvList(env, `run:${appId}:`)) await kvDelete(env, `run:${appId}:${item.run_id}`);
      return json({ ok: true });
    }
    if (method === "GET" && rest === "documents") {
      let docs = await documentsForApp(env, appId, app);
      docs = await refreshFastPendingDocuments(env, appId, docs);
      docs.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      return json(docs.map(({ text, chunks, ...doc }) => doc));
    }
    if (method === "GET" && rest === "bundle-data") {
      let docs = await documentsForApp(env, appId, app);
      docs = await refreshFastPendingDocuments(env, appId, docs);
      docs.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
      return json({
        generated_at: nowIso(),
        app: publicApp({ ...app, doc_count: docs.length }),
        documents: docs.map((doc) => ({
          doc_id: doc.doc_id,
          filename: doc.filename,
          original_filename: doc.original_filename || doc.filename,
          ext: doc.ext,
          size: doc.size,
          chunk_count: doc.chunk_count || 0,
          char_count: doc.char_count || 0,
          indexed_char_count: doc.indexed_char_count || 0,
          index_truncated: Boolean(doc.index_truncated),
          text_extraction_status: doc.text_extraction_status || "UNKNOWN",
          text_extraction_message: doc.text_extraction_message || "",
          created_at: doc.created_at,
          text_preview: normalizeExtractedText(doc.text || "").slice(0, 1800),
          chunk_previews: (doc.chunks || []).slice(0, 4).map((chunk, index) => ({
            tag: `D${index + 1}`,
            ord: index,
            preview: normalizeExtractedText(chunk).slice(0, 700),
          })),
        })),
      });
    }
    if (method === "POST" && rest === "camera-ocr") {
      const form = await request.formData();
      const file = form.get("file");
      if (!file || typeof file === "string") return error(400, "Image file is required.");
      const extracted = await extractTextFromImageWithAi(env, file);
      if (!extracted || extracted.length < 5) return error(422, "Camera OCR could not read text from this image. Retake with better lighting, fill the frame with the document, or upload a searchable file.");
      const doc_id = id("doc");
      const filename = `${(file.name || `camera-${Date.now()}.jpg`).replace(/\.[^.]+$/, "")}-ocr.txt`;
      const objectKey = documentObjectKey(user.user_id, appId, doc_id, filename);
      const text = extracted.slice(0, MAX_SEARCHABLE_CHARS);
      const chunks = chunkText(text);
      if (env.DOCUMENTS_R2) {
        await env.DOCUMENTS_R2.put(objectKey, new Blob([text]).stream(), {
          httpMetadata: { contentType: "text/plain; charset=utf-8" },
          customMetadata: {
            owner_id: user.user_id,
            app_id: appId,
            doc_id,
            filename,
            uploaded_at: nowIso(),
            text_extraction_status: "OCR_EXTRACTED",
          },
        });
      }
      const doc = {
        doc_id,
        app_id: appId,
        owner_id: user.user_id,
        filename,
        original_filename: file.name || "camera.jpg",
        storage_provider: env.DOCUMENTS_R2 ? "R2" : "KV_METADATA_ONLY",
        storage_path: objectKey,
        size: text.length,
        original_size: file.size,
        ext: "txt",
        chunk_count: chunks.length,
        char_count: extracted.length,
        indexed_char_count: text.length,
        index_truncated: extracted.length > text.length,
        text_extraction_status: "OCR_EXTRACTED",
        text_extraction_message: `Camera OCR extracted ${text.length} characters and indexed them for RAG.`,
        is_deleted: false,
        created_at: nowIso(),
        text,
        chunks,
      };
      await kvPut(env, `doc:${appId}:${doc_id}`, doc);
      const documentIds = [doc_id, ...(Array.isArray(app.document_ids) ? app.document_ids : []).filter((docIdValue) => docIdValue !== doc_id)];
      await kvPut(env, appKey, { ...app, document_ids: documentIds });
      const { text: _text, chunks: _chunks, ...out } = doc;
      return json(out);
    }
    if (method === "POST" && rest === "documents") {
      const form = await request.formData();
      const file = form.get("file");
      if (!file || typeof file === "string") return error(400, "File is required");
      if (file.size > MAX_UPLOAD_BYTES) return error(400, "File too large (max 20MB).");
      const doc_id = id("doc");
      const ext = (file.name || "file").split(".").pop()?.toLowerCase() || "txt";
      const objectKey = documentObjectKey(user.user_id, appId, doc_id, file.name || `document.${ext}`);
      const queueParsing = canQueueR2Parsing(env, file);
      const extraction = queueParsing ? await fastTextFromQueuedFile(file) : await plainTextFromFile(file);
      const extractedText = normalizeExtractedText(extraction.text);
      const text = hasUsefulExtractedText(extractedText) ? extractedText.slice(0, MAX_SEARCHABLE_CHARS) : "";
      const chunks = chunkText(text);
      if (env.DOCUMENTS_R2) {
        await env.DOCUMENTS_R2.put(objectKey, file.stream(), {
          httpMetadata: { contentType: file.type || "application/octet-stream" },
          customMetadata: {
            owner_id: user.user_id,
            app_id: appId,
            doc_id,
            filename: file.name || "document",
            uploaded_at: nowIso(),
            text_extraction_status: extraction.status,
          },
        });
      }
      const doc = {
        doc_id,
        app_id: appId,
        owner_id: user.user_id,
        filename: file.name || "document.txt",
        storage_provider: env.DOCUMENTS_R2 ? "R2" : "KV_METADATA_ONLY",
        storage_path: objectKey,
        size: file.size,
        ext,
        chunk_count: chunks.length,
        char_count: extractedText.length,
        indexed_char_count: text.length,
        index_truncated: extractedText.length > text.length,
        text_extraction_status: extraction.status,
        text_extraction_message: extraction.message,
        is_deleted: false,
        created_at: nowIso(),
        text,
        chunks,
      };
      await kvPut(env, `doc:${appId}:${doc_id}`, doc);
      const documentIds = [doc_id, ...(Array.isArray(app.document_ids) ? app.document_ids : []).filter((docIdValue) => docIdValue !== doc_id)];
      await kvPut(env, appKey, { ...app, document_ids: documentIds });
      if (queueParsing) {
        try {
          await env.DOCUMENT_PARSE_QUEUE.send({
            app_id: appId,
            doc_id,
            owner_id: user.user_id,
            storage_path: objectKey,
            filename: doc.filename,
            ext,
            size: file.size,
            queued_at: nowIso(),
          });
        } catch {
          if (!chunks.length) {
            doc.text_extraction_status = "FAILED_CLOSED";
            doc.text_extraction_message = "Document stored in R2, but parser queue dispatch failed. No searchable text was indexed.";
          } else {
            doc.text_extraction_message = `${doc.text_extraction_message} Background parser queue dispatch failed, but searchable text was already indexed.`;
          }
          await kvPut(env, `doc:${appId}:${doc_id}`, doc);
        }
      }
      const { text: _text, chunks: _chunks, ...out } = doc;
      return json(out);
    }
    const docDeleteMatch = /^documents\/([^/]+)$/.exec(rest);
    if (method === "DELETE" && docDeleteMatch) {
      const existing = await kvGet(env, `doc:${appId}:${docDeleteMatch[1]}`);
      if (existing?.storage_provider === "R2" && existing.storage_path && env.DOCUMENTS_R2) {
        await env.DOCUMENTS_R2.delete(existing.storage_path);
      }
      await kvDelete(env, `doc:${appId}:${docDeleteMatch[1]}`);
      await kvPut(env, appKey, {
        ...app,
        document_ids: (Array.isArray(app.document_ids) ? app.document_ids : []).filter((docId) => docId !== docDeleteMatch[1]),
      });
      return json({ ok: true });
    }
    if (method === "POST" && rest === "run-stream") {
      const body = await parseJson(request);
      const question = String(body.question || "").trim();
      if (!question) return error(422, "Question is required");
      return streamRun(env, user, appId, app, question);
    }
    if (method === "POST" && rest === "run") {
      const body = await parseJson(request);
      const question = String(body.question || "").trim();
      if (!question) return error(422, "Question is required");
      let docs = await documentsForApp(env, appId, app);
      docs = await refreshFastPendingDocuments(env, appId, docs);
      const pendingDocs = docs.filter((doc) => ["PENDING_EXTRACTION", "PROCESSING"].includes(doc.text_extraction_status));
      const citations = selectCitations(question, docs, 8);
      const aiResult = await answerWithSelectedModel(env, app, question, citations);
      const answer = aiResult?.answer || fallbackAnswer(question, docs, pendingDocs, citations);
      const run = {
        run_id: id("run"),
        app_id: appId,
        owner_id: user.user_id,
        question,
        answer,
        citations,
        requested_model: app.model || defaultOllamaModel(env),
        model: aiResult?.model || app.model || defaultOllamaModel(env),
        model_status: aiResult?.status || "source_only_no_llm",
        started_at: nowIso(),
        finished_at: nowIso(),
      };
      return json(run);
    }
    if (method === "POST" && rest === "case-law/summarise") {
      const body = await parseJson(request);
      if (!normalizeCaseLawSourceUrl(body.url) && !normalizeCaseLawSourceUrl(body.bailii_url) && !normalizeExtractedText(body.title)) {
        return error(422, "Case title or source URL is required.");
      }
      const summary = await summariseCaseLaw(env, body, app.model || defaultOllamaModel(env), { mode: "detailed", maxTokens: 1600 });
      return json({
        run_id: id("run"),
        app_id: appId,
        owner_id: user.user_id,
        question: normalizeExtractedText(body.question || `Summarise ${body.title || body.neutral_citation || "this case"}`),
        answer: summary.answer,
        citations: [summary.citation],
        requested_model: app.model || defaultOllamaModel(env),
        model: summary.model,
        model_status: summary.status,
        source_status: summary.source.status,
        started_at: nowIso(),
        finished_at: nowIso(),
      });
    }
  }

  if (method === "GET" && path === "/case-law/search") return json(await caseLawSearch(url.searchParams.get("q") || ""));
  if (method === "GET" && path === "/case-law/latest") return json(await caseLawSearch(""));
  if (method === "POST" && path === "/case-law/summarise") {
    const body = await parseJson(request);
    if (!normalizeCaseLawSourceUrl(body.url) && !normalizeCaseLawSourceUrl(body.bailii_url) && !normalizeExtractedText(body.title)) {
      return error(422, "Case title or source URL is required.");
    }
    const summary = await summariseCaseLaw(env, body, body.model || DEFAULT_OLLAMA_MODEL, { mode: "detailed", maxTokens: 1600 });
    return json({
      answer: summary.answer,
      citation: summary.citation,
      model: summary.model,
      model_status: summary.status,
      source_status: summary.source.status,
    });
  }
  if (method === "POST" && path === "/case-law/quick-summary") {
    const body = await parseJson(request);
    if (!normalizeCaseLawSourceUrl(body.url) && !normalizeCaseLawSourceUrl(body.bailii_url) && !normalizeExtractedText(body.title)) {
      return error(422, "Case title or source URL is required.");
    }
    const summary = await summariseCaseLaw(env, body, "gpt-oss:20b-cloud", { mode: "quick", maxTokens: 240 });
    return json({
      summary: summary.answer,
      citation: summary.citation,
      model: summary.model,
      model_status: summary.status,
      source_status: summary.source.status,
    });
  }

  if (method === "GET" && path === "/pinned-cases") {
    const pins = await kvList(env, `pin:${user.user_id}:`);
    pins.sort((a, b) => String(b.pinned_at).localeCompare(String(a.pinned_at)));
    return json(pins);
  }
  if (method === "POST" && path === "/pinned-cases") {
    const body = await parseJson(request);
    const pin = { ...body, pin_id: id("pin"), owner_id: user.user_id, pinned_at: nowIso() };
    await kvPut(env, `pin:${user.user_id}:${pin.pin_id}`, pin);
    return json(pin);
  }
  const pinDelete = /^\/pinned-cases\/([^/]+)$/.exec(path);
  if (method === "DELETE" && pinDelete) {
    await kvDelete(env, `pin:${user.user_id}:${pinDelete[1]}`);
    return json({ ok: true });
  }
  if (method === "GET" && (path === "/briefs" || path === "/drafts")) {
    const briefs = await kvList(env, `brief:${user.user_id}:`);
    briefs.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    return json(briefs.map(normalizeDraftingRecord));
  }
  if (method === "POST" && path === "/drafting/generate") {
    const body = await parseJson(request);
    return json(await generateDraftingDocument(env, user, body));
  }
  if (method === "POST" && path === "/brief/generate") {
    const body = await parseJson(request);
    return json(await generateBrief(env, user, body));
  }
  if (method === "POST" && path === "/tools/camera-ocr") {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") return error(400, "Image file is required.");
    const text = await extractTextFromImageWithAi(env, file);
    if (!text || text.length < 5) return error(422, "Camera AI could not read document wording from this image. Retake with better lighting, fill the frame with the document, or choose a clearer photo.");
    return json({
      filename: file.name || "camera-photo.jpg",
      text,
      char_count: text.length,
      next_step: "analysis_ready",
    });
  }
  if (method === "POST" && path === "/tools/camera-analysis") {
    const body = await parseJson(request);
    const text = String(body.text || "").trim();
    if (!text) return error(422, "Capture or paste document wording before analysing.");
    return json({ analysis: await generateCameraAnalysis(env, text, body.source_type) });
  }
  if (method === "POST" && path === "/tools/camera-chat") {
    const body = await parseJson(request);
    const text = String(body.text || "").trim();
    const question = String(body.question || "").trim();
    if (!text || !question) return error(422, "Captured document wording and a question are required.");
    return json({ answer: await answerCameraQuestion(env, text, question) });
  }
  if (method === "GET" && path === "/tools/camera-notes") {
    const notes = await kvList(env, `camera-note:${user.user_id}:`);
    notes.sort((a, b) => String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at)));
    return json(notes);
  }
  if (method === "POST" && path === "/tools/camera-notes") {
    const body = await parseJson(request);
    const note = normalizeCameraNote(user, body);
    if (!note.captured_text && !note.analysis) return error(422, "Capture or analyse text before saving a note.");
    await kvPut(env, `camera-note:${user.user_id}:${note.note_id}`, note);
    return json(note);
  }
  const cameraNoteDelete = /^\/tools\/camera-notes\/([^/]+)$/.exec(path);
  if (method === "DELETE" && cameraNoteDelete) {
    await kvDelete(env, `camera-note:${user.user_id}:${cameraNoteDelete[1]}`);
    return json({ ok: true });
  }
  if (method === "GET" && path === "/tools/mini-models") {
    const models = await kvList(env, `mini-model:${user.user_id}:`);
    models.sort((a, b) => String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at)));
    return json(models);
  }
  if (method === "POST" && path === "/tools/mini-models") {
    const body = await parseJson(request);
    const record = normalizeMiniModelRecord(user, body);
    if (!record.source_text && !record.jsonl && !record.model_data) return error(422, "Add training data or train a mini model before saving.");
    await kvPut(env, `mini-model:${user.user_id}:${record.model_id}`, record);
    return json(record);
  }
  const miniModelDelete = /^\/tools\/mini-models\/([^/]+)$/.exec(path);
  if (method === "DELETE" && miniModelDelete) {
    await kvDelete(env, `mini-model:${user.user_id}:${miniModelDelete[1]}`);
    return json({ ok: true });
  }
  if (method === "POST" && path === "/tools/reader-ocr") {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") return error(400, "Image file is required.");
    const text = await extractTextFromImageWithAi(env, file);
    if (!text || text.length < 5) return error(422, "Guided Reader could not read text from this image. Retake with better lighting or choose a clearer photo.");
    const summary = await generateReaderSummary(env, text);
    return json({
      filename: file.name || "reader-photo.jpg",
      text,
      summary,
      char_count: text.length,
      created_at: nowIso(),
    });
  }
  if (method === "POST" && path === "/tools/reader-file") {
    const form = await request.formData();
    const file = form.get("file");
    const extracted = await textForReaderFile(file);
    if (!hasUsefulExtractedText(extracted.text)) {
      return error(422, "Guided Reader could not extract searchable text from this document. Upload a searchable PDF, DOCX, TXT, or MD file, or use Camera/Photo OCR for scanned pages.");
    }
    return json({
      ...extracted,
      char_count: extracted.text.length,
      created_at: nowIso(),
    });
  }
  if (method === "POST" && path === "/tools/reader-summary") {
    const body = await parseJson(request);
    const text = String(body.text || "").trim();
    if (!text) return error(422, "Add or capture text before summarising.");
    return json({ summary: await generateReaderSummary(env, text) });
  }
  if (method === "POST" && path === "/tools/reader-chat") {
    const body = await parseJson(request);
    const text = String(body.text || "").trim();
    const question = String(body.question || "").trim();
    if (!text || !question) return error(422, "Captured text and a question are required.");
    return json({ answer: await answerReaderQuestion(env, text, question) });
  }
  if (method === "POST" && path === "/tools/compare") {
    const form = await request.formData();
    const fileA = form.get("file_a");
    const fileB = form.get("file_b");
    const focus = String(form.get("focus") || "").trim();
    const requestedModel = String(form.get("model") || DEFAULT_OLLAMA_MODEL);
    const jurisdiction = String(form.get("jurisdiction") || "United Kingdom").trim() || "United Kingdom";
    const [a, b] = await Promise.all([textForToolFile(fileA), textForToolFile(fileB)]);
    if (a.text.length < 30 || b.text.length < 30) {
      const failures = [
        a.text.length < 30 ? `Document A (${a.filename}): ${a.parser_message || "not enough text extracted"}` : "",
        b.text.length < 30 ? `Document B (${b.filename}): ${b.parser_message || "not enough text extracted"}` : "",
      ].filter(Boolean).join(" ");
      return error(400, `${failures} Try searchable PDF, DOCX, TXT, or MD files.`);
    }
    const system = [
      `You are a ${jurisdiction} contract analyst. Compare two documents clause-by-clause.`,
      "The user message contains the complete extracted document text available to this Worker. Do not say documents were not provided.",
      "Start directly with the Markdown table header.",
      "Produce a Markdown table with columns: Topic | Document A | Document B | Material difference | Risk.",
      "After the table, summarise the 5 most important practical differences.",
      a.truncated || b.truncated ? "One or both uploaded documents were truncated for Worker limits, so state that the comparison covers the extracted portions only." : "",
    ].filter(Boolean).join(" ");
    const userMessage = [
      `# Focus (optional)\n${focus || "General comparison."}`,
      `# Document A filename\n${a.filename}`,
      `# Document A text\n<document_a>\n${a.text.slice(0, 9000)}\n</document_a>`,
      `# Document B filename\n${b.filename}`,
      `# Document B text\n<document_b>\n${b.text.slice(0, 9000)}\n</document_b>`,
    ].join("\n\n");
    let aiResult = await generateToolAnswer(env, requestedModel, system, userMessage, 1300);
    if (aiResult && looksLikeMissingDocumentRefusal(aiResult.answer)) {
      aiResult = {
        answer: fallbackCompareTable(a.text, b.text, focus),
        model: aiResult.model,
        status: `${aiResult.status}_compare_fallback`,
      };
    }
    if (!aiResult) {
      aiResult = {
        answer: fallbackCompareTable(a.text, b.text, focus),
        model: requestedModel,
        status: "rule_based_compare_fallback",
      };
    }
    const out = {
      tool_id: id("tool"),
      owner_id: user.user_id,
      kind: "compare",
      filename_a: a.filename,
      filename_b: b.filename,
      focus,
      parser_a: a.parser,
      parser_b: b.parser,
      input_truncated: a.truncated || b.truncated,
      document_a: {
        filename: a.filename,
        size: a.size,
        read_bytes: a.read_bytes,
        parser: a.parser,
        parser_message: a.parser_message,
        truncated: a.truncated,
        char_count: a.text.length,
        text_preview: a.text.slice(0, MAX_TOOL_PREVIEW_CHARS),
      },
      document_b: {
        filename: b.filename,
        size: b.size,
        read_bytes: b.read_bytes,
        parser: b.parser,
        parser_message: b.parser_message,
        truncated: b.truncated,
        char_count: b.text.length,
        text_preview: b.text.slice(0, MAX_TOOL_PREVIEW_CHARS),
      },
      requested_model: requestedModel,
      model: aiResult.model,
      model_status: aiResult.status,
      answer: aiResult.answer,
      created_at: nowIso(),
    };
    await kvPut(env, `tool:${user.user_id}:${out.tool_id}`, out);
    return json(out);
  }
  if (method === "POST" && path === "/tools/chronology") {
    const form = await request.formData();
    const files = form.getAll("files").filter((file) => file && typeof file !== "string");
    const focus = String(form.get("focus") || "").trim();
    const requestedModel = String(form.get("model") || DEFAULT_OLLAMA_MODEL);
    const jurisdiction = String(form.get("jurisdiction") || "United Kingdom").trim() || "United Kingdom";
    if (!files.length) return error(400, "Upload at least one document.");
    if (files.length > 6) return error(400, "Chronology Builder accepts up to 6 documents per run.");
    const documents = await Promise.all(files.map((file) => textForToolFile(file)));
    const empty = documents.filter((doc) => doc.text.length < 30);
    if (empty.length) {
      return error(400, `${empty.map((doc) => `${doc.filename}: ${doc.parser_message || "not enough text extracted"}`).join(" ")} Try searchable PDF, DOCX, TXT, or MD files.`);
    }
    const sourceBlocks = documents.map((doc, index) => [
      `# Document D${index + 1}: ${doc.filename}`,
      doc.truncated ? "Note: extracted text was truncated for Worker limits." : "",
      `<document id="D${index + 1}">\n${doc.text.slice(0, 7000)}\n</document>`,
    ].filter(Boolean).join("\n")).join("\n\n");
    const system = [
      `You are a ${jurisdiction} litigation chronology builder.`,
      "Use only the extracted source text supplied in the user message.",
      "Do not invent dates, events, parties, or citations.",
      "Return a complete Markdown table with columns: Date | Event | Source | Significance | Confidence.",
      "Sort dated events chronologically. Put uncertain or undated events at the end.",
      "Every row must cite the source document as [D1], [D2], etc. Include short source wording in the Event or Source cell where useful.",
      "After the table, add concise sections titled Key Gaps and Next Steps.",
      documents.some((doc) => doc.truncated) ? "Some source text was truncated; state that the chronology covers the extracted portions only." : "",
    ].filter(Boolean).join(" ");
    const userMessage = [
      `# Focus\n${focus || "Build a neutral litigation chronology from all dated events."}`,
      "# Source documents",
      sourceBlocks,
    ].join("\n\n");
    let aiResult = await generateToolAnswer(env, requestedModel, system, userMessage, 2200);
    if (!aiResult || looksLikeMissingDocumentRefusal(aiResult.answer)) {
      aiResult = {
        answer: fallbackChronology(documents, focus),
        model: requestedModel,
        status: "rule_based_chronology_fallback",
      };
    }
    const out = {
      tool_id: id("tool"),
      owner_id: user.user_id,
      kind: "chronology",
      focus,
      input_truncated: documents.some((doc) => doc.truncated),
      documents: documents.map((doc, index) => ({
        tag: `D${index + 1}`,
        filename: doc.filename,
        size: doc.size,
        read_bytes: doc.read_bytes,
        parser: doc.parser,
        parser_message: doc.parser_message,
        truncated: doc.truncated,
        char_count: doc.text.length,
        text_preview: doc.text.slice(0, MAX_TOOL_PREVIEW_CHARS),
      })),
      requested_model: requestedModel,
      model: aiResult.model,
      model_status: aiResult.status,
      answer: aiResult.answer,
      created_at: nowIso(),
    };
    await kvPut(env, `tool:${user.user_id}:${out.tool_id}`, out);
    return json(out);
  }

  return error(404, "Not found");
}

async function handleAssets(request, env) {
  const response = await env.ASSETS.fetch(request);
  if (response.status !== 404) return response;
  const url = new URL(request.url);
  if (url.pathname.includes(".") || request.method !== "GET") return response;
  return env.ASSETS.fetch(new Request(new URL("/", url), request));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/api/")) return await handleApi(request, env);
      return await handleAssets(request, env);
    } catch (err) {
      if (err instanceof Response) return err;
      return error(500, err?.message || "Internal server error");
    }
  },
};
