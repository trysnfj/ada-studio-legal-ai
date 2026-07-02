import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { api } from "../lib/api";
import { toast } from "sonner";
import { ArrowLeft, FileText, ClipboardList, Mail, Search, GripVertical, Plus, X, Camera, Scale, FileSignature, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

const ALL_MODULES = [
  { id: "rag", label: "Document RAG", desc: "Upload + parse + retrieve docs in Playground.", icon: FileText },
  { id: "caselaw", label: "Case Law Search", desc: "GOV.UK + BAILII inside the app.", icon: Scale },
  { id: "camera", label: "Camera OCR", desc: "Photograph docs and index extracted text.", icon: Camera },
  { id: "compare", label: "Compare", desc: "Compare two versions or opposing drafts.", icon: Search },
  { id: "guided_reader", label: "Guided Reader", desc: "Use the saccadic guided reading tool.", icon: BookOpen },
  { id: "brief_export", label: "Bundles & Export", desc: "Download answers and matter bundles to Word, PDF, and PowerPoint.", icon: FileSignature },
];

const ICONS = {
  contract_reviewer: FileText,
  chronology_builder: ClipboardList,
  letter_generator: Mail,
  research_assistant: Search,
};

export default function CreateApp() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [meta, setMeta] = useState({ models: [], app_types: [] });
  const [form, setForm] = useState({
    name: "",
    app_type: "contract_reviewer",
    jurisdiction: "United Kingdom",
    system_instructions: "",
    output_format: "",
    safety_rules: "",
    model: "gpt-oss:120b-cloud",
    modules: ["rag", "caselaw", "camera"],
  });
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState(null);

  useEffect(() => {
    api.get("/meta/models").then((r) => {
      setMeta(r.data);
      const t = r.data.app_types.find((x) => x.id === form.app_type);
      if (t) setForm((f) => ({ ...f, system_instructions: t.default_instructions, output_format: t.default_format }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickType = (id) => {
    const t = meta.app_types.find((x) => x.id === id);
    setForm({ ...form, app_type: id, system_instructions: t?.default_instructions || "", output_format: t?.default_format || "" });
  };

  const submit = async () => {
    if (!form.name.trim()) { toast.error("Please name your app"); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/apps", form);
      toast.success("App created");
      nav(`/apps/${data.app_id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create app");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-ink mb-6" data-testid="back-link">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>

        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-3 flex-wrap">
          <span className={step >= 1 ? "text-klein" : ""}>01 · Template</span><span>/</span>
          <span className={step >= 2 ? "text-klein" : ""}>02 · Configure</span><span>/</span>
          <span className={step >= 3 ? "text-klein" : ""}>03 · Remix</span>
        </div>

        <h1 className="font-serif text-5xl tracking-tight mb-10">Create a new app</h1>

        {step === 1 && (
          <div data-testid="step-template">
            <div className="font-mono text-[11px] uppercase tracking-widest text-gray-500 mb-4">Choose a template</div>
            <div className="grid md:grid-cols-2 gap-0 border-l border-t border-gray-200 mb-8">
              {meta.app_types.map((t) => {
                const Icon = ICONS[t.id] || FileText;
                const active = form.app_type === t.id;
                return (
                  <button key={t.id} onClick={() => pickType(t.id)} className={`border-r border-b text-left p-6 transition-all ${active ? "border-ink bg-klein-bg" : "border-gray-200 hover:border-gray-900"}`} data-testid={`template-${t.id}`}>
                    <Icon size={22} strokeWidth={1.5} className={active ? "text-klein" : "text-ink"} />
                    <h3 className="font-serif text-2xl mt-4 mb-2">{t.label}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{t.default_instructions.slice(0, 110)}...</p>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setStep(2)} className="bg-ink text-white px-6 py-3 hover:bg-klein transition-colors text-sm" data-testid="next-step-btn">Continue &rarr;</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6" data-testid="step-configure">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2">App name</label>
              <input value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} placeholder="e.g. NDA Reviewer" className="w-full border border-gray-300 px-3 py-2.5 focus:border-klein focus:outline-none" data-testid="app-name-input" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2">Jurisdiction</label>
                <input value={form.jurisdiction} onChange={(e)=>setForm({...form, jurisdiction: e.target.value})} className="w-full border border-gray-300 px-3 py-2.5 focus:border-klein focus:outline-none" data-testid="jurisdiction-input" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2">Model</label>
                <select value={form.model} onChange={(e)=>setForm({...form, model: e.target.value})} className="w-full border border-gray-300 px-3 py-2.5 focus:border-klein focus:outline-none bg-white" data-testid="model-select">
                  {meta.models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2">System instructions</label>
              <textarea value={form.system_instructions} onChange={(e)=>setForm({...form, system_instructions: e.target.value})} rows={5} className="w-full border border-gray-300 px-3 py-2.5 focus:border-klein focus:outline-none font-mono text-sm" data-testid="instructions-input" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2">Output format</label>
              <textarea value={form.output_format} onChange={(e)=>setForm({...form, output_format: e.target.value})} rows={3} className="w-full border border-gray-300 px-3 py-2.5 focus:border-klein focus:outline-none font-mono text-sm" data-testid="format-input" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2">Additional safety rules (optional)</label>
              <textarea value={form.safety_rules} onChange={(e)=>setForm({...form, safety_rules: e.target.value})} rows={2} placeholder="e.g. Always flag clauses imposing unlimited liability." className="w-full border border-gray-300 px-3 py-2.5 focus:border-klein focus:outline-none text-sm" data-testid="safety-input" />
            </div>

            <div className="flex gap-3 pt-4">
              <button onClick={() => setStep(1)} className="border border-ink px-6 py-3 hover:bg-gray-50 text-sm" data-testid="back-step-btn">&larr; Back</button>
              <button onClick={() => setStep(3)} className="bg-ink text-white px-6 py-3 hover:bg-klein transition-colors text-sm" data-testid="to-remix-btn">Next: Remix &rarr;</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6" data-testid="step-remix">
            <div>
              <h2 className="font-serif text-3xl mb-1">Remix your app</h2>
              <p className="text-sm text-gray-600">Drag modules from the right into your app on the left. Reorder by dragging within the left column.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Enabled */}
              <div
                className="border-2 border-ink p-3 min-h-[280px]"
                onDragOver={(e)=>e.preventDefault()}
                onDrop={(e)=>{
                  e.preventDefault();
                  if (!dragId) return;
                  if (!form.modules.includes(dragId)) setForm({...form, modules: [...form.modules, dragId]});
                  setDragId(null);
                }}
                data-testid="remix-enabled"
              >
                <div className="font-mono text-[10px] uppercase tracking-widest text-klein mb-3">In your app</div>
                {form.modules.length === 0 && <div className="text-xs text-gray-400 p-4 text-center">Drop modules here</div>}
                <div className="space-y-2">
                  {form.modules.map((mid, idx) => {
                    const m = ALL_MODULES.find((x)=>x.id===mid);
                    if (!m) return null;
                    return (
                      <div
                        key={mid}
                        draggable
                        onDragStart={()=>setDragId(mid)}
                        onDragOver={(e)=>e.preventDefault()}
                        onDrop={(e)=>{
                          e.preventDefault(); e.stopPropagation();
                          if (!dragId || dragId === mid) return;
                          const arr = form.modules.filter((x)=>x!==dragId);
                          const i = arr.indexOf(mid);
                          arr.splice(i, 0, dragId);
                          setForm({...form, modules: arr});
                          setDragId(null);
                        }}
                        className="bg-white border border-gray-300 p-3 flex items-center gap-2 cursor-grab active:cursor-grabbing hover:border-ink"
                        data-testid={`remix-active-${mid}`}
                      >
                        <GripVertical size={14} className="text-gray-400" />
                        <div className="font-mono text-[10px] text-gray-500 w-4">{idx+1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{m.label}</div>
                          <div className="text-[11px] text-gray-600 truncate">{m.desc}</div>
                        </div>
                        <button onClick={()=>setForm({...form, modules: form.modules.filter((x)=>x!==mid)})} className="text-gray-400 hover:text-red-600" data-testid={`remix-remove-${mid}`} aria-label="Remove"><X size={14} /></button>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Available */}
              <div className="border border-dashed border-gray-300 p-3" data-testid="remix-available">
                <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-3">Library</div>
                <div className="space-y-2">
                  {ALL_MODULES.filter((m)=>!form.modules.includes(m.id)).map((m)=>(
                    <div
                      key={m.id}
                      draggable
                      onDragStart={()=>setDragId(m.id)}
                      onClick={()=>setForm({...form, modules: [...form.modules, m.id]})}
                      className="bg-gray-50 border border-gray-200 p-3 flex items-center gap-2 cursor-grab hover:border-ink hover:bg-white"
                      data-testid={`remix-lib-${m.id}`}
                    >
                      <Plus size={14} className="text-klein" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{m.label}</div>
                        <div className="text-[11px] text-gray-600 truncate">{m.desc}</div>
                      </div>
                    </div>
                  ))}
                  {ALL_MODULES.length === form.modules.length && <div className="text-xs text-gray-400 p-4 text-center">All modules added</div>}
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setStep(2)} className="border border-ink px-6 py-3 hover:bg-gray-50 text-sm" data-testid="back-remix-btn">&larr; Back</button>
              <button onClick={submit} disabled={busy} className="bg-ink text-white px-6 py-3 hover:bg-klein transition-colors text-sm disabled:opacity-50" data-testid="submit-app-btn">
                {busy ? "Creating..." : "Create app"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
