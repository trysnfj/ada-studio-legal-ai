const MAX_SEARCHABLE_CHARS = 500000;
const MAX_BACKGROUND_PARSE_BYTES = 20 * 1024 * 1024;

function nowIso() {
  return new Date().toISOString();
}

async function kvGet(env, key) {
  return env.ADA_KV.get(key, "json");
}

async function kvPut(env, key, value) {
  return env.ADA_KV.put(key, JSON.stringify(value));
}

function normalizeExtractedText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function chunkText(text, size = 900, overlap = 150) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size - overlap) {
    const chunk = text.slice(i, i + size).trim();
    if (chunk) chunks.push(chunk);
  }
  return chunks;
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

function collectPdfText(raw) {
  const pieces = [];
  for (const match of raw.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj/g)) {
    pieces.push(printableText(decodePdfString(match[0].replace(/\)\s*Tj$/, "").slice(1))));
  }
  for (const match of raw.matchAll(/<([0-9A-Fa-f\s]+)>\s*Tj/g)) {
    pieces.push(printableText(decodePdfHex(match[1])));
  }
  for (const match of raw.matchAll(/\[(.*?)\]\s*TJ/gs)) {
    for (const part of match[1].matchAll(/\((?:\\.|[^\\)])*\)/g)) {
      pieces.push(printableText(decodePdfString(part[0].slice(1, -1))));
    }
    for (const part of match[1].matchAll(/<([0-9A-Fa-f\s]+)>/g)) {
      pieces.push(printableText(decodePdfHex(part[1])));
    }
  }
  return normalizeExtractedText(pieces.join(" "));
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

function flatePdfStreams(data) {
  const streamToken = asciiBytes("stream");
  const endstreamToken = asciiBytes("endstream");
  const streams = [];
  let offset = 0;
  while (offset < data.length) {
    const streamAt = indexOfBytes(data, streamToken, offset);
    if (streamAt < 0) break;
    const endstreamAt = indexOfBytes(data, endstreamToken, streamAt + streamToken.length);
    if (endstreamAt < 0) break;
    const headerStart = Math.max(0, streamAt - 700);
    const header = new TextDecoder("latin1").decode(data.slice(headerStart, streamAt));
    if (/\/FlateDecode\b/.test(header)) streams.push(pdfStreamBody(data, streamAt, endstreamAt));
    offset = endstreamAt + endstreamToken.length;
  }
  return streams;
}

async function extractPdfText(data) {
  const raw = new TextDecoder("latin1").decode(data);
  const textParts = [collectPdfText(raw)];
  for (const compressed of flatePdfStreams(data)) {
    const inflated = await inflatePdfStream(compressed);
    if (inflated) textParts.push(collectPdfText(new TextDecoder("latin1").decode(inflated)));
  }
  return normalizeExtractedText(textParts.join(" "));
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
  const entries = [];
  let offset = centralDirectoryOffset;
  while (offset + 46 <= end && u32le(data, offset) === 0x02014b50) {
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
  const entries = docxEntries(data).filter((entry) =>
    /^word\/(?:document|footnotes|endnotes|comments|header\d+|footer\d+)\.xml$/i.test(entry.name),
  );
  if (!entries.length) return extractXmlTextFromDocx(data);
  const parts = [];
  const ordered = entries.sort((a, b) => {
    if (a.name === "word/document.xml") return -1;
    if (b.name === "word/document.xml") return 1;
    return a.name.localeCompare(b.name);
  });
  for (const entry of ordered) {
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

async function extractFromR2(env, job) {
  const object = await env.DOCUMENTS_R2.get(job.storage_path);
  if (!object?.body) {
    return {
      text: "",
      status: "FAILED_CLOSED",
      message: "R2 object was unavailable to the parser. No searchable text was indexed.",
    };
  }

  const data = await readStreamPrefix(object.body, MAX_BACKGROUND_PARSE_BYTES);
  if (job.ext === "pdf") {
    const text = await extractPdfText(data);
    return {
      text,
      status: text ? "EXTRACTED_BEST_EFFORT" : "NOT_EXTRACTED",
      message: text
        ? "Background R2 parser extracted best-effort PDF text."
        : "Background R2 parser found no extractable PDF text. The original remains stored in R2.",
    };
  }
  if (job.ext === "docx") {
    const text = await extractDocxText(data);
    return {
      text,
      status: text ? "EXTRACTED_BEST_EFFORT" : "NOT_EXTRACTED",
      message: text
        ? "Background R2 parser extracted best-effort DOCX text."
        : "Background R2 parser could not extract DOCX text. The original remains stored in R2.",
    };
  }

  return {
    text: "",
    status: "FAILED_CLOSED",
    message: "Unsupported queued document type. No searchable text was indexed.",
  };
}

async function markFailedClosed(env, job, message) {
  if (!job?.app_id || !job?.doc_id) return;
  const key = `doc:${job.app_id}:${job.doc_id}`;
  const doc = await kvGet(env, key);
  if (!doc) return;
  await kvPut(env, key, {
    ...doc,
    chunk_count: 0,
    char_count: 0,
    indexed_char_count: 0,
    index_truncated: false,
    text_extraction_status: "FAILED_CLOSED",
    text_extraction_message: message,
    parsed_at: nowIso(),
    parser: "cloudflare-r2-queue",
    text: "",
    chunks: [],
  });
}

async function processDocument(env, job) {
  if (!job?.app_id || !job?.doc_id || !job?.storage_path) {
    console.log(JSON.stringify({ event: "invalid_parse_job", job }));
    return;
  }
  const key = `doc:${job.app_id}:${job.doc_id}`;
  const doc = await kvGet(env, key);
  if (!doc || doc.is_deleted) {
    console.log(JSON.stringify({ event: "parse_doc_missing", app_id: job.app_id, doc_id: job.doc_id }));
    return;
  }
  if (doc.storage_path !== job.storage_path) {
    await markFailedClosed(env, job, "Parser job did not match the stored R2 object. No searchable text was indexed.");
    return;
  }

  await kvPut(env, key, {
    ...doc,
    text_extraction_status: "PROCESSING",
    text_extraction_message: "Background R2 parser is extracting text.",
  });

  const extraction = await extractFromR2(env, job);
  const searchableText = extraction.text.slice(0, MAX_SEARCHABLE_CHARS);
  const chunks = chunkText(searchableText);
  await kvPut(env, key, {
    ...doc,
    chunk_count: chunks.length,
    char_count: extraction.text.length,
    indexed_char_count: searchableText.length,
    index_truncated: extraction.text.length > searchableText.length,
    text_extraction_status: extraction.status,
    text_extraction_message: extraction.message,
    parsed_at: nowIso(),
    parser: "cloudflare-r2-queue",
    text: searchableText,
    chunks,
  });
  const after = await kvGet(env, key);
  console.log(JSON.stringify({
    event: "parse_doc_updated",
    app_id: job.app_id,
    doc_id: job.doc_id,
    status: after?.text_extraction_status,
    chunks: after?.chunk_count,
    parsed_at: after?.parsed_at,
  }));
}

export default {
  async fetch() {
    return new Response("ADA Studio parser worker");
  },

  async queue(batch, env) {
    for (const message of batch.messages) {
      const job = typeof message.body === "string" ? JSON.parse(message.body) : message.body;
      console.log(JSON.stringify({ event: "parse_job_received", app_id: job?.app_id, doc_id: job?.doc_id, ext: job?.ext }));
      try {
        await processDocument(env, job);
        console.log(JSON.stringify({ event: "parse_job_complete", app_id: job?.app_id, doc_id: job?.doc_id }));
      } catch (err) {
        console.log(JSON.stringify({ event: "parse_job_failed", app_id: job?.app_id, doc_id: job?.doc_id, error: err?.message || "unknown parser error" }));
        await markFailedClosed(env, job, `Parser failed closed: ${err?.message || "unknown parser error"}`);
      }
    }
  },
};
