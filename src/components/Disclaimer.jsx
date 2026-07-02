import React from "react";
import { AlertTriangle } from "lucide-react";

export default function Disclaimer({ children }) {
  return (
    <div className="disclaimer flex items-start gap-3" data-testid="legal-disclaimer">
      <AlertTriangle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
      <div className="leading-snug">
        {children || (
          <>
            <strong>Legal information, not legal advice.</strong> ADA Studio is an AI tool and is not a solicitor. Verify important outputs against source documents and current law before relying on them.
          </>
        )}
      </div>
    </div>
  );
}
