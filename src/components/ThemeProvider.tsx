"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

type Mode = "system" | "light" | "dark";
type Accent = "blue" | "purple" | "cyan" | "green" | "graphite";

interface ThemeState {
  mode: Mode;
  accent: Accent;
  setMode: (m: Mode) => void;
  setAccent: (a: Accent) => void;
  resolved: "light" | "dark";
}

const ThemeContext = createContext<ThemeState>({
  mode: "system",
  accent: "blue",
  setMode: () => {},
  setAccent: () => {},
  resolved: "light",
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function loadPrefs(): { mode: Mode; accent: Accent } {
  if (typeof window === "undefined") return { mode: "system", accent: "blue" };
  try {
    const raw = localStorage.getItem("nr_theme");
    if (raw) {
      const p = JSON.parse(raw);
      return {
        mode: ["system", "light", "dark"].includes(p.mode) ? p.mode : "system",
        accent: ["blue", "purple", "cyan", "green", "graphite"].includes(p.accent) ? p.accent : "blue",
      };
    }
  } catch {}
  return { mode: "system", accent: "blue" };
}

function savePrefs(mode: Mode, accent: Accent) {
  try {
    localStorage.setItem("nr_theme", JSON.stringify({ mode, accent }));
  } catch {}
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>(() => loadPrefs().mode);
  const [accent, setAccentState] = useState<Accent>(() => loadPrefs().accent);
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    function update() {
      const base = mode === "system" ? getSystemTheme() : mode;
      setResolved(base);
      document.documentElement.setAttribute("data-theme", base);
      document.documentElement.setAttribute("data-accent", accent);
    }
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [mode, accent]);

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    savePrefs(m, accent);
  }, [accent]);

  const setAccent = useCallback((a: Accent) => {
    setAccentState(a);
    savePrefs(mode, a);
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, accent, setMode, setAccent, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}
