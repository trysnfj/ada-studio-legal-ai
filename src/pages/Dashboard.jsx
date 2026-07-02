import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Disclaimer from "../components/Disclaimer";
import { api } from "../lib/api";
import { Plus, FileText, ClipboardList, Mail, Search, Trash2 } from "lucide-react";

const ICONS = {
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

export default function Dashboard() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/apps").then((r) => setApps(r.data)).finally(() => setLoading(false));
  }, []);

  const removeApp = async (e, id) => {
    e.preventDefault(); e.stopPropagation();
    if (!window.confirm("Delete this app and all its data?")) return;
    try { await api.delete(`/apps/${id}`); setApps((arr) => arr.filter((a) => a.app_id !== id)); } catch (e) { /* ignore */ }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-gray-500 mb-2">// your studio</div>
            <h1 className="font-serif text-5xl tracking-tight">Apps</h1>
            <p className="text-gray-600 mt-2">Configure, train and run private legal AI apps.</p>
          </div>
          <Link to="/apps/new" className="inline-flex items-center gap-2 bg-ink text-white px-5 py-3 hover:bg-klein transition-colors text-sm font-medium" data-testid="create-app-btn">
            <Plus size={16} /> New app
          </Link>
        </div>

        <div className="mb-8"><Disclaimer /></div>

        {loading ? (
          <div className="font-mono text-sm text-gray-500" data-testid="loading-apps">Loading apps...</div>
        ) : apps.length === 0 ? (
          <div className="border border-dashed border-gray-300 p-16 text-center" data-testid="empty-apps">
            <div className="font-serif text-3xl mb-3">No apps yet</div>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">Create your first legal AI app in under a minute. Pick a template, upload sources, start asking questions.</p>
            <Link to="/apps/new" className="inline-flex items-center gap-2 bg-ink text-white px-5 py-3 hover:bg-klein transition-colors text-sm" data-testid="empty-create-btn">
              <Plus size={16} /> Create first app
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-gray-200">
            {apps.map((a) => {
              const Icon = ICONS[a.app_type] || FileText;
              return (
                <Link key={a.app_id} to={`/apps/${a.app_id}`} className="relative border-r border-b border-gray-200 p-6 hover:bg-gray-50 hover:border-ink transition-all group" data-testid={`app-card-${a.app_id}`}>
                  <button onClick={(e)=>removeApp(e, a.app_id)} className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`delete-app-${a.app_id}`} aria-label="Delete app"><Trash2 size={14} /></button>
                  <div className="flex items-start justify-between mb-6">
                    <Icon size={22} strokeWidth={1.5} className="text-klein" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500">{TYPE_LABELS[a.app_type]}</span>
                  </div>
                  <h3 className="font-serif text-2xl mb-3 group-hover:text-klein transition-colors">{a.name}</h3>
                  <div className="font-mono text-xs text-gray-500 mb-4">{a.jurisdiction} · {a.model}</div>
                  <div className="flex gap-6 pt-4 border-t border-gray-200">
                    <div>
                      <div className="font-serif text-2xl">{a.doc_count ?? 0}</div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Docs</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
