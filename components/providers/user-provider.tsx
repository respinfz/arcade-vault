"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { ScoreEntry, User } from "@/lib/types";

interface UserContextValue {
  user: User | null;
  login: (name: string) => void;
  logout: () => void;
  saveScore: (entry: ScoreEntry) => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("av_user");
      // Lectura de localStorage diferida a post-montaje a propósito (evita
      // mismatch de hidratación entre el HTML del servidor y el cliente).
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const saveScore = useCallback(async (entry: ScoreEntry) => {
    const supabase = createClient();
    await supabase.from("av_scores").insert({
      game_id: entry.gameId,
      name: entry.name,
      score: entry.score,
    });
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
