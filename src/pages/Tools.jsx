import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import Disclaimer from "../components/Disclaimer";
import { api } from "../lib/api";
import { downloadStructuredExport, makeDraftingDocx } from "../lib/exportFiles";
import {
  DRAFTING_DOCUMENT_TYPES,
  DRAFTING_EMPTY_FORM,
  DRAFTING_TONES,
  draftingFileBase,
  normalizeDraftingRecord,
  validateDraftingForm,
} from "../lib/draftingTool";
import { toast } from "sonner";
import {
  BookOpen,
  Camera,
  ClipboardList,
  ExternalLink,
  FileText,
  FileSignature,
  GitCompareArrows,
  GripVertical,
  Download,
  FolderOpen,
  Mail,
  Pause,
  Pin,
  Play,
  Plus,
  Scale,
  Search,
  Send,
  Save,
  Sparkles,
  Trash2,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const STUDIO_TABS = [
  { id: "builder", label: "Builder", icon: Sparkles },
  { id: "apps", label: "Apps", icon: FileText },
  { id: "compare", label: "Compare", icon: GitCompareArrows },
  { id: "chronology", label: "Chronology", icon: ClipboardList },
  { id: "camera", label: "Camera AI", icon: Camera },
  { id: "model-lab", label: "Model Lab", icon: Sparkles },
  { id: "reader", label: "Guided Reader", icon: BookOpen },
  { id: "case-law", label: "Case Law", icon: Scale },
  { id: "drafting-tool", label: "Drafting Tool", icon: FileSignature },
];

const FALLBACK_MODELS = [
  { id: "gpt-oss:120b-cloud", label: "Ollama Cloud · GPT-OSS 120B" },
];

const CAMERA_SOURCE_TYPES = [
  "Paper document",
  "Online document / website",
  "Slide deck notes",
  "Handwritten notes",
  "Whiteboard / classroom notes",
  "Meeting notes",
  "Other",
];

const FEATURE_BLOCKS = [
  { id: "rag", label: "RAG", desc: "Upload, chunk, index, and cite matter documents.", icon: FileText },
  { id: "caselaw", label: "Case Law", desc: "Search UK judgments and pin authorities.", icon: Scale },
  { id: "camera", label: "Camera OCR", desc: "Capture photos into the document store.", icon: Camera },
  { id: "compare", label: "Compare", desc: "Compare two versions or opposing drafts.", icon: GitCompareArrows },
  { id: "chronology", label: "Chronology", desc: "Extract dated events into a litigation timeline.", icon: ClipboardList },
  { id: "model_lab", label: "Mini Model Lab", desc: "Prepare JSONL data and train tiny browser language models.", icon: Sparkles },
  { id: "guided_reader", label: "Guided Reader", desc: "Open the saccadic guided reading tool.", icon: BookOpen },
  { id: "brief_export", label: "Bundles & Export", desc: "Export answers and matter bundles to Word, PDF, and PowerPoint.", icon: FileSignature },
  { id: "audit", label: "Audit", desc: "Include compliance metadata in app outputs.", icon: ClipboardList },
];

const APP_ICONS = {
  contract_reviewer: FileText,
  chronology_builder: ClipboardList,
  letter_generator: Mail,
  research_assistant: Search,
};

const TYPE_LABELS = {
  contract_reviewer: "Contract Reviewer",
  chronology_builder: "Chronology Builder",
  letter_generator: "Letter Generator",
  research_assistant: "Research Assistant",
};

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function compareDocumentStatus(doc) {
  if (!doc) return "No document metadata";
  return [
    doc.parser || "parser unknown",
    doc.size ? `${formatBytes(doc.size)} uploaded` : "",
    doc.read_bytes ? `${formatBytes(doc.read_bytes)} parsed` : "",
    doc.char_count ? `${doc.char_count.toLocaleString()} chars` : "",
    doc.truncated ? "extracted portion" : "",
  ].filter(Boolean).join(" / ");
}

function ToolTabs({ activeTab, onSelect }) {
  return (
    <div className="border border-gray-200 mb-6 overflow-x-auto" data-testid="studio-tab-selector">
      <div className="flex min-w-max">
        {STUDIO_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`px-4 py-3 text-sm flex items-center justify-center gap-2 border-r border-gray-200 last:border-r-0 ${
              activeTab === id ? "bg-ink text-white" : "bg-white hover:bg-gray-50"
            }`}
            data-testid={`studio-tab-${id}`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function moduleById(id) {
  return FEATURE_BLOCKS.find((block) => block.id === id);
}

function NaturalLanguageBuilder({ models }) {
  const nav = useNavigate();
  const [prompt, setPrompt] = useState("Build a UK contract review assistant for NDAs and supplier agreements. It should answer questions from uploaded contracts, highlight risky clauses, and search case law when needed.");
  const [selected, setSelected] = useState(["rag", "caselaw"]);
  const [dragId, setDragId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [config, setConfig] = useState(null);

  const addModule = (id) => {
    if (!selected.includes(id)) setSelected((items) => [...items, id]);
  };

  const moveModuleBefore = (targetId) => {
    if (!dragId || dragId === targetId || !selected.includes(dragId)) return;
    const next = selected.filter((id) => id !== dragId);
    next.splice(next.indexOf(targetId), 0, dragId);
    setSelected(next);
    setDragId(null);
  };

  const generate = async () => {
    if (!prompt.trim()) {
      toast.error("Describe the app first");
      return null;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/apps/generate-config", { prompt, modules: selected });
      setConfig(data.config);
      toast.success(data.generated_by === "fallback" ? "Generated config locally" : "Generated config with AI");
      return data.config;
    } catch (err) {
      toast.error(err.response?.data?.detail || "Config generation failed");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const createApp = async () => {
    setCreating(true);
    try {
      const nextConfig = config || await generate();
      if (!nextConfig) return;
      const { data } = await api.post("/apps", {
        ...nextConfig,
        modules: selected,
      });
      toast.success("App created");
      nav(`/apps/${data.app_id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not create app");
    } finally {
      setCreating(false);
    }
  };

  return (
    <section data-testid="studio-builder-section">
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <div className="mb-6">
            <h2 className="font-serif text-3xl tracking-tight mb-2">Natural-language app builder</h2>
            <p className="text-sm text-gray-600">Describe the legal assistant you want, drag feature blocks into the canvas, then generate the full app config from both inputs.</p>
          </div>

          <div className="border border-gray-200 p-4 sm:p-5 mb-5">
            <label className="block text-xs font-bold uppercase tracking-wider mb-2">Describe the app</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              className="w-full border border-gray-300 px-3 py-2.5 text-sm leading-relaxed focus:border-klein focus:outline-none"
              data-testid="builder-prompt"
            />
          </div>

          <div
            className="border-2 border-ink p-4 sm:p-5 min-h-[260px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId && !selected.includes(dragId)) addModule(dragId);
              setDragId(null);
            }}
            data-testid="builder-canvas"
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-klein">Canvas</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500">{selected.length} blocks</div>
            </div>
            {selected.length === 0 ? (
              <div className="border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">Drop modules here</div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {selected.map((id, index) => {
                  const block = moduleById(id);
                  if (!block) return null;
                  const Icon = block.icon;
                  return (
                    <div
                      key={id}
                      draggable
                      onDragStart={() => setDragId(id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        moveModuleBefore(id);
                      }}
                      className="border border-gray-300 bg-white p-3 flex items-start gap-3 cursor-grab active:cursor-grabbing"
                      data-testid={`builder-selected-${id}`}
                    >
                      <GripVertical size={14} className="text-gray-400 mt-0.5 shrink-0" />
                      <div className="font-mono text-[10px] text-gray-500 w-5 shrink-0">{index + 1}</div>
                      <Icon size={16} className="text-klein mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{block.label}</div>
                        <div className="text-xs text-gray-600 leading-snug">{block.desc}</div>
                      </div>
                      <button onClick={() => setSelected((items) => items.filter((item) => item !== id))} className="text-gray-400 hover:text-red-600" aria-label={`Remove ${block.label}`} data-testid={`builder-remove-${id}`}>
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={generate} disabled={busy} className="bg-ink text-white px-5 py-3 hover:bg-klein transition-colors text-sm disabled:opacity-50 inline-flex items-center gap-2" data-testid="builder-generate">
              <Sparkles size={14} /> {busy ? "Generating..." : "Generate config"}
            </button>
            <button onClick={createApp} disabled={busy || creating} className="border border-ink px-5 py-3 hover:bg-gray-50 transition-colors text-sm disabled:opacity-50 inline-flex items-center gap-2" data-testid="builder-create">
              <Plus size={14} /> {creating ? "Creating..." : "Create app"}
            </button>
          </div>

          {config && (
            <div className="mt-6 border border-gray-200 p-4 sm:p-5" data-testid="builder-config-preview">
              <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-3">Generated config</div>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div><span className="font-medium">Name:</span> {config.name}</div>
                <div><span className="font-medium">Type:</span> {TYPE_LABELS[config.app_type] || config.app_type}</div>
                <div><span className="font-medium">Jurisdiction:</span> {config.jurisdiction}</div>
                <div><span className="font-medium">Model:</span> {models.find((m) => m.id === config.model)?.label || config.model}</div>
              </div>
              <div className="mt-4 text-sm">
                <div className="font-medium mb-1">Instructions</div>
                <p className="text-gray-700 leading-relaxed">{config.system_instructions}</p>
              </div>
              <div className="mt-4 text-sm">
                <div className="font-medium mb-1">Output format</div>
                <p className="text-gray-700 leading-relaxed">{config.output_format}</p>
              </div>
            </div>
          )}
        </div>

        <aside className="lg:col-span-4">
          <div className="border border-gray-200 p-4 sticky top-24" data-testid="builder-module-palette">
            <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-3">Module palette</div>
            <div className="space-y-2">
              {FEATURE_BLOCKS.map((block) => {
                const Icon = block.icon;
                const active = selected.includes(block.id);
                return (
                  <button
                    key={block.id}
                    draggable
                    onDragStart={() => setDragId(block.id)}
                    onClick={() => addModule(block.id)}
                    className={`w-full border p-3 text-left flex gap-3 transition-colors ${active ? "border-klein bg-klein-bg" : "border-gray-200 hover:border-ink hover:bg-gray-50"}`}
                    data-testid={`builder-module-${block.id}`}
                  >
                    <Icon size={16} className={active ? "text-klein mt-0.5 shrink-0" : "text-ink mt-0.5 shrink-0"} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{block.label}</span>
                      <span className="block text-xs text-gray-600 leading-snug">{block.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function AppsPanel({ onCreate }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    api.get("/apps")
      .then((r) => setApps(r.data))
      .catch(() => setApps([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  const removeApp = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Delete this app and all its data?")) return;
    try {
      await api.delete(`/apps/${id}`);
      setApps((items) => items.filter((app) => app.app_id !== id));
      toast.success("App deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <section data-testid="studio-apps-section">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif text-3xl tracking-tight mb-2">Apps</h2>
          <p className="text-sm text-gray-600">Your generated legal assistants live in the same Studio as the tools.</p>
        </div>
        <button onClick={onCreate} className="bg-ink text-white px-5 py-2.5 hover:bg-klein transition-colors text-sm inline-flex items-center gap-2" data-testid="studio-new-app">
          <Plus size={14} /> New app
        </button>
      </div>

      {loading ? (
        <div className="font-mono text-sm text-gray-500" data-testid="loading-apps">Loading apps...</div>
      ) : apps.length === 0 ? (
        <div className="border border-dashed border-gray-300 p-12 text-center" data-testid="empty-apps">
          <div className="font-serif text-3xl mb-3">No apps yet</div>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">Describe your first legal AI assistant, add modules, and let ADA generate the config.</p>
          <button onClick={onCreate} className="inline-flex items-center gap-2 bg-ink text-white px-5 py-3 hover:bg-klein transition-colors text-sm" data-testid="empty-create-btn">
            <Plus size={16} /> Create first app
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-gray-200">
          {apps.map((app) => {
            const Icon = APP_ICONS[app.app_type] || FileText;
            return (
              <Link key={app.app_id} to={`/apps/${app.app_id}`} className="relative border-r border-b border-gray-200 p-6 hover:bg-gray-50 hover:border-ink transition-all group" data-testid={`app-card-${app.app_id}`}>
                <button onClick={(e) => removeApp(e, app.app_id)} className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`delete-app-${app.app_id}`} aria-label="Delete app"><Trash2 size={14} /></button>
                <div className="flex items-start justify-between mb-6">
                  <Icon size={22} strokeWidth={1.5} className="text-klein" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500">{TYPE_LABELS[app.app_type] || app.app_type}</span>
                </div>
                <h3 className="font-serif text-2xl mb-3 group-hover:text-klein transition-colors">{app.name}</h3>
                <div className="font-mono text-xs text-gray-500 mb-4">{app.jurisdiction} / {app.model}</div>
                <div className="flex gap-6 pt-4 border-t border-gray-200">
                  <div>
                    <div className="font-serif text-2xl">{app.doc_count ?? 0}</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Docs</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CompareTool({ models }) {
  const [model, setModel] = useState("gpt-oss:120b-cloud");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [focus, setFocus] = useState("");

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("model", model);
      if (!fileA || !fileB) {
        toast.error("Choose both documents");
        setBusy(false);
        return;
      }
      fd.append("file_a", fileA);
      fd.append("file_b", fileB);
      fd.append("focus", focus);
      const { data } = await api.post("/tools/compare", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Tool failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-testid="compare-section">
      <div className="mb-6">
        <h2 className="font-serif text-3xl tracking-tight mb-2">Compare two documents</h2>
        <p className="text-sm text-gray-600">Upload two versions and focus the comparison on the legal or drafting issues that matter. PDF, DOCX, TXT, and MD files are accepted up to 95 MB each.</p>
      </div>

      <div className="mb-6"><Disclaimer /></div>

      <div className="space-y-4" data-testid="compare-form">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1">Document A</label>
            <input type="file" accept=".pdf,.docx,.txt,.md" onChange={(e) => setFileA(e.target.files?.[0])} className="block w-full text-sm" data-testid="compare-file-a" />
            {fileA && <div className="mt-1 text-xs text-gray-500">{fileA.name} / {formatBytes(fileA.size)}</div>}
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1">Document B</label>
            <input type="file" accept=".pdf,.docx,.txt,.md" onChange={(e) => setFileB(e.target.files?.[0])} className="block w-full text-sm" data-testid="compare-file-b" />
            {fileB && <div className="mt-1 text-xs text-gray-500">{fileB.name} / {formatBytes(fileB.size)}</div>}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-1">Comparison focus (optional)</label>
          <input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="e.g. Indemnity, IP assignment, termination" className="w-full border border-gray-300 px-3 py-2.5 text-sm" data-testid="compare-focus" />
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <select value={model} onChange={(e) => setModel(e.target.value)} className="border border-gray-300 px-3 py-2.5 text-sm bg-white" data-testid="tools-model">
          {models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <button onClick={run} disabled={busy} className="bg-ink text-white px-5 py-2.5 hover:bg-klein transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2" data-testid="tools-run">
          <Sparkles size={14} /> {busy ? "Running..." : "Run comparison"}
        </button>
      </div>

      {result && (
        <div className="mt-6 border border-ink" data-testid="tools-result">
          <div className="border-b border-gray-200 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Download converted output</div>
              <div className="text-sm text-gray-700">Export this comparison as a Word, PowerPoint, or PDF file.</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => downloadToolResult(result, "word")} className="border border-gray-300 px-3 py-2 hover:border-ink hover:bg-gray-50 text-xs inline-flex items-center gap-2" data-testid="compare-download-word">
                <Download size={13} /> Word
              </button>
              <button onClick={() => downloadToolResult(result, "ppt")} className="border border-gray-300 px-3 py-2 hover:border-ink hover:bg-gray-50 text-xs inline-flex items-center gap-2" data-testid="compare-download-ppt">
                <Download size={13} /> PowerPoint
              </button>
              <button onClick={() => downloadToolResult(result, "pdf")} className="border border-gray-300 px-3 py-2 hover:border-ink hover:bg-gray-50 text-xs inline-flex items-center gap-2" data-testid="compare-download-pdf">
                <Download size={13} /> PDF
              </button>
            </div>
          </div>
          {result.document_a && result.document_b && (
            <div className="border-b border-gray-200" data-testid="compare-side-by-side">
              <div className="grid lg:grid-cols-2">
                {[["A", result.document_a], ["B", result.document_b]].map(([label, doc]) => (
                  <section key={label} className={`p-4 ${label === "A" ? "lg:border-r" : ""} border-gray-200`} data-testid={`compare-document-${label.toLowerCase()}`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-widest text-klein">Document {label}</div>
                        <h3 className="font-serif text-xl leading-tight">{doc.filename}</h3>
                      </div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500 text-right">
                        <div>{doc.parser}</div>
                        <div>{doc.size ? formatBytes(doc.size) : "size unknown"}</div>
                        <div>{(doc.char_count || 0).toLocaleString()} chars</div>
                      </div>
                    </div>
                    {doc.parser_message && (
                      <div className="mb-3 text-xs bg-blue-50 border border-blue-100 px-3 py-2 text-blue-950">{doc.parser_message}</div>
                    )}
                    {doc.truncated && (
                      <div className="mb-3 text-xs bg-yellow-50 border border-yellow-200 px-3 py-2 text-yellow-900">Preview truncated for Worker limits. The analysis covers the extracted portion.</div>
                    )}
                    <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap bg-gray-50 border border-gray-200 p-3 text-xs leading-relaxed text-gray-800">{doc.text_preview}</pre>
                  </section>
                ))}
              </div>
            </div>
          )}
          <div className="p-5 text-sm whitespace-pre-wrap leading-relaxed">{result.answer}</div>
        </div>
      )}
    </section>
  );
}

function ChronologyTool({ models }) {
  const [model, setModel] = useState("gpt-oss:120b-cloud");
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState([]);
  const [focus, setFocus] = useState("");
  const [result, setResult] = useState(null);

  const run = async () => {
    if (!files.length) {
      toast.error("Upload at least one document");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("model", model);
      fd.append("focus", focus);
      files.slice(0, 6).forEach((file) => fd.append("files", file));
      const { data } = await api.post("/tools/chronology", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Chronology failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-testid="chronology-section">
      <div className="mb-6">
        <h2 className="font-serif text-3xl tracking-tight mb-2">Chronology Builder</h2>
        <p className="text-sm text-gray-600">Upload matter documents and build a dated litigation timeline with source references. PDF, DOCX, TXT, and MD files are accepted up to 95 MB each.</p>
      </div>

      <div className="mb-6"><Disclaimer /></div>

      <div className="space-y-4" data-testid="chronology-form">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-1">Matter documents</label>
          <input
            type="file"
            accept=".pdf,.docx,.txt,.md"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 6))}
            className="block w-full text-sm"
            data-testid="chronology-files"
          />
          {files.length > 0 && (
            <div className="mt-2 border border-gray-200">
              {files.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2 border-b border-gray-200 last:border-b-0 text-xs">
                  <span className="truncate">{file.name}</span>
                  <span className="font-mono text-gray-500 shrink-0">{formatBytes(file.size)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-1">Chronology focus</label>
          <input
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="e.g. possession claim timeline, limitation dates, pre-action correspondence"
            className="w-full border border-gray-300 px-3 py-2.5 text-sm"
            data-testid="chronology-focus"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <select value={model} onChange={(e) => setModel(e.target.value)} className="border border-gray-300 px-3 py-2.5 text-sm bg-white" data-testid="chronology-model">
          {models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <button onClick={run} disabled={busy || !files.length} className="bg-ink text-white px-5 py-2.5 hover:bg-klein transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2" data-testid="chronology-run">
          <Sparkles size={14} /> {busy ? "Building..." : "Build chronology"}
        </button>
      </div>

      {result && (
        <div className="mt-6 border border-ink" data-testid="chronology-result">
          <div className="border-b border-gray-200 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Download chronology</div>
              <div className="text-sm text-gray-700">{result.model_status || "generated"} / {result.documents?.length || 0} source documents</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => downloadChronologyResult(result, "word")} className="border border-gray-300 px-3 py-2 hover:border-ink hover:bg-gray-50 text-xs inline-flex items-center gap-2" data-testid="chronology-download-word">
                <Download size={13} /> Word
              </button>
              <button onClick={() => downloadChronologyResult(result, "ppt")} className="border border-gray-300 px-3 py-2 hover:border-ink hover:bg-gray-50 text-xs inline-flex items-center gap-2" data-testid="chronology-download-ppt">
                <Download size={13} /> PowerPoint
              </button>
              <button onClick={() => downloadChronologyResult(result, "pdf")} className="border border-gray-300 px-3 py-2 hover:border-ink hover:bg-gray-50 text-xs inline-flex items-center gap-2" data-testid="chronology-download-pdf">
                <Download size={13} /> PDF
              </button>
            </div>
          </div>

          {Array.isArray(result.documents) && result.documents.length > 0 && (
            <div className="border-b border-gray-200 grid lg:grid-cols-3" data-testid="chronology-sources">
              {result.documents.map((doc) => (
                <section key={doc.tag} className="p-4 border-b lg:border-b-0 lg:border-r last:border-r-0 border-gray-200">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-klein mb-1">{doc.tag}</div>
                  <h3 className="font-serif text-lg leading-tight mb-2">{doc.filename}</h3>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-2">
                    {doc.parser} / {doc.size ? formatBytes(doc.size) : "size unknown"} / {(doc.char_count || 0).toLocaleString()} chars
                  </div>
                  {doc.truncated && <div className="mb-2 text-xs bg-yellow-50 border border-yellow-200 px-3 py-2 text-yellow-900">Extracted portion only.</div>}
                  <pre className="max-h-[220px] overflow-auto whitespace-pre-wrap bg-gray-50 border border-gray-200 p-3 text-xs leading-relaxed text-gray-800">{doc.text_preview}</pre>
                </section>
              ))}
            </div>
          )}

          <div className="p-5 text-sm whitespace-pre-wrap leading-relaxed">{result.answer}</div>
        </div>
      )}
    </section>
  );
}

export function CameraTool({ standalone = false }) {
  const cameraInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState("");
  const [filename, setFilename] = useState("");
  const [capturedText, setCapturedText] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [sourceType, setSourceType] = useState(CAMERA_SOURCE_TYPES[0]);
  const [folder, setFolder] = useState("General");
  const [noteTitle, setNoteTitle] = useState("");
  const [activeNoteId, setActiveNoteId] = useState("");
  const [savedNotes, setSavedNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);

  const savedFolders = useMemo(() => {
    const names = savedNotes.map((note) => note.folder).filter(Boolean);
    return Array.from(new Set(["General", ...names]));
  }, [savedNotes]);

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const refreshSavedNotes = async () => {
    setNotesLoading(true);
    try {
      const { data } = await api.get("/tools/camera-notes");
      setSavedNotes(Array.isArray(data) ? data : []);
    } catch {
      setSavedNotes([]);
    } finally {
      setNotesLoading(false);
    }
  };

  useEffect(() => { refreshSavedNotes(); }, []);

  const prepareCameraImage = (sourceFile) => new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(sourceFile);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxSide = 1600;
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob || sourceFile), "image/jpeg", 0.82);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(sourceFile);
    };
    img.src = url;
  });

  const clearCapture = () => {
    setImagePreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return "";
    });
    setFilename("");
    setCapturedText("");
    setAnalysis("");
    setQuestion("");
    setMessages([]);
    setNoteTitle("");
    setActiveNoteId("");
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const analyseTextValue = async (textValue = capturedText) => {
    const nextText = String(textValue || "").trim();
    if (!nextText) {
      toast.error("Capture or paste document wording first");
      return "";
    }
    setAnalysisBusy(true);
    try {
      const { data } = await api.post("/tools/camera-analysis", { text: nextText, source_type: sourceType });
      const nextAnalysis = data.analysis || "";
      setAnalysis(nextAnalysis);
      return nextAnalysis;
    } catch (err) {
      toast.error(err.response?.data?.detail || "Analysis failed");
      return "";
    } finally {
      setAnalysisBusy(false);
    }
  };

  const processPhoto = async (file) => {
    if (!file) return;
    setOcrBusy(true);
    setAnalysis("");
    setCapturedText("");
    setMessages([]);
    try {
      const prepared = await prepareCameraImage(file);
      const uploadFile = new File([prepared], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
      setImagePreview((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(prepared);
      });
      setFilename(file.name || "camera-photo.jpg");
      const fd = new FormData();
      fd.append("file", uploadFile);
      const { data } = await api.post("/tools/camera-ocr", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const text = data.text || "";
      setCapturedText(text);
      setNoteTitle((file.name || "Camera note").replace(/\.[^.]+$/, ""));
      toast.success(`Captured ${data.char_count || 0} characters from the photo`);
      if (text.trim()) {
        setAnalysis("Extracted text is ready. Generating summary, important information, next steps, and improvements...");
        void analyseTextValue(text);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Camera AI could not read this image");
    } finally {
      setOcrBusy(false);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const analyseCapturedText = async () => {
    await analyseTextValue(capturedText);
  };

  const askCameraQuestion = async () => {
    const asked = question.trim();
    if (!capturedText.trim() || !asked) {
      toast.error("Add captured text and a question first");
      return;
    }
    setChatBusy(true);
    setQuestion("");
    try {
      const { data } = await api.post("/tools/camera-chat", { text: capturedText, question: asked });
      setMessages((current) => [...current, { question: asked, answer: data.answer || "" }]);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Question failed");
      setQuestion(asked);
    } finally {
      setChatBusy(false);
    }
  };

  const copyCapturedText = async () => {
    if (!capturedText.trim()) {
      toast.error("Capture or paste document wording first");
      return;
    }
    try {
      await navigator.clipboard.writeText(capturedText);
      toast.success("Copied extracted wording");
    } catch {
      toast.error("Copy failed");
    }
  };

  const downloadCameraReport = (format) => {
    if (!capturedText.trim() && !analysis.trim() && messages.length === 0) {
      toast.error("Capture or analyse wording before exporting");
      return;
    }
    const baseName = fileSlug(filename || "camera-document-ai");
    const chatBody = messages.length
      ? messages.map((message, index) => `Q${index + 1}. ${message.question}\n\n${message.answer}`).join("\n\n")
      : "No follow-up questions have been asked yet.";
    downloadStructuredExport({
      title: "Camera Document AI Report",
      subtitle: "Standalone OCR capture, AI analysis, and document Q&A.",
      metadata: {
        "Source image": filename || "Manual text entry",
        "Source type": sourceType,
        "Folder": folder || "General",
        "Captured characters": capturedText.length.toLocaleString(),
        "Questions asked": messages.length,
        "Generated": new Date().toLocaleString(),
      },
      sections: [
        { title: "AI Analysis", body: analysis || "No AI analysis has been generated yet." },
        { title: "Extracted Wording", body: capturedText || "No extracted wording available." },
        { title: "Document Q&A", body: chatBody },
      ],
      sources: filename ? [{ tag: "C1", title: filename, preview: capturedText.slice(0, 900) }] : [],
      footerNote: "Generated by ADA Studio Camera Document AI. Verify OCR text against the original image before relying on it.",
    }, format, `camera-document-ai-${baseName}`);
  };

  const saveCameraNote = async () => {
    if (!capturedText.trim() && !analysis.trim()) {
      toast.error("Capture or analyse text before saving");
      return;
    }
    setSaveBusy(true);
    try {
      const { data } = await api.post("/tools/camera-notes", {
        note_id: activeNoteId,
        title: noteTitle || filename || "Camera note",
        folder: folder || "General",
        source_type: sourceType,
        filename,
        captured_text: capturedText,
        analysis,
        messages,
      });
      setSavedNotes((current) => [data, ...current.filter((note) => note.note_id !== data.note_id)]);
      setActiveNoteId(data.note_id || "");
      setFolder(data.folder || "General");
      setNoteTitle(data.title || "");
      toast.success("Saved camera note");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not save note");
    } finally {
      setSaveBusy(false);
    }
  };

  const loadCameraNote = (note) => {
    clearCapture();
    setFilename(note.filename || "");
    setCapturedText(note.captured_text || "");
    setAnalysis(note.analysis || "");
    setMessages(Array.isArray(note.messages) ? note.messages : []);
    setSourceType(note.source_type || CAMERA_SOURCE_TYPES[0]);
    setFolder(note.folder || "General");
    setNoteTitle(note.title || "");
    setActiveNoteId(note.note_id || "");
    toast.success("Loaded saved camera note");
  };

  const deleteCameraNote = async (noteId) => {
    try {
      await api.delete(`/tools/camera-notes/${noteId}`);
      setSavedNotes((current) => current.filter((note) => note.note_id !== noteId));
      if (activeNoteId === noteId) setActiveNoteId("");
      toast.success("Deleted saved note");
    } catch {
      toast.error("Could not delete note");
    }
  };

  return (
    <section data-testid="camera-section">
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-klein mb-2">{standalone ? "Standalone tool" : "Studio tool"}</div>
            <h2 className="font-serif text-3xl sm:text-4xl tracking-tight mb-2">Camera Document AI</h2>
            <p className="text-sm text-gray-600 max-w-3xl">Take a photo of paper documents, online screens, slide-deck notes, handwritten notes, or whiteboards. ADA extracts the wording, summarises the important information, suggests next steps, and keeps chat available.</p>
          </div>
          {!standalone && (
            <Link to="/camera" className="border border-gray-300 px-4 py-2.5 hover:border-ink hover:bg-gray-50 transition-colors text-sm inline-flex items-center gap-2 w-fit" data-testid="camera-open-standalone">
              <ExternalLink size={14} /> Open standalone
            </Link>
          )}
        </div>
      </div>
      <div className="mb-6"><Disclaimer /></div>

      <div className="border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-klein">Standalone capture</div>
            <div className="text-sm text-gray-600">Use a camera photo, screenshot, or uploaded image. OCR appears first; AI analysis runs immediately after.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="border border-gray-300 px-3 py-2.5 text-sm bg-white" data-testid="camera-source-type">
              {CAMERA_SOURCE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <button onClick={() => cameraInputRef.current?.click()} disabled={ocrBusy} className="bg-ink text-white px-4 py-2.5 hover:bg-klein transition-colors text-sm disabled:opacity-50 inline-flex items-center gap-2" data-testid="camera-take-photo">
              <Camera size={14} /> Take photo
            </button>
            <button onClick={() => photoInputRef.current?.click()} disabled={ocrBusy} className="border border-gray-300 px-4 py-2.5 hover:border-ink hover:bg-gray-50 transition-colors text-sm disabled:opacity-50 inline-flex items-center gap-2" data-testid="camera-upload-photo">
              <Upload size={14} /> Choose image
            </button>
            {(capturedText || imagePreview) && (
              <button onClick={clearCapture} disabled={ocrBusy} className="border border-gray-300 px-4 py-2.5 hover:border-ink hover:bg-gray-50 transition-colors text-sm disabled:opacity-50 inline-flex items-center gap-2" data-testid="camera-clear">
                <X size={14} /> Clear
              </button>
            )}
          </div>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => processPhoto(e.target.files?.[0])} data-testid="camera-capture-input" />
          <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={(e) => processPhoto(e.target.files?.[0])} data-testid="camera-photo-input" />
        </div>

        {ocrBusy && (
          <div className="border-b border-gray-200 p-4 font-mono text-[10px] uppercase tracking-widest text-klein animate-pulse" data-testid="camera-ocr-loading">
            Extracting wording...
          </div>
        )}

        <div className="grid lg:grid-cols-12">
          <section className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-gray-200 p-4" data-testid="camera-capture-panel">
            <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-2">Captured image</div>
            <div className="border border-gray-200 bg-gray-50 min-h-[220px] flex items-center justify-center overflow-hidden mb-4">
              {imagePreview ? (
                <img src={imagePreview} alt="Captured document" className="w-full max-h-[360px] object-contain" data-testid="camera-image-preview" />
              ) : (
                <div className="text-center p-8 text-gray-500">
                  <Camera size={34} strokeWidth={1.5} className="mx-auto mb-3" />
                  <div className="font-serif text-2xl text-ink mb-1">No photo yet</div>
                  <div className="text-sm">Take or choose a clear photo of document wording.</div>
                </div>
              )}
            </div>
            {filename && <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-4">{filename}</div>}
            <div className="flex items-center justify-between gap-3 mb-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Extracted wording</label>
              <div className="flex flex-wrap gap-2">
                <button onClick={copyCapturedText} disabled={!capturedText.trim()} className="border border-gray-300 px-3 py-1.5 hover:border-ink hover:bg-gray-50 text-xs disabled:opacity-50 inline-flex items-center gap-2" data-testid="camera-copy-text">
                  <FileText size={12} /> Copy text
                </button>
                <button onClick={analyseCapturedText} disabled={analysisBusy || !capturedText.trim()} className="border border-gray-300 px-3 py-1.5 hover:border-ink hover:bg-gray-50 text-xs disabled:opacity-50 inline-flex items-center gap-2" data-testid="camera-analyse">
                  <Sparkles size={12} /> {analysisBusy ? "Analysing..." : "Analyse"}
                </button>
              </div>
            </div>
            <textarea
              value={capturedText}
              onChange={(e) => setCapturedText(e.target.value)}
              rows={12}
              placeholder="Extracted document wording appears here. You can edit OCR mistakes before asking questions."
              className="w-full border border-gray-300 px-3 py-2.5 text-sm leading-relaxed focus:border-klein focus:outline-none"
              data-testid="camera-extracted-text"
            />
          </section>

          <section className="lg:col-span-7 p-4" data-testid="camera-ai-panel">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Standalone output</div>
                <div className="text-sm text-gray-600">Export the edited OCR text, analysis, and Q&A as a client-reviewable report.</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={saveCameraNote} disabled={saveBusy || (!capturedText.trim() && !analysis.trim())} className="bg-ink text-white px-3 py-2 hover:bg-klein text-xs disabled:opacity-50 inline-flex items-center gap-2" data-testid="camera-save-note">
                  <Save size={13} /> {saveBusy ? "Saving..." : "Save note"}
                </button>
                <button onClick={() => downloadCameraReport("word")} disabled={!capturedText.trim() && !analysis.trim() && messages.length === 0} className="border border-gray-300 px-3 py-2 hover:border-ink hover:bg-gray-50 text-xs disabled:opacity-50 inline-flex items-center gap-2" data-testid="camera-download-word">
                  <Download size={13} /> Word
                </button>
                <button onClick={() => downloadCameraReport("pdf")} disabled={!capturedText.trim() && !analysis.trim() && messages.length === 0} className="border border-gray-300 px-3 py-2 hover:border-ink hover:bg-gray-50 text-xs disabled:opacity-50 inline-flex items-center gap-2" data-testid="camera-download-pdf">
                  <Download size={13} /> PDF
                </button>
              </div>
            </div>
            <div className="mb-5">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500">AI analysis</div>
                {analysisBusy ? <span className="font-mono text-[10px] uppercase tracking-widest text-klein animate-pulse">Analysing</span> : analysis && <span className="font-mono text-[10px] uppercase tracking-widest text-klein">Ready</span>}
              </div>
              <div className="border border-gray-200 bg-gray-50 p-4 min-h-[180px] text-sm whitespace-pre-wrap leading-relaxed" data-testid="camera-analysis">
                {analysis || <span className="text-gray-500">Capture a document photo to generate an analysis, or paste wording and press Analyse.</span>}
              </div>
            </div>

            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-2">Chat with captured document</div>
              <div className="border border-gray-200 min-h-[180px] max-h-[360px] overflow-auto mb-3" data-testid="camera-chat-thread">
                {messages.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">Ask about obligations, risk, missing wording, dates, definitions, or plain-English meaning.</div>
                ) : messages.map((message, index) => (
                  <div key={`${message.question}-${index}`} className="border-b border-gray-200 last:border-b-0 p-4">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-klein mb-1">You</div>
                    <div className="text-sm mb-3">{message.question}</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-1">ADA</div>
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.answer}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !chatBusy && askCameraQuestion()}
                  placeholder="Ask about the captured wording..."
                  className="min-w-0 flex-1 border border-gray-300 px-3 py-2.5 text-sm focus:border-klein focus:outline-none"
                  data-testid="camera-question"
                />
                <button onClick={askCameraQuestion} disabled={chatBusy || !capturedText.trim() || !question.trim()} className="bg-ink text-white px-5 py-2.5 hover:bg-klein transition-colors text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2" data-testid="camera-ask">
                  <Send size={14} /> {chatBusy ? "Asking..." : "Ask"}
                </button>
              </div>
            </div>
          </section>
        </div>

        <section className="border-t border-gray-200 p-4" data-testid="camera-notes-panel">
          <div className="grid lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-2">Save to folder</div>
              <div className="grid sm:grid-cols-2 gap-2">
                <input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Note title" className="border border-gray-300 px-3 py-2.5 text-sm focus:border-klein focus:outline-none" data-testid="camera-note-title" />
                <input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="Folder, e.g. Matter notes" list="camera-folders" className="border border-gray-300 px-3 py-2.5 text-sm focus:border-klein focus:outline-none" data-testid="camera-note-folder" />
                <datalist id="camera-folders">
                  {savedFolders.map((name) => <option key={name} value={name} />)}
                </datalist>
              </div>
              <p className="text-xs text-gray-600 mt-2">Saved notes keep the OCR text, AI analysis, source type, and chat history together for later review.</p>
            </div>
            <div className="lg:col-span-7">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500 inline-flex items-center gap-2"><FolderOpen size={13} /> Saved camera notes</div>
                <button onClick={refreshSavedNotes} disabled={notesLoading} className="border border-gray-300 px-3 py-1.5 hover:border-ink hover:bg-gray-50 text-xs disabled:opacity-50" data-testid="camera-refresh-notes">{notesLoading ? "Loading..." : "Refresh"}</button>
              </div>
              <div className="border border-gray-200 max-h-[230px] overflow-auto" data-testid="camera-saved-notes">
                {savedNotes.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">No saved camera notes yet.</div>
                ) : savedNotes.map((note) => (
                  <div key={note.note_id} className="border-b border-gray-200 last:border-b-0 p-3 flex items-start justify-between gap-3">
                    <button onClick={() => loadCameraNote(note)} className="text-left min-w-0 flex-1" data-testid={`camera-load-note-${note.note_id}`}>
                      <div className="text-sm font-medium truncate">{note.title || "Camera note"}</div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500 truncate">{note.folder || "General"} / {note.source_type || "Document photo"} / {(note.captured_text || "").length.toLocaleString()} chars</div>
                    </button>
                    <button onClick={() => deleteCameraNote(note.note_id)} className="text-gray-400 hover:text-red-600 p-1" aria-label="Delete saved note" data-testid={`camera-delete-note-${note.note_id}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

const MINI_MODEL_SAMPLE = `The client says the supplier missed the delivery deadline and caused additional storage costs. The contract requires written notice before termination. The next step is to check the notice clause, preserve correspondence, and calculate the losses.`;

function tokenizeModelText(value) {
  return String(value || "").toLowerCase().match(/[a-z0-9']+|[.,;:!?]/g) || [];
}

function makeTrainingExamples(sourceText) {
  const cleaned = String(sourceText || "").replace(/\s+/g, " ").trim();
  const sentences = cleaned.split(/(?<=[.!?])\s+/).map((line) => line.trim()).filter(Boolean);
  const chunks = [];
  let current = "";
  for (const sentence of sentences) {
    if (`${current} ${sentence}`.trim().length > 900 && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = `${current} ${sentence}`.trim();
    }
  }
  if (current) chunks.push(current.trim());
  const usableChunks = (chunks.length ? chunks : cleaned ? [cleaned] : []).slice(0, 80);
  return usableChunks.map((chunk, index) => ({
    id: index + 1,
    prompt: `Summarise and extract useful next steps from source passage ${index + 1}.`,
    completion: chunk,
    messages: [
      { role: "user", content: `Summarise this source passage and identify useful next steps:\n\n${chunk}` },
      { role: "assistant", content: chunk },
    ],
  }));
}

function trainNgramModel(sourceText, order = 2) {
  const tokens = tokenizeModelText(sourceText);
  const n = Math.max(1, Math.min(3, Number(order) || 2));
  const transitions = {};
  const starts = [];
  for (let index = 0; index < tokens.length - n; index += 1) {
    const context = tokens.slice(index, index + n).join(" ");
    const next = tokens[index + n];
    transitions[context] = transitions[context] || {};
    transitions[context][next] = (transitions[context][next] || 0) + 1;
    if (index === 0 || /[.!?]/.test(tokens[index - 1])) starts.push(context);
  }
  return {
    type: "browser-ngram",
    order: n,
    vocabulary_size: new Set(tokens).size,
    token_count: tokens.length,
    transition_count: Object.keys(transitions).length,
    starts: starts.slice(0, 400),
    transitions,
    trained_at: new Date().toISOString(),
  };
}

function chooseWeighted(counts) {
  const entries = Object.entries(counts || {});
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  if (!entries.length || total <= 0) return "";
  let cursor = Math.random() * total;
  for (const [token, count] of entries) {
    cursor -= count;
    if (cursor <= 0) return token;
  }
  return entries[entries.length - 1][0];
}

function generateFromMiniModel(model, seed, maxWords = 90) {
  if (!model?.transitions) return "";
  const order = model.order || 2;
  const seedTokens = tokenizeModelText(seed);
  let context = seedTokens.slice(-order).join(" ");
  if (!model.transitions[context]) {
    context = model.starts?.[0] || Object.keys(model.transitions)[0] || "";
  }
  const output = context ? context.split(" ") : [];
  for (let index = 0; index < maxWords; index += 1) {
    const key = output.slice(-order).join(" ");
    const next = chooseWeighted(model.transitions[key]);
    if (!next) break;
    output.push(next);
    if (output.length > 24 && /[.!?]/.test(next) && Math.random() > 0.35) break;
  }
  return output.join(" ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/(^\w|\.\s+\w)/g, (match) => match.toUpperCase());
}

function MiniModelLab() {
  const [name, setName] = useState("Matter note mini model");
  const [description, setDescription] = useState("Prototype a small language model from uploaded matter notes.");
  const [sourceText, setSourceText] = useState(MINI_MODEL_SAMPLE);
  const [order, setOrder] = useState(2);
  const [dataset, setDataset] = useState([]);
  const [model, setModel] = useState(null);
  const [seed, setSeed] = useState("The next step is");
  const [sample, setSample] = useState("");
  const [chatPrompt, setChatPrompt] = useState("What should I check next?");
  const [chatMessages, setChatMessages] = useState([]);
  const [savedModels, setSavedModels] = useState([]);
  const [busy, setBusy] = useState(false);

  const stats = useMemo(() => {
    const tokens = tokenizeModelText(sourceText);
    return {
      chars: sourceText.length,
      tokens: tokens.length,
      vocabulary: new Set(tokens).size,
      examples: dataset.length,
    };
  }, [sourceText, dataset.length]);

  const refreshModels = async () => {
    try {
      const { data } = await api.get("/tools/mini-models");
      setSavedModels(Array.isArray(data) ? data : []);
    } catch {
      setSavedModels([]);
    }
  };

  useEffect(() => { refreshModels(); }, []);

  const loadTrainingFile = async (file) => {
    if (!file) return;
    const text = await file.text();
    setSourceText(text);
    setName(file.name.replace(/\.[^.]+$/, "") || "Uploaded mini model");
    setDataset([]);
    setModel(null);
    setSample("");
    setChatMessages([]);
  };

  const prepareDataset = () => {
    const examples = makeTrainingExamples(sourceText);
    if (!examples.length) {
      toast.error("Add training text before preparing data");
      return;
    }
    setDataset(examples);
    toast.success(`Prepared ${examples.length} JSONL examples`);
  };

  const train = () => {
    const trained = trainNgramModel(sourceText, order);
    if (trained.token_count < 20) {
      toast.error("Add at least 20 tokens of training text");
      return;
    }
    setModel(trained);
    const firstSample = generateFromMiniModel(trained, seed);
    setSample(firstSample);
    setChatMessages([
      {
        role: "assistant",
        content: `Model trained in the browser from ${trained.token_count.toLocaleString()} tokens and ${trained.vocabulary_size.toLocaleString()} unique terms. Ask a prompt below to test it.`,
      },
      { role: "assistant", content: firstSample },
    ]);
    toast.success("Tiny browser model trained");
  };

  const askMiniModel = () => {
    const prompt = chatPrompt.trim();
    if (!prompt) {
      toast.error("Enter a prompt to test the trained model");
      return;
    }
    if (!model?.transitions) {
      toast.error("Train or load a browser model before chatting");
      return;
    }
    const answer = generateFromMiniModel(model, prompt, 120) || "The mini model could not generate a response from that prompt. Try a phrase closer to the training text.";
    setSeed(prompt);
    setSample(answer);
    setChatMessages((current) => [
      ...current,
      { role: "user", content: prompt },
      { role: "assistant", content: answer },
    ]);
    setChatPrompt("");
  };

  const exportJsonl = () => {
    const examples = dataset.length ? dataset : makeTrainingExamples(sourceText);
    if (!examples.length) {
      toast.error("Prepare training data first");
      return;
    }
    const body = examples.map((example) => JSON.stringify({ messages: example.messages })).join("\n");
    downloadBlob(new Blob([body], { type: "application/x-ndjson" }), `${fileSlug(name)}-training-data.jsonl`);
  };

  const exportConfig = () => {
    const payload = {
      name,
      description,
      training_route: "Use exported JSONL with a Python/GPU transformer training or fine-tuning pipeline.",
      browser_model: model,
      dataset_examples: dataset.length ? dataset.length : makeTrainingExamples(sourceText).length,
      notes: [
        "Cloudflare Workers are not suitable for long-running transformer training.",
        "The in-browser model is a lightweight n-gram prototype for experimentation.",
        "For a real mini transformer, use the JSONL export with a GPU notebook or training service.",
      ],
    };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `${fileSlug(name)}-model-config.json`);
  };

  const saveModel = async () => {
    const examples = dataset.length ? dataset : makeTrainingExamples(sourceText);
    if (!model) {
      toast.error("Train the browser model before saving");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/tools/mini-models", {
        name,
        description,
        training_mode: "browser-ngram-plus-jsonl-export",
        source_text: sourceText,
        jsonl: examples.map((example) => JSON.stringify({ messages: example.messages })).join("\n"),
        stats,
        model_data: model,
        chat_messages: chatMessages,
      });
      setSavedModels((current) => [data, ...current.filter((item) => item.model_id !== data.model_id)]);
      toast.success("Saved mini model");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not save model");
    } finally {
      setBusy(false);
    }
  };

  const loadSavedModel = (record) => {
    setName(record.name || "Saved mini model");
    setDescription(record.description || "");
    setSourceText(record.source_text || "");
    setDataset(makeTrainingExamples(record.source_text || ""));
    setModel(record.model_data || null);
    const loadedSample = record.model_data?.transitions ? generateFromMiniModel(record.model_data, seed) : "";
    setSample(loadedSample);
    setChatMessages(Array.isArray(record.chat_messages) && record.chat_messages.length
      ? record.chat_messages
      : record.model_data ? [{ role: "assistant", content: `Loaded ${record.name || "saved mini model"}. Ask a prompt to test it.` }] : []);
  };

  const deleteSavedModel = async (modelId) => {
    try {
      await api.delete(`/tools/mini-models/${modelId}`);
      setSavedModels((current) => current.filter((item) => item.model_id !== modelId));
      toast.success("Deleted mini model");
    } catch {
      toast.error("Could not delete model");
    }
  };

  return (
    <section data-testid="mini-model-lab-section">
      <div className="mb-6">
        <h2 className="font-serif text-3xl tracking-tight mb-2">Mini Model Lab</h2>
        <p className="text-sm text-gray-600 max-w-3xl">Create training data from your own text, train a tiny browser language model for fast experimentation, and export JSONL/config files for a real GPU-based transformer workflow.</p>
      </div>

      <div className="mb-6 border border-klein bg-klein-bg p-4 text-sm leading-relaxed" data-testid="mini-model-reality-note">
        Training the transformer described in the referenced guide is possible, but not inside a Cloudflare Worker. It needs Python, PyTorch, and a GPU runtime. This lab prepares the data and trains a small local n-gram model in the browser so users can prototype safely before moving to GPU training.
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 border border-gray-200 p-4 sm:p-5">
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <label>
              <span className="block text-xs font-bold uppercase tracking-wider mb-1">Model name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gray-300 px-3 py-2.5 text-sm" data-testid="mini-model-name" />
            </label>
            <label>
              <span className="block text-xs font-bold uppercase tracking-wider mb-1">N-gram order</span>
              <select value={order} onChange={(e) => setOrder(Number(e.target.value))} className="w-full border border-gray-300 bg-white px-3 py-2.5 text-sm" data-testid="mini-model-order">
                <option value={1}>1 - very small</option>
                <option value={2}>2 - balanced</option>
                <option value={3}>3 - more contextual</option>
              </select>
            </label>
          </div>
          <label className="block mb-4">
            <span className="block text-xs font-bold uppercase tracking-wider mb-1">Training goal</span>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border border-gray-300 px-3 py-2.5 text-sm" data-testid="mini-model-description" />
          </label>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <label className="border border-gray-300 px-3 py-2 hover:border-ink hover:bg-gray-50 text-xs inline-flex items-center gap-2 cursor-pointer" data-testid="mini-model-upload">
              <Upload size={13} /> Upload .txt/.md/.jsonl
              <input type="file" accept=".txt,.md,.json,.jsonl,text/plain,application/json" hidden onChange={(e) => loadTrainingFile(e.target.files?.[0])} />
            </label>
            <button onClick={() => setSourceText(MINI_MODEL_SAMPLE)} className="border border-gray-300 px-3 py-2 hover:border-ink hover:bg-gray-50 text-xs">Load sample</button>
            <button onClick={() => { setSourceText(""); setDataset([]); setModel(null); setSample(""); setChatMessages([]); }} className="border border-gray-300 px-3 py-2 hover:border-ink hover:bg-gray-50 text-xs">Clear</button>
          </div>
          <textarea
            value={sourceText}
            onChange={(e) => {
              setSourceText(e.target.value);
              setDataset([]);
              setModel(null);
              setSample("");
              setChatMessages([]);
            }}
            rows={14}
            placeholder="Paste source text, notes, clauses, correspondence, or JSONL training material."
            className="w-full border border-gray-300 px-3 py-2.5 text-sm leading-relaxed focus:border-klein focus:outline-none"
            data-testid="mini-model-source"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-l border-t border-gray-200 mt-4" data-testid="mini-model-stats">
            {[
              ["Characters", stats.chars.toLocaleString()],
              ["Tokens", stats.tokens.toLocaleString()],
              ["Vocabulary", stats.vocabulary.toLocaleString()],
              ["Examples", stats.examples.toLocaleString()],
            ].map(([label, value]) => (
              <div key={label} className="border-r border-b border-gray-200 p-3">
                <div className="font-serif text-2xl">{value}</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500">{label}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={prepareDataset} className="bg-ink text-white px-4 py-2.5 hover:bg-klein text-sm inline-flex items-center gap-2" data-testid="mini-model-prepare">
              <FileText size={14} /> Prepare dataset
            </button>
            <button onClick={train} className="border border-ink px-4 py-2.5 hover:bg-gray-50 text-sm inline-flex items-center gap-2" data-testid="mini-model-train">
              <Play size={14} /> Train browser model
            </button>
            <button onClick={exportJsonl} className="border border-gray-300 px-4 py-2.5 hover:border-ink hover:bg-gray-50 text-sm inline-flex items-center gap-2" data-testid="mini-model-export-jsonl">
              <Download size={14} /> JSONL
            </button>
            <button onClick={exportConfig} className="border border-gray-300 px-4 py-2.5 hover:border-ink hover:bg-gray-50 text-sm inline-flex items-center gap-2" data-testid="mini-model-export-config">
              <Download size={14} /> Config
            </button>
            <button onClick={saveModel} disabled={busy || !model} className="border border-gray-300 px-4 py-2.5 hover:border-ink hover:bg-gray-50 text-sm disabled:opacity-50 inline-flex items-center gap-2" data-testid="mini-model-save">
              <Save size={14} /> {busy ? "Saving..." : "Save"}
            </button>
          </div>
        </section>

        <aside className="lg:col-span-5 space-y-5">
          <section className="border border-gray-200" data-testid="mini-model-generator">
            <div className="border-b border-gray-200 p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-1">Model playground</div>
                <h3 className="font-serif text-2xl leading-tight">Test your trained model</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`font-mono text-[10px] uppercase tracking-widest px-2 py-1 border ${model?.transitions ? "border-klein text-klein bg-klein-bg" : "border-gray-200 text-gray-500 bg-gray-50"}`} data-testid="mini-model-status">
                    {model?.transitions ? "Ready to chat" : "Train a model first"}
                  </span>
                  {model?.token_count ? <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 border border-gray-200 text-gray-500">{model.token_count.toLocaleString()} tokens</span> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setChatMessages([])} disabled={!chatMessages.length} className="border border-gray-300 px-3 py-2 hover:border-ink hover:bg-gray-50 text-xs disabled:opacity-50" data-testid="mini-model-clear-chat">Clear</button>
                <button onClick={saveModel} disabled={busy || !model} className="bg-ink text-white px-3 py-2 hover:bg-klein text-xs disabled:opacity-50 inline-flex items-center gap-2" data-testid="mini-model-save-playground">
                  <Save size={13} /> {busy ? "Saving..." : "Save model"}
                </button>
              </div>
            </div>

            <div className="p-4">
              <div className="border border-gray-200 bg-gray-50 min-h-[300px] max-h-[420px] overflow-auto p-3 space-y-3" data-testid="mini-model-chat-thread">
                {chatMessages.length === 0 ? (
                  <div className="h-[260px] flex items-center justify-center text-center text-sm text-gray-500 px-6">
                    Train the browser model, then use this chat-style playground to test prompts and save the working model.
                  </div>
                ) : chatMessages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[88%] border px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${message.role === "user" ? "bg-ink text-white border-ink" : "bg-white text-ink border-gray-200"}`} data-testid={`mini-model-message-${message.role}`}>
                      {message.content}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 border border-gray-300 bg-white p-2">
                <textarea
                  value={chatPrompt}
                  onChange={(e) => setChatPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      askMiniModel();
                    }
                  }}
                  rows={3}
                  placeholder="Message your trained mini model..."
                  className="w-full resize-none border-0 px-2 py-2 text-sm leading-relaxed focus:outline-none"
                  data-testid="mini-model-chat-input"
                />
                <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-2">
                  <div className="text-[11px] text-gray-500">Enter sends, Shift+Enter adds a line.</div>
                  <button onClick={askMiniModel} disabled={!model?.transitions || !chatPrompt.trim()} className="bg-ink text-white px-4 py-2 hover:bg-klein text-sm disabled:opacity-50 inline-flex items-center gap-2" data-testid="mini-model-chat-send">
                    <Send size={14} /> Send
                  </button>
                </div>
              </div>

              <div className="mt-3 border border-gray-200 bg-white p-3 text-sm whitespace-pre-wrap leading-relaxed" data-testid="mini-model-sample">
                {sample || "The latest generated response will appear here after the model answers."}
              </div>
            </div>
          </section>

          <section className="border border-gray-200 p-4" data-testid="mini-model-saved">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500 inline-flex items-center gap-2"><FolderOpen size={13} /> Saved mini models</div>
              <button onClick={refreshModels} className="border border-gray-300 px-3 py-1.5 hover:border-ink hover:bg-gray-50 text-xs">Refresh</button>
            </div>
            <div className="border border-gray-200 max-h-[320px] overflow-auto">
              {savedModels.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">No saved mini models yet.</div>
              ) : savedModels.map((record) => (
                <div key={record.model_id} className="border-b border-gray-200 last:border-b-0 p-3 flex items-start justify-between gap-3">
                  <button onClick={() => loadSavedModel(record)} className="text-left min-w-0 flex-1" data-testid={`mini-model-load-${record.model_id}`}>
                    <div className="text-sm font-medium truncate">{record.name || "Mini model"}</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500 truncate">
                      {record.training_mode || "browser-ngram"} / {(record.stats?.tokens || record.model_data?.token_count || 0).toLocaleString()} tokens
                    </div>
                  </button>
                  <button onClick={() => deleteSavedModel(record.model_id)} className="text-gray-400 hover:text-red-600 p-1" aria-label="Delete mini model" data-testid={`mini-model-delete-${record.model_id}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

const READER_SAMPLE = `This supplier agreement requires unlimited liability from the customer. The supplier may terminate without notice. The agreement does not state governing law or jurisdiction. Confidential information may be disclosed to affiliates without restrictions.`;

const READER_BACKGROUNDS = [
  { label: "White", value: "#ffffff" },
  { label: "Soft blue", value: "#eef6ff" },
  { label: "Soft green", value: "#eefaf3" },
  { label: "Soft rose", value: "#fff1f5" },
  { label: "Soft grey", value: "#f7f7f8" },
];

function splitWordParts(token) {
  const match = /^(\W*)([\p{L}\p{N}][\p{L}\p{N}'-]*)(\W*)$/u.exec(token);
  return match ? { before: match[1], word: match[2], after: match[3] } : null;
}

function renderGuidedToken(token, index, settings) {
  if (/^\s+$/.test(token)) return token;
  const parts = splitWordParts(token);
  if (!parts || parts.word.length < settings.minLength || !settings.emphasise) return <span key={index}>{token}</span>;
  const splitAt = Math.max(1, Math.ceil(parts.word.length * settings.portion));
  const lead = parts.word.slice(0, splitAt);
  const tail = parts.word.slice(splitAt);
  const leadClass = settings.mode === "micro-space" ? "font-bold text-klein" : "font-bold text-ink";
  return (
    <span key={index}>
      {parts.before}
      <span className={leadClass}>{lead}</span>
      {settings.mode === "micro-space" && tail ? <span className="inline-block w-[0.08em]" aria-hidden="true" /> : null}
      {tail}
      {parts.after}
    </span>
  );
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function guidedHtmlFromText(value, settings) {
  return String(value || "").split(/(\s+)/).map((token) => {
    if (/^\s+$/.test(token)) return escapeHtml(token);
    const parts = splitWordParts(token);
    if (!parts || parts.word.length < settings.minLength || !settings.emphasise) return escapeHtml(token);
    const splitAt = Math.max(1, Math.ceil(parts.word.length * settings.portion));
    const lead = escapeHtml(parts.word.slice(0, splitAt));
    const tail = escapeHtml(parts.word.slice(splitAt));
    const spacer = settings.mode === "micro-space" && tail ? `<span style="letter-spacing:.08em"></span>` : "";
    return `${escapeHtml(parts.before)}<strong>${lead}</strong>${spacer}${tail}${escapeHtml(parts.after)}`;
  }).join("");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function wrapPdfLines(text, maxChars = 84) {
  const words = String(text || "").replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ").split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (!word) continue;
    if (`${line} ${word}`.trim().length > maxChars) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

function makeSimplePdf(text) {
  const lines = wrapPdfLines(text);
  const pages = [];
  for (let i = 0; i < Math.max(1, Math.ceil(lines.length / 42)); i += 1) pages.push(lines.slice(i * 42, i * 42 + 42));
  const objects = [];
  const addObject = (body) => {
    objects.push(body);
    return objects.length;
  };
  const catalogId = addObject("<< /Type /Catalog /Pages 2 0 R >>");
  const pagesId = addObject("");
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds = [];
  for (const pageLines of pages) {
    const content = ["BT", "/F1 12 Tf", "50 780 Td", ...pageLines.map((line, index) => `${index ? "0 -16 Td " : ""}(${line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")}) Tj`), "ET"].join("\n");
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

function fileSlug(value) {
  return String(value || "ada-studio-export")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "ada-studio-export";
}

function markdownTableToHtml(rows) {
  const parsed = rows
    .map((line) => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()))
    .filter((cells) => !cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
  if (!parsed.length) return "";
  const [head, ...body] = parsed;
  return `<table><thead><tr>${head.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function markdownishToHtml(markdown) {
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
    const heading = /^#{1,3}\s+(.+)$/.exec(trimmed) || /^\*\*(.+?)\*\*$/.exec(trimmed);
    if (heading) {
      parts.push(`<h2>${escapeHtml(heading[1])}</h2>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, ""));
        index += 1;
      }
      index -= 1;
      parts.push(`<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`);
      continue;
    }
    parts.push(`<p>${escapeHtml(line).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</p>`);
  }
  return parts.join("\n");
}

function toolExportTitle(result) {
  return `Comparison - ${result.filename_a || "Document A"} vs ${result.filename_b || "Document B"}`;
}

function comparedDocumentExportBlock(label, doc, fallbackName) {
  if (!doc) return "";
  return [
    `Document ${label}`,
    `${doc.filename || fallbackName || `Document ${label}`}`,
    compareDocumentStatus(doc),
    doc.parser_message || "",
    doc.truncated ? "Note: this export contains the extracted portion used by the comparison." : "",
    "",
    doc.text_preview || "",
  ].filter((line) => line !== undefined && line !== null).join("\n");
}

function toolExportText(result) {
  const lines = [
    toolExportTitle(result),
    "",
    `Generated: ${new Date(result.created_at || Date.now()).toLocaleString()}`,
    `Model: ${result.model || "unknown"} (${result.model_status || "unknown"})`,
    result.focus ? `Focus: ${result.focus}` : "",
    "",
    "Analysis",
    "",
    result.answer || "",
  ].filter(Boolean);
  if (result.document_a && result.document_b) {
    lines.push(
      "",
      comparedDocumentExportBlock("A", result.document_a, result.filename_a),
      "",
      comparedDocumentExportBlock("B", result.document_b, result.filename_b),
    );
  }
  return lines.join("\n");
}

function toolExportHtml(result, target) {
  const title = toolExportTitle(result);
  const metadata = [
    `Generated: ${new Date(result.created_at || Date.now()).toLocaleString()}`,
    `Model: ${result.model || "unknown"} (${result.model_status || "unknown"})`,
    result.focus ? `Focus: ${result.focus}` : "",
  ].filter(Boolean);
  const sourceHtml = result.document_a && result.document_b
    ? `<h2>Side-by-side source text</h2><div class="compare"><section><h3>Document A</h3><p class="meta">${escapeHtml(result.document_a.filename || result.filename_a || "Document A")}</p><pre>${escapeHtml(result.document_a.text_preview || "")}</pre></section><section><h3>Document B</h3><p class="meta">${escapeHtml(result.document_b.filename || result.filename_b || "Document B")}</p><pre>${escapeHtml(result.document_b.text_preview || "")}</pre></section></div>`
    : "";
  const slideClass = target === "ppt" ? "slide" : "document";
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    body{font-family:Arial,Helvetica,sans-serif;color:#17211d;line-height:1.5;margin:0;background:#fff}
    .${slideClass}{padding:42px;${target === "ppt" ? "width:960px;min-height:540px;" : "max-width:980px;margin:0 auto;"}}
    h1{font-size:${target === "ppt" ? "34px" : "28px"};margin:0 0 14px;font-family:Georgia,serif}
    h2{font-size:18px;margin:24px 0 10px}
    h3{font-size:14px;margin:0 0 8px}
    .meta{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#5f6772;margin:0 0 16px}
    table{border-collapse:collapse;width:100%;font-size:12px;margin:14px 0}
    th,td{border:1px solid #d7dce2;padding:8px;vertical-align:top;text-align:left}
    th{background:#f3f6f8}
    .compare{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:12px}
    pre{white-space:pre-wrap;border:1px solid #d7dce2;background:#f8fafb;padding:12px;max-height:${target === "ppt" ? "250px" : "520px"};overflow:hidden;font-size:11px}
    p,li{font-size:${target === "ppt" ? "15px" : "13px"}}
  </style></head><body><main class="${slideClass}"><h1>${escapeHtml(title)}</h1><p class="meta">${metadata.map(escapeHtml).join(" / ")}</p><h2>Analysis</h2>${markdownishToHtml(result.answer || "")}${sourceHtml}</main></body></html>`;
}

function downloadToolResult(result, format) {
  const title = toolExportTitle(result);
  const sources = [result.document_a, result.document_b].filter(Boolean).map((doc, index) => ({
    tag: index === 0 ? "A" : "B",
    title: doc.filename || (index === 0 ? result.filename_a : result.filename_b) || `Document ${index + 1}`,
    status: compareDocumentStatus(doc),
    preview: doc.text_preview || "",
  }));
  downloadStructuredExport({
    title,
    subtitle: "Document comparison export",
    metadata: {
      Generated: new Date(result.created_at || Date.now()).toLocaleString(),
      Model: `${result.model || "unknown"} (${result.model_status || "unknown"})`,
      Focus: result.focus || "General comparison",
      Sources: sources.length,
      "Document A": result.document_a ? compareDocumentStatus(result.document_a) : "",
      "Document B": result.document_b ? compareDocumentStatus(result.document_b) : "",
    },
    sections: [
      { title: "Comparison Analysis", body: result.answer || "" },
      { title: "Compared Document Extracts", body: [
        comparedDocumentExportBlock("A", result.document_a, result.filename_a),
        comparedDocumentExportBlock("B", result.document_b, result.filename_b),
      ].filter(Boolean).join("\n\n") },
    ],
    sources,
    footerNote: "Generated by ADA Studio. Verify all source text and citations before relying on this export.",
  }, format, title);
}

function chronologyExportTitle(result) {
  return `Chronology - ${result.documents?.[0]?.filename || "Matter timeline"}`;
}

function downloadChronologyResult(result, format) {
  const title = chronologyExportTitle(result);
  const sources = (result.documents || []).map((doc) => ({
    tag: doc.tag,
    title: doc.filename,
    status: compareDocumentStatus(doc),
    preview: doc.text_preview || "",
  }));
  downloadStructuredExport({
    title,
    subtitle: "Chronology Builder export",
    metadata: {
      Generated: new Date(result.created_at || Date.now()).toLocaleString(),
      Model: `${result.model || "unknown"} (${result.model_status || "unknown"})`,
      Focus: result.focus || "General chronology",
      Sources: sources.length,
      Truncated: result.input_truncated ? "Yes" : "No",
    },
    sections: [
      { title: "Chronology", body: result.answer || "" },
      { title: "Source Extracts", body: (result.documents || []).map((doc) => [
        `${doc.tag || "D?"} - ${doc.filename}`,
        compareDocumentStatus(doc),
        doc.parser_message || "",
        doc.truncated ? "Note: this export contains the extracted portion used by the chronology." : "",
        "",
        doc.text_preview || "",
      ].filter(Boolean).join("\n")).join("\n\n") },
    ],
    sources,
    footerNote: "Generated by ADA Studio. Verify every dated event against the original source documents before relying on this chronology.",
  }, format, title);
}

function GuidedReaderTool() {
  const readerUrl = "https://saccadic-guided-reader.nadia-cd96.workers.dev/#reader-app";
  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [text, setText] = useState(READER_SAMPLE);
  const [viewMode, setViewMode] = useState("guided");
  const [emphasisMode, setEmphasisMode] = useState("bold-first");
  const [emphasise, setEmphasise] = useState(true);
  const [portion, setPortion] = useState(0.5);
  const [minLength, setMinLength] = useState(3);
  const [fontScale, setFontScale] = useState(108);
  const [background, setBackground] = useState("#ffffff");
  const [highContrast, setHighContrast] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pace, setPace] = useState(260);
  const [readerFileBusy, setReaderFileBusy] = useState(false);
  const [readerSource, setReaderSource] = useState(null);
  const [readerOcrBusy, setReaderOcrBusy] = useState(false);
  const [readerSummary, setReaderSummary] = useState("");
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [readerQuestion, setReaderQuestion] = useState("");
  const [readerAnswer, setReaderAnswer] = useState("");
  const [readerChatBusy, setReaderChatBusy] = useState(false);

  const tokens = useMemo(() => text.split(/(\s+)/), [text]);
  const words = useMemo(() => text.match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) || [], [text]);
  const safeWordIndex = Math.min(wordIndex, Math.max(0, words.length - 1));
  const currentWord = words[safeWordIndex] || "Ready";

  useEffect(() => {
    if (wordIndex > Math.max(0, words.length - 1)) setWordIndex(Math.max(0, words.length - 1));
  }, [wordIndex, words.length]);

  useEffect(() => {
    if (!playing || !words.length) return undefined;
    const timer = setInterval(() => {
      setWordIndex((index) => {
        if (index >= words.length - 1) {
          setPlaying(false);
          return index;
        }
        return index + 1;
      });
    }, pace);
    return () => clearInterval(timer);
  }, [playing, pace, words.length]);

  const settings = { emphasise: viewMode === "guided" && emphasise, mode: emphasisMode, portion, minLength };
  const readerClass = highContrast ? "bg-ink text-white" : "text-ink";

  const loadFile = async (file) => {
    if (!file) return;
    setReaderFileBusy(true);
    setPlaying(false);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/tools/reader-file", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setText(data.text || "");
      setReaderSource({
        filename: data.filename || file.name || "Uploaded document",
        parser: data.parser || "document parser",
        parser_message: data.parser_message || "",
        size: data.size || file.size,
        read_bytes: data.read_bytes,
        char_count: data.char_count || (data.text || "").length,
        truncated: Boolean(data.truncated),
      });
      setWordIndex(0);
      setReaderSummary("");
      setReaderAnswer("");
      toast.success(`Loaded ${data.char_count || 0} document characters into Guided Reader`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Document extraction failed");
    } finally {
      setReaderFileBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const loadImageWithOcr = async (file) => {
    if (!file) return;
    setReaderOcrBusy(true);
    setPlaying(false);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/tools/reader-ocr", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setText(data.text || "");
      setReaderSource({
        filename: data.filename || file.name || "Reader photo",
        parser: "camera-ocr",
        parser_message: "Text extracted from uploaded image.",
        size: file.size,
        char_count: data.char_count || (data.text || "").length,
        truncated: false,
      });
      setReaderSummary(data.summary || "");
      setReaderAnswer("");
      setWordIndex(0);
      toast.success(`Loaded ${data.char_count || 0} OCR characters into Guided Reader`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Reader OCR failed");
    } finally {
      setReaderOcrBusy(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const summariseReaderText = async () => {
    if (!text.trim()) {
      toast.error("Add or capture text first");
      return;
    }
    setSummaryBusy(true);
    try {
      const { data } = await api.post("/tools/reader-summary", { text });
      setReaderSummary(data.summary || "");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Summary failed");
    } finally {
      setSummaryBusy(false);
    }
  };

  const askReader = async () => {
    if (!text.trim() || !readerQuestion.trim()) {
      toast.error("Add captured text and a question first");
      return;
    }
    setReaderChatBusy(true);
    try {
      const { data } = await api.post("/tools/reader-chat", { text, question: readerQuestion });
      setReaderAnswer(data.answer || "");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Question failed");
    } finally {
      setReaderChatBusy(false);
    }
  };

  const downloadReaderDocument = (format) => {
    if (!text.trim()) {
      toast.error("Add text before downloading");
      return;
    }
    const exportSettings = { ...settings, emphasise: viewMode === "guided" && emphasise };
    const guidedHtml = guidedHtmlFromText(text, exportSettings).replace(/\n/g, "<br />");
    const source = readerSource || {
      filename: "Manual guided reader text",
      parser: "manual-entry",
      char_count: text.length,
      parser_message: "Text entered directly into Guided Reader.",
    };
    downloadStructuredExport({
      title: "Guided Reader Export",
      subtitle: "Reader-friendly legal document export",
      metadata: {
        Generated: new Date().toLocaleString(),
        Source: source.filename,
        Parser: source.parser,
        Characters: source.char_count || text.length,
        "Reader mode": viewMode,
        "Emphasis mode": emphasisMode,
        Truncated: source.truncated ? "Yes" : "No",
      },
      sections: [
        {
          title: "Guided Reader Text",
          body: text,
          html: `<p>${guidedHtml}</p>`,
        },
        readerSummary ? { title: "AI Summary", body: readerSummary } : null,
        readerAnswer ? { title: "Reader Q&A", body: `Question: ${readerQuestion || "Reader question"}\n\nAnswer:\n${readerAnswer}` } : null,
      ].filter(Boolean),
      sources: [{
        tag: "R1",
        title: source.filename,
        status: [source.parser, source.parser_message, source.truncated ? "truncated" : ""].filter(Boolean).join(" / "),
        preview: text.slice(0, 900),
      }],
      footerNote: "Generated by ADA Studio Guided Reader. Verify extracted text against the original document before relying on it.",
    }, format, "guided-reader-document");
  };

  return (
    <section data-testid="guided-reader-section">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif text-3xl tracking-tight mb-2">Guided Reader</h2>
          <p className="text-sm text-gray-600">Read dense legal text with ADA-styled emphasis, contrast, and paced focus controls.</p>
        </div>
        <a href={readerUrl} target="_blank" rel="noreferrer" className="border border-gray-300 px-4 py-2.5 hover:border-ink hover:bg-gray-50 transition-colors text-sm inline-flex items-center gap-2">
          Open original <ExternalLink size={13} />
        </a>
      </div>

      <div className="grid lg:grid-cols-12 gap-0 border border-gray-200 bg-white" data-testid="native-guided-reader">
        <aside className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-gray-200 p-4 sm:p-5 bg-gray-50">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Source text</div>
            <div className="flex flex-wrap justify-end gap-2">
              <button onClick={() => fileInputRef.current?.click()} disabled={readerFileBusy} className="border border-gray-300 px-3 py-2 hover:border-ink hover:bg-white text-xs inline-flex items-center gap-2 disabled:opacity-50" data-testid="reader-upload">
                <Upload size={13} /> {readerFileBusy ? "Extracting" : "Upload"}
              </button>
              <button onClick={() => cameraInputRef.current?.click()} disabled={readerOcrBusy} className="border border-gray-300 px-3 py-2 hover:border-ink hover:bg-white text-xs inline-flex items-center gap-2 disabled:opacity-50" data-testid="reader-camera">
                <Camera size={13} /> Camera
              </button>
              <button onClick={() => photoInputRef.current?.click()} disabled={readerOcrBusy} className="border border-gray-300 px-3 py-2 hover:border-ink hover:bg-white text-xs inline-flex items-center gap-2 disabled:opacity-50" data-testid="reader-photo">
                <FileText size={13} /> Photo
              </button>
                <button onClick={() => { setText(READER_SAMPLE); setReaderSource({ filename: "Guided Reader sample", parser: "sample", char_count: READER_SAMPLE.length, truncated: false }); setReaderSummary(""); setReaderAnswer(""); setWordIndex(0); setPlaying(false); }} className="border border-gray-300 px-3 py-2 hover:border-ink hover:bg-white text-xs" data-testid="reader-sample">
                Sample
              </button>
              <button onClick={() => { setText(""); setReaderSource(null); setReaderSummary(""); setReaderAnswer(""); setWordIndex(0); setPlaying(false); }} className="border border-gray-300 px-3 py-2 hover:border-ink hover:bg-white text-xs inline-flex items-center gap-2" data-testid="reader-clear">
                <X size={13} /> Clear
              </button>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept=".txt,.md,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={(e) => loadFile(e.target.files?.[0])} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => loadImageWithOcr(e.target.files?.[0])} />
          <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={(e) => loadImageWithOcr(e.target.files?.[0])} />
          {readerFileBusy && <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-klein animate-pulse" data-testid="reader-file-loading">Extracting document text...</div>}
          {readerOcrBusy && <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-klein animate-pulse" data-testid="reader-ocr-loading">Extracting image text...</div>}
          {readerSource && !readerFileBusy && (
            <div className="mb-3 border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600" data-testid="reader-source-meta">
              <span className="font-semibold text-ink">{readerSource.filename}</span>
              <span className="mx-2 text-gray-300">/</span>
              <span>{readerSource.parser}</span>
              <span className="mx-2 text-gray-300">/</span>
              <span>{formatBytes(readerSource.size || 0)} uploaded</span>
              <span className="mx-2 text-gray-300">/</span>
              <span>{readerSource.char_count || text.length} chars</span>
              {readerSource.truncated ? <span className="ml-2 text-klein">truncated</span> : null}
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setReaderSource({ filename: "Edited guided reader text", parser: "manual-edit", char_count: e.target.value.length, truncated: false }); setReaderSummary(""); setReaderAnswer(""); setWordIndex(0); setPlaying(false); }}
            rows={13}
            className="w-full border border-gray-300 bg-white px-3 py-2.5 text-sm leading-relaxed focus:border-klein focus:outline-none resize-y"
            placeholder="Paste legal text here..."
            data-testid="reader-source-text"
          />

          <div className="mt-5 grid sm:grid-cols-2 gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-2">Mode</div>
              <div className="grid grid-cols-2 border border-gray-300">
                {["guided", "original"].map((id) => (
                  <button key={id} onClick={() => setViewMode(id)} className={`px-3 py-2 text-xs capitalize border-r border-gray-300 last:border-r-0 ${viewMode === id ? "bg-ink text-white" : "bg-white hover:bg-gray-50"}`} data-testid={`reader-mode-${id}`}>
                    {id}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-2 block">Emphasis</label>
              <select value={emphasisMode} onChange={(e) => setEmphasisMode(e.target.value)} className="w-full border border-gray-300 bg-white px-3 py-2 text-xs" data-testid="reader-emphasis-mode">
                <option value="bold-first">Bold first letters</option>
                <option value="micro-space">Micro spaced lead</option>
              </select>
            </div>
          </div>

          <div className="mt-4 space-y-3 text-xs">
            <label className="flex items-center justify-between gap-3 text-ink">
              <span className="flex items-center gap-2"><input type="checkbox" checked={emphasise} onChange={(e) => setEmphasise(e.target.checked)} /> Emphasise words</span>
              <span className="font-mono text-gray-500">{Math.round(portion * 100)}%</span>
            </label>
            <input type="range" min="0.25" max="0.75" step="0.05" value={portion} onChange={(e) => setPortion(Number(e.target.value))} className="w-full accent-black" aria-label="Emphasis portion" />
            <label className="flex items-center justify-between gap-3 text-ink">
              <span>Minimum word length</span>
              <span className="font-mono text-gray-500">{minLength}</span>
            </label>
            <input type="range" min="2" max="8" step="1" value={minLength} onChange={(e) => setMinLength(Number(e.target.value))} className="w-full accent-black" aria-label="Minimum word length" />
            <label className="flex items-center justify-between gap-3 text-ink">
              <span>Text size</span>
              <span className="font-mono text-gray-500">{fontScale}%</span>
            </label>
            <input type="range" min="90" max="140" step="5" value={fontScale} onChange={(e) => setFontScale(Number(e.target.value))} className="w-full accent-black" aria-label="Reader text size" />
          </div>
        </aside>

        <div className="lg:col-span-8 flex flex-col min-h-[620px]">
          <div className="border-b border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-1">Paced reader</div>
              <div className="font-serif text-3xl leading-tight" data-testid="reader-current-word">
                {viewMode === "guided" ? renderGuidedToken(currentWord, "current", settings) : currentWord}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setWordIndex((index) => Math.max(0, index - 1))} className="border border-gray-300 w-10 h-10 grid place-items-center hover:border-ink hover:bg-gray-50" aria-label="Previous word" data-testid="reader-prev">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPlaying((value) => !value)} disabled={!words.length} className="bg-ink text-white w-10 h-10 grid place-items-center hover:bg-klein disabled:opacity-50" aria-label={playing ? "Pause reader" : "Play reader"} data-testid="reader-play">
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button onClick={() => setWordIndex((index) => Math.min(Math.max(0, words.length - 1), index + 1))} className="border border-gray-300 w-10 h-10 grid place-items-center hover:border-ink hover:bg-gray-50" aria-label="Next word" data-testid="reader-next">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="border-b border-gray-200 p-4 grid sm:grid-cols-3 gap-3">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-1 block">Progress</label>
              <input type="range" min="0" max={Math.max(0, words.length - 1)} value={safeWordIndex} onChange={(e) => setWordIndex(Number(e.target.value))} className="w-full accent-black" aria-label="Reader progress" data-testid="reader-progress" />
              <div className="font-mono text-[10px] text-gray-500 mt-1">{words.length ? `${safeWordIndex + 1} / ${words.length}` : "0 / 0"}</div>
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-1 block">Pace</label>
              <input type="range" min="120" max="700" step="20" value={pace} onChange={(e) => setPace(Number(e.target.value))} className="w-full accent-black" aria-label="Reader pace" />
              <div className="font-mono text-[10px] text-gray-500 mt-1">{pace} ms</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-1 block">Background</span>
                <select value={background} onChange={(e) => setBackground(e.target.value)} className="w-full border border-gray-300 bg-white px-2 py-2 text-xs" data-testid="reader-background">
                  {READER_BACKGROUNDS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="flex items-end gap-2 text-xs pb-2 text-ink">
                <input type="checkbox" checked={highContrast} onChange={(e) => setHighContrast(e.target.checked)} />
                High contrast
              </label>
            </div>
          </div>

          <div className="border-b border-gray-200 p-4 grid lg:grid-cols-12 gap-4" data-testid="reader-ai-panel">
            <section className="lg:col-span-5">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500">AI summary</div>
                <button onClick={summariseReaderText} disabled={summaryBusy || !text.trim()} className="border border-gray-300 px-3 py-2 hover:border-ink hover:bg-gray-50 text-xs disabled:opacity-50" data-testid="reader-summarise">
                  {summaryBusy ? "Summarising..." : "Summarise"}
                </button>
              </div>
              <div className="border border-gray-200 bg-gray-50 p-3 min-h-[96px] text-sm whitespace-pre-wrap leading-relaxed" data-testid="reader-summary">
                {readerSummary || <span className="text-gray-500">Capture writing or press Summarise to generate a short summary.</span>}
              </div>
            </section>

            <section className="lg:col-span-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-2">Ask about captured text</div>
              <div className="flex gap-2">
                <input
                  value={readerQuestion}
                  onChange={(e) => setReaderQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !readerChatBusy && askReader()}
                  placeholder="Ask a question..."
                  className="min-w-0 flex-1 border border-gray-300 px-3 py-2 text-sm focus:border-klein focus:outline-none"
                  data-testid="reader-question"
                />
                <button onClick={askReader} disabled={readerChatBusy || !text.trim() || !readerQuestion.trim()} className="bg-ink text-white px-4 py-2 hover:bg-klein text-sm disabled:opacity-50" data-testid="reader-ask">
                  {readerChatBusy ? "Asking..." : "Ask"}
                </button>
              </div>
              {readerAnswer && (
                <div className="mt-2 border border-gray-200 p-3 text-sm whitespace-pre-wrap leading-relaxed" data-testid="reader-answer">
                  {readerAnswer}
                </div>
              )}
            </section>

            <section className="lg:col-span-2">
              <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-2">Download</div>
              <div className="grid gap-2">
                <button onClick={() => downloadReaderDocument("word")} className="border border-gray-300 px-3 py-2 hover:border-ink hover:bg-gray-50 text-xs" data-testid="reader-download-word">Word</button>
                <button onClick={() => downloadReaderDocument("ppt")} className="border border-gray-300 px-3 py-2 hover:border-ink hover:bg-gray-50 text-xs" data-testid="reader-download-ppt">PowerPoint</button>
                <button onClick={() => downloadReaderDocument("pdf")} className="border border-gray-300 px-3 py-2 hover:border-ink hover:bg-gray-50 text-xs" data-testid="reader-download-pdf">PDF</button>
              </div>
            </section>
          </div>

          <div className="flex-1 p-4 sm:p-6 overflow-y-auto" style={{ background }} data-testid="reader-output-shell">
            <article
              className={`min-h-[360px] border border-gray-200 p-5 sm:p-7 leading-relaxed whitespace-pre-wrap ${readerClass}`}
              style={{ fontSize: `${fontScale}%`, background: highContrast ? undefined : "rgba(255,255,255,0.72)" }}
              data-testid="reader-output"
            >
              {text.trim() ? tokens.map((token, index) => viewMode === "guided" ? renderGuidedToken(token, index, settings) : <span key={index}>{token}</span>) : <span className="text-gray-500">Paste text to begin.</span>}
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

function CaseLawTool() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [aiSummaries, setAiSummaries] = useState({});

  const aiSummarise = async (i, r) => {
    if (aiSummaries[i]) return;
    setAiSummaries((s) => ({ ...s, [i]: "loading" }));
    try {
      const { data } = await api.post("/case-law/summarise", {
        url: r.url,
        title: r.title,
        neutral_citation: r.neutral_citation,
        bailii_url: r.bailii_url,
        date: r.date,
        summary: r.summary,
      });
      setAiSummaries((s) => ({ ...s, [i]: data.answer || data.summary }));
    } catch {
      setAiSummaries((s) => ({ ...s, [i]: "Summary unavailable." }));
    }
  };

  const pin = async (r) => {
    try {
      await api.post("/pinned-cases", {
        title: r.title,
        url: r.url,
        neutral_citation: r.neutral_citation,
        bailii_url: r.bailii_url,
        date: r.date,
        summary: r.summary,
      });
      toast.success("Pinned to Drafting Tool");
    } catch {
      toast.error("Pin failed");
    }
  };

  const run = async (e) => {
    e?.preventDefault?.();
    if (!q.trim()) return;
    setBusy(true);
    setSearched(true);
    setAiSummaries({});
    try {
      const { data } = await api.get("/case-law/search", { params: { q } });
      setResults(data.results);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Search failed");
      setResults([]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-testid="case-law-section">
      <div className="mb-6">
        <h2 className="font-serif text-3xl tracking-tight mb-2">UK Case Law</h2>
        <p className="text-sm text-gray-600">Search judgments from the Find Case Law service (TNA) with deep links to BAILII.</p>
      </div>

      <form onSubmit={run} className="flex flex-col sm:flex-row gap-2 mb-6" data-testid="caselaw-form">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder='e.g. "Donoghue v Stevenson" or "frustration of contract"'
          className="flex-1 border border-gray-300 px-3 py-2.5 focus:border-klein focus:outline-none text-sm"
          data-testid="caselaw-query"
        />
        <button type="submit" disabled={busy} className="bg-ink text-white px-5 py-2.5 hover:bg-klein transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2" data-testid="caselaw-search-btn">
          <Search size={14} /> {busy ? "Searching..." : "Search"}
        </button>
      </form>

      <div className="mb-6"><Disclaimer>
        <strong>Search results, not legal advice.</strong> Always read the full judgment and verify the source before relying on a case.
      </Disclaimer></div>

      {busy && <div className="font-mono text-sm text-gray-500" data-testid="caselaw-loading">Searching judgments...</div>}

      {!busy && searched && results.length === 0 && (
        <div className="border border-dashed border-gray-300 p-10 text-center" data-testid="caselaw-empty">
          <Scale size={32} strokeWidth={1.5} className="mx-auto mb-4 text-gray-400" />
          <div className="font-serif text-2xl mb-1">No judgments found</div>
          <p className="text-sm text-gray-600">Try a different search term or a known neutral citation like <span className="font-mono">[2020] UKSC 19</span>.</p>
        </div>
      )}

      {!busy && results.length > 0 && (
        <div className="border border-gray-200" data-testid="caselaw-results">
          {results.map((r, i) => (
            <article key={i} className="p-4 sm:p-5 border-b border-gray-200 last:border-b-0 hover:bg-gray-50" data-testid={`caselaw-result-${i}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <h3 className="font-serif text-lg sm:text-xl leading-snug">{r.title}</h3>
                {r.date && <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500">{r.date}</span>}
              </div>
              {r.neutral_citation && <div className="font-mono text-xs text-klein mb-2">{r.neutral_citation}</div>}
              {r.summary && <p className="text-sm text-gray-700 leading-relaxed mb-2">{r.summary}</p>}
              <div className="bg-klein-bg border-l-2 border-klein p-3 my-2 text-sm" data-testid={`ai-summary-${i}`}>
                <span className="font-mono text-[10px] uppercase tracking-widest text-klein">AI case brief / </span>
                {aiSummaries[i] === "loading" ? <span className="text-gray-500">Generating...</span>
                  : aiSummaries[i] ? <span className="block whitespace-pre-wrap leading-relaxed mt-2">{aiSummaries[i]}</span>
                  : <button onClick={() => aiSummarise(i, r)} className="text-klein underline">Generate full summary</button>}
              </div>
              <div className="flex flex-wrap gap-3 items-center font-mono text-xs">
                {r.url && <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-klein hover:underline" data-testid={`tna-link-${i}`}>TNA <ExternalLink size={11} /></a>}
                {r.bailii_url && <a href={r.bailii_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-klein hover:underline" data-testid={`bailii-link-${i}`}>BAILII <ExternalLink size={11} /></a>}
                <button onClick={() => pin(r)} className="ml-auto inline-flex items-center gap-1 border border-ink px-3 py-1.5 hover:bg-gray-50 transition-colors" data-testid={`pin-${i}`}>
                  <Pin size={11} /> Pin to drafting
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function DraftingTool({ models, onOpenCaseLaw }) {
  const [pins, setPins] = useState([]);
  const [form, setForm] = useState({ ...DRAFTING_EMPTY_FORM, date: new Date().toISOString().slice(0, 10) });
  const [model, setModel] = useState("gpt-oss:120b-cloud");
  const [maxTokens, setMaxTokens] = useState(12000);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(null);
  const [editedDraft, setEditedDraft] = useState("");
  const [history, setHistory] = useState([]);

  const refresh = async () => {
    const [p, b] = await Promise.all([
      api.get("/pinned-cases"),
      api.get("/drafts"),
    ]);
    setPins(p.data);
    setHistory(b.data.map(normalizeDraftingRecord));
  };

  useEffect(() => { refresh(); }, []);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const unpin = async (id) => {
    await api.delete(`/pinned-cases/${id}`);
    toast.success("Unpinned");
    refresh();
  };

  const generate = async () => {
    const errors = validateDraftingForm(form);
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }
    setBusy(true);
    setDraft(null);
    setEditedDraft("");
    try {
      const { data } = await api.post("/drafting/generate", { ...form, model, max_tokens: maxTokens });
      const record = normalizeDraftingRecord(data);
      setDraft(record);
      setEditedDraft(record.draft_text || "");
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Draft generation failed");
    } finally {
      setBusy(false);
    }
  };

  const exportDraft = (format) => {
    const text = editedDraft || draft?.draft_text || "";
    if (!text.trim()) {
      toast.error("Generate or enter draft text before exporting");
      return;
    }
    const filename = draftingFileBase({
      document_type: draft?.document_type || form.document_type,
      client_name: draft?.client_name || form.client_name,
      date: draft?.date || form.date,
    });
    if (format === "pdf") {
      downloadBlob(makeSimplePdf(text), `${filename}.pdf`);
      return;
    }
    downloadBlob(makeDraftingDocx(text, "Drafting Tool"), `${filename}.docx`);
  };

  const loadHistory = (record) => {
    const normalized = normalizeDraftingRecord(record);
    setDraft(normalized);
    setEditedDraft(normalized.draft_text || "");
  };

  return (
    <section data-testid="drafting-tool-section">
      <div className="mb-6">
        <h2 className="font-serif text-3xl tracking-tight mb-2">Drafting Tool</h2>
        <p className="text-sm text-gray-600">Create legal correspondence from structured facts, then edit the draft before exporting to Word or PDF.</p>
      </div>

      <div className="mb-6"><Disclaimer>
        <strong>AI draft, not legal advice.</strong> Check all facts, deadlines, authorities, and procedural requirements before sending.
      </Disclaimer></div>

      <div className="grid lg:grid-cols-12 gap-6">
        <section className="lg:col-span-4">
          <h3 className="font-serif text-2xl mb-3 flex items-center gap-2"><Pin size={16} /> Optional authorities ({pins.length})</h3>
          {pins.length === 0 ? (
            <div className="border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500" data-testid="drafting-empty-pins">
              No pinned authorities. Use the <button onClick={onOpenCaseLaw} className="text-klein underline">Case Law tab</button> if the letter should refer to authorities.
            </div>
          ) : (
            <ul className="space-y-2" data-testid="pinned-list">
              {pins.map((p, i) => (
                <li key={p.pin_id} className="border border-gray-200 p-3" data-testid={`pin-${i}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] text-klein">[C{i + 1}] {p.neutral_citation || ""}</div>
                      <div className="font-serif text-base leading-snug">{p.title}</div>
                      <div className="font-mono text-[10px] text-gray-500 mt-1 flex gap-3">
                        <a href={p.url} target="_blank" rel="noreferrer" className="hover:underline">TNA <ExternalLink size={9} className="inline" /></a>
                        {p.bailii_url && <a href={p.bailii_url} target="_blank" rel="noreferrer" className="hover:underline">BAILII <ExternalLink size={9} className="inline" /></a>}
                      </div>
                    </div>
                    <button onClick={() => unpin(p.pin_id)} className="text-red-600 hover:text-red-800 shrink-0" data-testid={`unpin-${i}`} aria-label="Unpin"><Trash2 size={14} /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="lg:col-span-8">
          <h3 className="font-serif text-2xl mb-3 flex items-center gap-2"><FileSignature size={16} /> Letter details</h3>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Document type</label>
                <select value={form.document_type} onChange={(e) => updateField("document_type", e.target.value)} className="w-full border border-gray-300 px-3 py-2.5 bg-white" data-testid="drafting-document-type">
                  {DRAFTING_DOCUMENT_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Model</label>
                <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full border border-gray-300 px-3 py-2.5 bg-white" data-testid="drafting-model">
                  {models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Sender name</label>
                <input value={form.sender_name} onChange={(e) => updateField("sender_name", e.target.value)} className="w-full border border-gray-300 px-3 py-2.5 text-sm" data-testid="drafting-sender-name" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Recipient name</label>
                <input value={form.recipient_name} onChange={(e) => updateField("recipient_name", e.target.value)} className="w-full border border-gray-300 px-3 py-2.5 text-sm" data-testid="drafting-recipient-name" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Sender address</label>
                <textarea value={form.sender_address} onChange={(e) => updateField("sender_address", e.target.value)} rows={3} className="w-full border border-gray-300 px-3 py-2.5 text-sm" data-testid="drafting-sender-address" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Recipient address</label>
                <textarea value={form.recipient_address} onChange={(e) => updateField("recipient_address", e.target.value)} rows={3} className="w-full border border-gray-300 px-3 py-2.5 text-sm" data-testid="drafting-recipient-address" />
              </div>
            </div>

            <div className="grid sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Client name</label>
                <input value={form.client_name} onChange={(e) => updateField("client_name", e.target.value)} className="w-full border border-gray-300 px-3 py-2.5 text-sm" data-testid="drafting-client-name" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Matter/ref</label>
                <input value={form.matter_reference} onChange={(e) => updateField("matter_reference", e.target.value)} className="w-full border border-gray-300 px-3 py-2.5 text-sm" data-testid="drafting-reference" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Date</label>
                <input type="date" value={form.date} onChange={(e) => updateField("date", e.target.value)} className="w-full border border-gray-300 px-3 py-2.5 text-sm" data-testid="drafting-date" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Tone</label>
                <select value={form.tone} onChange={(e) => updateField("tone", e.target.value)} className="w-full border border-gray-300 px-3 py-2.5 bg-white text-sm" data-testid="drafting-tone">
                  {DRAFTING_TONES.map((tone) => <option key={tone} value={tone}>{tone}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1">Subject / RE line</label>
              <input value={form.subject} onChange={(e) => updateField("subject", e.target.value)} className="w-full border border-gray-300 px-3 py-2.5 text-sm" data-testid="drafting-subject" />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <label>
                <span className="block text-xs font-bold uppercase tracking-wider mb-1">Background facts</span>
                <textarea value={form.background_facts} onChange={(e) => updateField("background_facts", e.target.value)} rows={5} className="w-full border border-gray-300 px-3 py-2.5 text-sm" data-testid="drafting-background" />
              </label>
              <label>
                <span className="block text-xs font-bold uppercase tracking-wider mb-1">Basis of claim</span>
                <textarea value={form.basis_of_claim} onChange={(e) => updateField("basis_of_claim", e.target.value)} rows={5} className="w-full border border-gray-300 px-3 py-2.5 text-sm" data-testid="drafting-basis" />
              </label>
              <label>
                <span className="block text-xs font-bold uppercase tracking-wider mb-1">Key legal or factual issues</span>
                <textarea value={form.key_issues} onChange={(e) => updateField("key_issues", e.target.value)} rows={4} className="w-full border border-gray-300 px-3 py-2.5 text-sm" data-testid="drafting-issues" />
              </label>
              <label>
                <span className="block text-xs font-bold uppercase tracking-wider mb-1">Chronology/key events</span>
                <textarea value={form.chronology} onChange={(e) => updateField("chronology", e.target.value)} rows={4} className="w-full border border-gray-300 px-3 py-2.5 text-sm" data-testid="drafting-chronology" />
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <label>
                <span className="block text-xs font-bold uppercase tracking-wider mb-1">Desired outcome/remedy</span>
                <textarea value={form.desired_outcome} onChange={(e) => updateField("desired_outcome", e.target.value)} rows={3} className="w-full border border-gray-300 px-3 py-2.5 text-sm" data-testid="drafting-remedy" />
              </label>
              <label>
                <span className="block text-xs font-bold uppercase tracking-wider mb-1">Additional instructions</span>
                <textarea value={form.additional_instructions} onChange={(e) => updateField("additional_instructions", e.target.value)} rows={3} className="w-full border border-gray-300 px-3 py-2.5 text-sm" data-testid="drafting-instructions" />
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Response deadline</label>
                <input value={form.response_deadline} onChange={(e) => updateField("response_deadline", e.target.value)} placeholder="e.g. 14 days from the date of this letter" className="w-full border border-gray-300 px-3 py-2.5 text-sm" data-testid="drafting-deadline" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Max tokens</label>
                <input type="number" min="256" max="12000" step="256" value={maxTokens} onChange={(e) => setMaxTokens(Math.max(256, Math.min(12000, Number(e.target.value) || 12000)))} className="w-full border border-gray-300 px-3 py-2.5 bg-white" data-testid="drafting-max-tokens" />
              </div>
            </div>

            <button onClick={generate} disabled={busy} className="bg-ink text-white px-5 py-3 hover:bg-klein transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2" data-testid="drafting-generate">
              <Sparkles size={14} /> {busy ? "Drafting..." : "Generate letter"}
            </button>
          </div>

          {draft && (
            <div className="mt-6 border border-ink" data-testid="drafting-result">
              <div className="border-b border-gray-200 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500">{draft.model_status || "generated"} / {draft.max_tokens || maxTokens} tokens</div>
                  <div className="text-sm text-gray-700">Edit the draft below before exporting.</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => exportDraft("docx")} className="border border-gray-300 px-3 py-2 hover:border-ink hover:bg-gray-50 text-xs inline-flex items-center gap-2" data-testid="drafting-download-docx"><Download size={13} /> Word .docx</button>
                  <button onClick={() => exportDraft("pdf")} className="border border-gray-300 px-3 py-2 hover:border-ink hover:bg-gray-50 text-xs inline-flex items-center gap-2" data-testid="drafting-download-pdf"><Download size={13} /> PDF</button>
                </div>
              </div>
              <textarea value={editedDraft} onChange={(e) => setEditedDraft(e.target.value)} rows={22} className="w-full border-0 p-5 text-sm whitespace-pre-wrap leading-relaxed focus:outline-none resize-y" data-testid="drafting-editor" />
            </div>
          )}

          {history.length > 0 && (
            <div className="mt-8">
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-2">Recent Drafting Tool records</h3>
              <div className="border border-gray-200">
                {history.slice(0, 5).map((b) => (
                  <button key={b.draft_id || b.brief_id} onClick={() => loadHistory(b)} className="w-full text-left p-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50" data-testid={`drafting-history-${b.draft_id || b.brief_id}`}>
                    <div className="text-sm font-medium truncate">{b.subject || b.matter || b.document_type_label || "Drafting Tool record"}</div>
                    <div className="font-mono text-[10px] text-gray-500">{new Date(b.created_at).toLocaleString()} / {b.document_type_label || "Drafting Tool"} / {b.max_tokens || 12000} tokens / {b.bundle?.length || 0} sources</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

export default function Tools() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab") || "builder";
  const tabAlias = requestedTab === "brief-builder" ? "drafting-tool" : requestedTab;
  const validTab = STUDIO_TABS.some((tab) => tab.id === tabAlias) ? tabAlias : "builder";
  const [activeTab, setActiveTab] = useState(validTab);
  const [models, setModels] = useState([]);

  useEffect(() => {
    api.get("/meta/models")
      .then((r) => setModels(r.data.models))
      .catch(() => setModels(FALLBACK_MODELS));
  }, []);

  useEffect(() => {
    if (validTab !== activeTab) setActiveTab(validTab);
  }, [validTab, activeTab]);

  const selectTab = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10" data-testid="studio-hub">
        <h1 className="font-serif text-4xl sm:text-5xl tracking-tight mb-2">Studio</h1>
        <p className="text-gray-600 mb-6">Build apps, manage your assistants, compare, capture, read, research, and draft from one workspace.</p>

        <ToolTabs activeTab={activeTab} onSelect={selectTab} />

        {activeTab === "builder" && <NaturalLanguageBuilder models={models} />}
        {activeTab === "apps" && <AppsPanel onCreate={() => selectTab("builder")} />}
        {activeTab === "compare" && <CompareTool models={models} />}
        {activeTab === "chronology" && <ChronologyTool models={models} />}
        {activeTab === "camera" && <CameraTool />}
        {activeTab === "model-lab" && <MiniModelLab />}
        {activeTab === "reader" && <GuidedReaderTool />}
        {activeTab === "case-law" && <CaseLawTool />}
        {activeTab === "drafting-tool" && <DraftingTool models={models} onOpenCaseLaw={() => selectTab("case-law")} />}
      </main>
    </div>
  );
}
