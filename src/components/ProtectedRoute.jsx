import React from "react";
import { useAuth } from "../lib/auth";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="auth-loading">
        <div className="font-mono text-xs uppercase tracking-widest text-gray-500">Opening workspace...</div>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="auth-unavailable">
        <div className="font-mono text-xs uppercase tracking-widest text-gray-500">Workspace unavailable. Refresh to retry.</div>
      </div>
    );
  }
  return children;
}
