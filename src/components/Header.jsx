import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

export default function Header() {
  const [open, setOpen] = useState(false);

  const links = [
    { to: "/studio", label: "Studio", testid: "nav-studio" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200" data-testid="app-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        <Link to="/studio" className="flex items-center gap-2.5 group" data-testid="logo-link">
          <div className="leading-none">
            <div className="font-serif text-lg sm:text-xl tracking-tight text-ink">ADA Studio</div>
            <div className="hidden sm:block font-mono text-[9px] uppercase tracking-[0.25em] text-gray-500 mt-0.5">Legal AI App Builder</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="text-sm px-3 py-2 hover:bg-gray-100" data-testid={l.testid}>{l.label}</Link>
          ))}
        </nav>

        {/* Mobile burger */}
        <button onClick={() => setOpen(!open)} className="md:hidden p-2 -mr-2" data-testid="mobile-menu-btn" aria-label="Menu">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-t border-gray-200 bg-white" data-testid="mobile-menu">
          <div className="px-4 py-3 flex flex-col">
            {links.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="py-3 border-b border-gray-100 text-sm" data-testid={`m-${l.testid}`}>{l.label}</Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
