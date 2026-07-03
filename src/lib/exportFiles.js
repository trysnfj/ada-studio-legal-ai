export function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function fileSlug(value) {
  return String(value || "ada-studio-export")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "ada-studio-export";
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function crc32Table() {
  if (crc32Table.cache) return crc32Table.cache;
  const table = [];
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table.push(value >>> 0);
  }
  crc32Table.cache = table;
  return table;
}

function crc32(bytes) {
  const table = crc32Table();
  let crc = 0xffffffff;
  for (const byte of bytes) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value) {
  return [value & 0xff, (value >>> 8) & 0xff];
}

function u32(value) {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
}

function bytesFromString(value) {
  return Array.from(new TextEncoder().encode(String(value || "")));
}

function zipStore(files) {
  const local = [];
  const central = [];
  let offset = 0;
  for (const file of files) {
    const name = bytesFromString(file.name);
    const data = bytesFromString(file.content);
    const crc = crc32(data);
    const localHeader = [
      ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0),
      ...name,
    ];
    local.push(...localHeader, ...data);
    central.push(
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...name,
    );
    offset += localHeader.length + data.length;
  }
  const end = [
    ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length),
    ...u32(central.length), ...u32(local.length), ...u16(0),
  ];
  return new Uint8Array([...local, ...central, ...end]);
}

export function makeZipBlob(files, type = "application/zip") {
  return new Blob([zipStore(files)], { type });
}

function docxParagraphXml(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed) return '<w:p><w:r><w:t xml:space="preserve"></w:t></w:r></w:p>';
  const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed) || /^\*\*(.+?)\*\*$/.exec(trimmed);
  const text = heading ? (heading[2] || heading[1]) : trimmed;
  const style = heading ? '<w:pPr><w:pStyle w:val="Heading2"/><w:spacing w:before="240" w:after="120"/></w:pPr>' : '<w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr>';
  return `<w:p>${style}<w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${escapeHtml(text)}</w:t></w:r></w:p>`;
}

export function makeDraftingDocx(text, title = "Drafting Tool Document") {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
<w:p><w:pPr><w:pStyle w:val="Title"/><w:spacing w:after="260"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>${escapeHtml(title)}</w:t></w:r></w:p>
${String(text || "").split(/\r?\n/).map(docxParagraphXml).join("")}
<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
</w:body></w:document>`;
  const files = [
    { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>` },
    { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>` },
    { name: "docProps/core.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeHtml(title)}</dc:title><dc:creator>ADA Studio</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created></cp:coreProperties>` },
    { name: "docProps/app.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>ADA Studio</Application></Properties>` },
    { name: "word/document.xml", content: documentXml },
  ];
  return new Blob([zipStore(files)], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

function metadataRows(metadata) {
  if (!metadata) return [];
  if (Array.isArray(metadata)) return metadata.filter((item) => item?.label && item?.value !== undefined && item?.value !== null && item?.value !== "");
  return Object.entries(metadata)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([label, value]) => ({ label, value }));
}

function inlineMarkdownToHtml(value) {
  return escapeHtml(value)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/(\[S\d+\])/g, '<span class="citation">$1</span>');
}

function markdownTableToHtml(rows) {
  const parsed = rows
    .map((line) => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()))
    .filter((cells) => !cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
  if (!parsed.length) return "";
  const [head, ...body] = parsed;
  return `<table><thead><tr>${head.map((cell) => `<th>${inlineMarkdownToHtml(cell)}</th>`).join("")}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdownToHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

export function markdownishToHtml(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const parts = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    if (/^\s*\|.+\|\s*$/.test(line)) {
      const tableRows = [];
      while (index < lines.length && /^\s*\|.+\|\s*$/.test(lines[index])) {
        tableRows.push(lines[index]);
        index += 1;
      }
      index -= 1;
      parts.push(markdownTableToHtml(tableRows));
      continue;
    }
    const trimmed = line.trim();
    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed) || /^\*\*(.+?)\*\*$/.exec(trimmed);
    if (heading) {
      const text = heading[2] || heading[1];
      parts.push(`<h2>${inlineMarkdownToHtml(text)}</h2>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, ""));
        index += 1;
      }
      index -= 1;
      parts.push(`<ul>${items.map((item) => `<li>${inlineMarkdownToHtml(item)}</li>`).join("")}</ul>`);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+\.\s+/, ""));
        index += 1;
      }
      index -= 1;
      parts.push(`<ol>${items.map((item) => `<li>${inlineMarkdownToHtml(item)}</li>`).join("")}</ol>`);
      continue;
    }
    parts.push(`<p>${inlineMarkdownToHtml(line)}</p>`);
  }
  return parts.join("\n");
}

function sourceLabel(source, index) {
  return source.tag ? `[${source.tag}]` : `Source ${index + 1}`;
}

function sourceTitle(source) {
  return source.title || source.doc_name || source.filename || source.name || "Untitled source";
}

function sourceAppendixHtml(sources = []) {
  if (!sources.length) return "<p>No source appendix was available for this export.</p>";
  return `<table><thead><tr><th>Ref</th><th>Source</th><th>Status / metadata</th><th>Preview</th></tr></thead><tbody>${sources.map((source, index) => {
    const meta = [
      source.neutral_citation,
      source.status || source.text_extraction_status,
      source.chunk_count !== undefined ? `${source.chunk_count} chunks` : "",
      source.score !== undefined ? `${Math.round(Number(source.score || 0) * 100)}% match` : "",
    ].filter(Boolean).join(" / ");
    const link = source.url ? `<br><a href="${escapeHtml(source.url)}">${escapeHtml(source.url)}</a>` : "";
    return `<tr><td>${escapeHtml(sourceLabel(source, index))}</td><td>${escapeHtml(sourceTitle(source))}${link}</td><td>${escapeHtml(meta || "Recorded source")}</td><td>${escapeHtml(source.preview || source.text_preview || source.summary || "")}</td></tr>`;
  }).join("")}</tbody></table>`;
}

function exportHtml(payload, target) {
  const rows = metadataRows(payload.metadata);
  const sections = Array.isArray(payload.sections) ? payload.sections : [];
  const title = payload.title || "ADA Studio Export";
  const subtitle = payload.subtitle || "";
  const slide = target === "ppt";
  const sectionHtml = sections.map((section) => `
    <section class="export-section">
      <h2>${escapeHtml(section.title || "Section")}</h2>
      ${section.html || markdownishToHtml(section.body || "")}
    </section>
  `).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    @page{margin:0.75in}
    body{font-family:Arial,Helvetica,sans-serif;color:#17211d;line-height:1.5;margin:0;background:#fff}
    main{${slide ? "width:960px;min-height:540px;padding:38px;" : "max-width:980px;margin:0 auto;padding:44px 38px;"}}
    .cover{border-bottom:3px solid #17211d;padding-bottom:22px;margin-bottom:26px}
    .eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:.18em;color:#315dff;margin-bottom:10px}
    h1{font-family:Georgia,serif;font-size:${slide ? "34px" : "30px"};line-height:1.12;margin:0 0 10px}
    .subtitle{font-size:14px;color:#5f6772;margin:0 0 18px}
    .meta-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 16px;margin-top:18px}
    .meta-item{border:1px solid #d7dce2;padding:8px 10px;background:#f8fafb}
    .meta-label{font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#6b7280}
    .meta-value{font-size:12px;font-weight:700;margin-top:2px}
    h2{font-family:Georgia,serif;font-size:${slide ? "23px" : "20px"};margin:24px 0 10px}
    h3{font-size:14px;margin:16px 0 8px}
    p,li{font-size:${slide ? "15px" : "13px"};margin:0 0 9px}
    ul,ol{margin-top:0;padding-left:22px}
    table{border-collapse:collapse;width:100%;font-size:11px;margin:12px 0 18px;table-layout:fixed}
    th,td{border:1px solid #d7dce2;padding:8px;vertical-align:top;text-align:left;word-wrap:break-word}
    th{background:#eef3ff;color:#17211d}
    .citation{display:inline-block;border:1px solid #315dff;color:#315dff;border-radius:999px;padding:0 5px;font-size:10px;font-weight:700}
    .appendix{page-break-before:always;margin-top:28px}
    .note{border-left:3px solid #315dff;background:#f8fafb;padding:10px 12px;font-size:12px;color:#4b5563}
    a{color:#315dff}
  </style></head><body><main>
    <section class="cover">
      <div class="eyebrow">ADA Studio Export</div>
      <h1>${escapeHtml(title)}</h1>
      ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ""}
      <div class="meta-grid">${rows.map((item) => `<div class="meta-item"><div class="meta-label">${escapeHtml(item.label)}</div><div class="meta-value">${escapeHtml(item.value)}</div></div>`).join("")}</div>
    </section>
    ${sectionHtml}
    <section class="appendix">
      <h2>Source List Appendix</h2>
      ${sourceAppendixHtml(payload.sources || [])}
    </section>
    ${payload.footerNote ? `<p class="note">${escapeHtml(payload.footerNote)}</p>` : ""}
  </main></body></html>`;
}

function normalizePdfText(value) {
  return String(value || "")
    .replace(/\u00a3/g, "GBP ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ");
}

function wrapPdfLines(text, maxChars = 88) {
  const rawLines = normalizePdfText(text).split(/\r?\n/);
  const lines = [];
  for (const raw of rawLines) {
    const words = raw.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      if (`${line} ${word}`.trim().length > maxChars) {
        if (line) lines.push(line);
        line = word;
      } else {
        line = `${line} ${word}`.trim();
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function pdfEscape(value) {
  return normalizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function exportText(payload) {
  const rows = metadataRows(payload.metadata);
  const sections = Array.isArray(payload.sections) ? payload.sections : [];
  const lines = [
    payload.title || "ADA Studio Export",
    payload.subtitle || "",
    "",
    "Cover metadata",
    ...rows.map((item) => `${item.label}: ${item.value}`),
    "",
    ...sections.flatMap((section) => [
      section.title || "Section",
      "",
      section.body || "",
      "",
    ]),
    "Source List Appendix",
    "",
    ...((payload.sources || []).length ? payload.sources.map((source, index) => {
      const preview = source.preview || source.text_preview || source.summary || "";
      return `${sourceLabel(source, index)} ${sourceTitle(source)}\n${preview}`;
    }) : ["No source appendix was available for this export."]),
    "",
    payload.footerNote || "",
  ];
  return lines.filter((line) => line !== undefined && line !== null).join("\n");
}

export function makeSimplePdf(text) {
  const lines = wrapPdfLines(text);
  const pages = [];
  for (let i = 0; i < Math.max(1, Math.ceil(lines.length / 44)); i += 1) {
    pages.push(lines.slice(i * 44, i * 44 + 44));
  }
  const objects = [];
  const addObject = (body) => {
    objects.push(body);
    return objects.length;
  };
  const catalogId = addObject("<< /Type /Catalog /Pages 2 0 R >>");
  const pagesId = addObject("");
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds = [];
  for (const [pageIndex, pageLines] of pages.entries()) {
    const content = [
      "BT",
      "/F1 11 Tf",
      "50 780 Td",
      ...pageLines.map((line, index) => `${index ? "0 -16 Td " : ""}(${pdfEscape(line)}) Tj`),
      `0 -20 Td (Page ${pageIndex + 1} of ${pages.length}) Tj`,
      "ET",
    ].join("\n");
    const contentId = addObject(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefAt = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

export function downloadStructuredExport(payload, format, filenameBase) {
  const base = fileSlug(filenameBase || payload.title || "ada-studio-export");
  if (format === "pdf") {
    downloadBlob(makeSimplePdf(exportText(payload)), `${base}.pdf`);
    return;
  }
  if (format === "ppt" || format === "powerpoint") {
    downloadBlob(new Blob([exportHtml(payload, "ppt")], { type: "application/vnd.ms-powerpoint" }), `${base}.ppt`);
    return;
  }
  downloadBlob(new Blob([exportHtml(payload, "word")], { type: "application/msword" }), `${base}.doc`);
}
