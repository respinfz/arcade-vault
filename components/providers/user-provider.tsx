"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { ScoreEntry, User } from "@/lib/types";

interface UserContextValue {
  user: User | null;
  login: (name: string) => void;
  logout: () => void;
  saveScore: (entry: Omit<ScoreEntry, "at">) => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("av_user");
      if (stored) setUser(JSON.parse(stored));
    } catch {
      // localStorage no disponible (modo privado, etc.) — se ignora.
    }
  }, []);

  const login = useCallback((name: string) => {
    const nextUser: User = { name };
    setUser(nextUser);
    try {
      localStorage.setItem("av_user", JSON.stringify(nextUser));
    } catch {
      // localStorage no disponible — la sesión sigue funcionando en memoria.
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem("av_user");
    } catch {
      // localStorage no disponible.
    }
  }, []);

  const saveScore = useCallback((entry: Omit<ScoreEntry, "at">) => {
    const fullEntry: ScoreEntry = { ...entry, at: Date.now() };
    try {
      const stored = localStorage.getItem("av_scores");
      const scores: ScoreEntry[] = stored ? JSON.parse(stored) : [];
      scores.push(fullEntry);
      localStorage.setItem("av_scores", JSON.stringify(scores));
    } catch {
      // localStorage no disponible — el puntaje no persiste entre recargas.
    }
  }, []);

  return (
    <UserContext.Provider value={{ user, login, logout, saveScore }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser debe usarse dentro de <UserProvider>");
  return ctx;
}
