import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, ClipboardList, Mail, Search, ShieldCheck, FileCheck2, Quote } from "lucide-react";
import Header from "../components/Header";
import Disclaimer from "../components/Disclaimer";

const apps = [
  { icon: FileText, name: "Contract Reviewer", desc: "Flag risky clauses, missing protections and ambiguous language." },
  { icon: ClipboardList, name: "Chronology Builder", desc: "Auto-build a court-ready timeline from disclosure." },
  { icon: Mail, name: "Letter Generator", desc: "Draft formal UK legal correspondence in your house style." },
  { icon: Search, name: "Research Assistant", desc: "Ask questions of your matter bundle. Answers are cited." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* HERO */}
      <section className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 stagger">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-klein mb-6" data-testid="hero-eyebrow">
              UK Legal · No-Code · Built for solicitors
            </div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tight text-ink" data-testid="hero-title">
              Build your own<br />
              <span className="italic font-light">legal AI assistants.</span><br />
              No engineers required.
            </h1>
            <p className="mt-8 max-w-xl text-lg text-gray-600 leading-relaxed" data-testid="hero-sub">
              ADA Studio turns your firm's documents, templates and know-how into private AI apps. Reviewers,
              chronology builders, letter drafters &mdash; configured in minutes, grounded in your sources, with
              source citations and configurable workflows.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link to="/studio" className="inline-flex items-center gap-2 bg-ink text-white px-6 py-3 hover:bg-klein transition-colors text-sm font-medium" data-testid="cta-get-started">
                Get started free <ArrowRight size={16} />
              </Link>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 font-mono text-[11px] uppercase tracking-widest text-gray-500">
              <span className="flex items-center gap-2"><ShieldCheck size={12} /> Citations on every output</span>
              <span className="flex items-center gap-2"><FileCheck2 size={12} /> Source-grounded workflows</span>
              <span className="flex items-center gap-2"><Quote size={12} /> Information, not advice</span>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="border border-gray-900 bg-white p-1">
              <img
                src="https://images.pexels.com/photos/8112199/pexels-photo-8112199.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                alt="Lady Justice"
                className="w-full h-[520px] object-cover grayscale contrast-110"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white border border-gray-900 px-5 py-4 max-w-[260px] hidden md:block">
              <div className="font-mono text-[10px] uppercase tracking-widest text-klein mb-2">App.run() // 02</div>
              <div className="font-serif text-lg leading-tight">"Clause 14.2 imposes an uncapped indemnity &mdash; review recommended."</div>
              <div className="font-mono text-[10px] text-gray-500 mt-2">[S3] · Contract.pdf</div>
            </div>
          </div>
        </div>
      </section>

      {/* APPS GRID */}
      <section className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-12 gap-8 mb-12">
            <div className="lg:col-span-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-gray-500 mb-4">// app library</div>
              <h2 className="font-serif text-4xl lg:text-5xl tracking-tight">Four templates.<br />Endless configurations.</h2>
            </div>
            <p className="lg:col-span-7 lg:col-start-6 text-gray-600 text-lg leading-relaxed self-end">
              Start from a battle-tested template, then set the jurisdiction, system instructions, output format
              and safety rules to match the way your team works.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-0 border-l border-t border-gray-200">
            {apps.map((a, i) => (
              <div key={a.name} className="border-r border-b border-gray-200 p-6 hover:bg-gray-50 transition-colors group" data-testid={`app-template-${i}`}>
                <a.icon size={22} strokeWidth={1.5} className="text-klein mb-6" />
                <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-1">Template / 0{i+1}</div>
                <h3 className="font-serif text-2xl mb-3">{a.name}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FLOW */}
      <section className="border-b border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-3 gap-10">
          {[
            { n: "01", t: "Configure", d: "Pick a template, set the jurisdiction, write your firm's house instructions and safety rules." },
            { n: "02", t: "Upload sources", d: "PDFs, DOCX or TXT. We parse, chunk and index them privately for your app." },
            { n: "03", t: "Run & cite", d: "Ask in plain English. Every answer is grounded in your sources with clickable citations." },
          ].map((s) => (
            <div key={s.n} className="border-t border-ink pt-6" data-testid={`flow-step-${s.n}`}>
              <div className="font-mono text-xs tracking-widest text-klein mb-3">STEP {s.n}</div>
              <h3 className="font-serif text-3xl mb-3">{s.t}</h3>
              <p className="text-gray-600 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DISCLAIMER STRIP */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <Disclaimer />
      </section>

      <footer className="border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4">
          <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500">© 2026 ADA Studio · Information, not advice</div>
          <Link to="/studio" className="text-sm underline underline-offset-4" data-testid="footer-cta">Start building &rarr;</Link>
        </div>
      </footer>
    </div>
  );
}
