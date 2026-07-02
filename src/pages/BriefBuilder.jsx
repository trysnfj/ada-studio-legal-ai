import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import Disclaimer from "../components/Disclaimer";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Pin, Trash2, FileSignature, ExternalLink, Sparkles } from "lucide-react";

export default function BriefBuilder() {
  const [pins, setPins] = useState([]);
  const [matter, setMatter] = useState("");
  const [style, setStyle] = useState("skeleton_argument");
  const [model, setModel] = useState("gpt-oss:120b-cloud");
  const [maxTokens, setMaxTokens] = useState(12000);
  const [models, setModels] = useState([]);
  const [busy, setBusy] = useState(false);
  const [brief, setBrief] = useState(null);
  const [history, setHistory] = useState([]);

  const refresh = async () => {
    const [p, b, m] = await Promise.all([
      api.get("/pinned-cases"),
      api.get("/briefs"),
      api.get("/meta/models"),
    ]);
    setPins(p.data); setHistory(b.data); setModels(m.data.models);
  };
  useEffect(() => { refresh(); }, []);

  const unpin = async (id) => {
    await api.delete(`/pinned-cases/${id}`);
    toast.success("Unpinned");
    refresh();
  };

  const generate = async () => {
    if (!matter.trim()) { toast.error("Describe the matter first"); return; }
    if (pins.length === 0) { toast.error("Pin at least one case"); return; }
    setBusy(true); setBrief(null);
    try {
      const { data } = await api.post("/brief/generate", { matter, style, model, max_tokens: maxTokens });
      setBrief(data);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Draft generation failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-gray-500 mb-2">// drafting</div>
        <h1 className="font-serif text-4xl sm:text-5xl tracking-tight mb-2">Drafting Tool</h1>
        <p className="text-gray-600 mb-6">Pin cases from the Case Law search, then auto-draft structured legal correspondence that cites them.</p>

        <div className="mb-6"><Disclaimer>
          <strong>AI draft, not legal advice.</strong> Always check every citation against the full judgment before filing.
        </Disclaimer></div>

        <div className="grid lg:grid-cols-12 gap-6">
          <section className="lg:col-span-5">
            <h2 className="font-serif text-2xl mb-3 flex items-center gap-2"><Pin size={16} /> Pinned cases ({pins.length})</h2>
            {pins.length === 0 ? (
              <div className="border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500" data-testid="brief-empty-pins">
                No pinned cases yet. Use the <a href="/case-law" className="text-klein underline">Case Law search</a> to pin some.
              </div>
            ) : (
              <ul className="space-y-2" data-testid="pinned-list">
                {pins.map((p, i) => (
                  <li key={p.pin_id} className="border border-gray-200 p-3" data-testid={`pin-${i}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono text-[10px] text-klein">[C{i+1}] {p.neutral_citation || ""}</div>
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

          <section className="lg:col-span-7">
            <h2 className="font-serif text-2xl mb-3 flex items-center gap-2"><FileSignature size={16} /> Draft</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Matter / question</label>
                <textarea value={matter} onChange={(e)=>setMatter(e.target.value)} rows={3} placeholder="e.g. Defending a £2m claim for breach of NDA where damages are speculative." className="w-full border border-gray-300 px-3 py-2.5 focus:border-klein focus:outline-none text-sm" data-testid="brief-matter" />
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">Style</label>
                  <select value={style} onChange={(e)=>setStyle(e.target.value)} className="w-full border border-gray-300 px-3 py-2.5 bg-white" data-testid="brief-style">
                    <option value="skeleton_argument">Skeleton argument</option>
                    <option value="advice_note">Advice note</option>
                    <option value="memo">Internal memo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">Model</label>
                  <select value={model} onChange={(e)=>setModel(e.target.value)} className="w-full border border-gray-300 px-3 py-2.5 bg-white" data-testid="brief-model">
                    {models.map((m)=><option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">Max tokens</label>
                  <input
                    type="number"
                    min="256"
                    max="12000"
                    step="256"
                    value={maxTokens}
                    onChange={(e)=>setMaxTokens(Math.max(256, Math.min(12000, Number(e.target.value) || 12000)))}
                    className="w-full border border-gray-300 px-3 py-2.5 bg-white"
                    data-testid="brief-max-tokens"
                  />
                </div>
              </div>
              <button onClick={generate} disabled={busy || pins.length === 0} className="bg-ink text-white px-5 py-3 hover:bg-klein transition-colors text-sm disabled:opacity-50 flex items-center gap-2" data-testid="brief-generate">
                <Sparkles size={14} /> {busy ? "Drafting..." : "Generate draft"}
              </button>
            </div>

            {brief && (
              <div className="mt-6 border border-ink" data-testid="brief-result">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-gray-500">
                  {brief.model_status || "generated"} / {brief.max_tokens || maxTokens} tokens
                </div>
                <div className="p-4 text-sm whitespace-pre-wrap leading-relaxed">{brief.answer}</div>
              </div>
            )}

            {history.length > 0 && (
              <div className="mt-8">
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-2">Recent Drafting Tool records</h3>
                <div className="border border-gray-200">
                  {history.slice(0, 5).map((b) => (
                    <button key={b.brief_id} onClick={() => setBrief(b)} className="w-full text-left p-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50" data-testid={`brief-history-${b.brief_id}`}>
                      <div className="text-sm font-medium truncate">{b.matter}</div>
                      <div className="font-mono text-[10px] text-gray-500">{new Date(b.created_at).toLocaleString()} · {b.style} · {b.max_tokens || 12000} tokens · {b.bundle?.length || 0} cases</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
