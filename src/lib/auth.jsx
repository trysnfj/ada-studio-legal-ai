import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ada_user") || "null"); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const ensureGuestId = () => {
      let guestId = localStorage.getItem("ada_guest_id");
      if (!guestId) {
        guestId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem("ada_guest_id", guestId);
      }
      return guestId;
    };
    const startGuestSession = async () => {
      const { data } = await api.post("/auth/guest", { guest_id: ensureGuestId() });
      localStorage.setItem("ada_token", data.token);
      localStorage.setItem("ada_user", JSON.stringify(data.user));
      if (alive) setUser(data.user);
    };
    const boot = async () => {
      const token = localStorage.getItem("ada_token");
      try {
        if (token) {
          const { data } = await api.get("/auth/me");
          localStorage.setItem("ada_user", JSON.stringify(data));
          if (alive) setUser(data);
          return;
        }
        await startGuestSession();
      } catch {
        localStorage.removeItem("ada_token");
        localStorage.removeItem("ada_user");
        await startGuestSession();
      } finally {
        if (alive) setLoading(false);
      }
    };
    boot();
    return () => { alive = false; };
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
