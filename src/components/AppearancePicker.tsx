"use client";

import { useTheme } from "./ThemeProvider";

const ACCENT_COLORS = [
  { id: "blue" as const, color: "#007AFF", label: "Blue" },
  { id: "purple" as const, color: "#AF52DE", label: "Purple" },
  { id: "cyan" as const, color: "#32ADE6", label: "Cyan" },
  { id: "green" as const, color: "#34C759", label: "Green" },
  { id: "graphite" as const, color: "#8E8E93", label: "Graphite" },
];

const MODE_OPTIONS = [
  { id: "system" as const, label: "System", icon: "◉" },
  { id: "light" as const, label: "Light", icon: "☀" },
  { id: "dark" as const, label: "Dark", icon: "☾" },
];

export default function AppearancePicker() {
  const { mode, accent, setMode, setAccent } = useTheme();

  return (
    <div className="space-y-8">
      {/* Mode */}
      <div>
        <h3 className="text-[14px] font-medium text-text-primary">Appearance</h3>
        <p className="mt-1 text-[13px] text-text-secondary">Choose light, dark, or system theme.</p>
        <div className="mt-4 flex gap-2">
          {MODE_OPTIONS.map((o) => (
            <button
              key={o.id}
              onClick={() => setMode(o.id)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-200 ${
                mode === o.id
                  ? "bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]"
                  : "border border-border bg-[var(--surface-solid)] text-text-secondary hover:border-border-hover"
              }`}
            >
              <span>{o.icon}</span>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Accent */}
      <div>
        <h3 className="text-[14px] font-medium text-text-primary">Accent Color</h3>
        <p className="mt-1 text-[13px] text-text-secondary">Personalize your interface color.</p>
        <div className="mt-4 flex gap-3">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => setAccent(c.id)}
              className={`group flex flex-col items-center gap-2`}
              aria-label={c.label}
            >
              <div
                className={`relative h-10 w-10 rounded-full transition-all duration-200 ${
                  accent === c.id ? "ring-2 ring-offset-2 ring-offset-[var(--background)]" : ""
                }`}
                style={{
                  backgroundColor: c.color,
                  ["--tw-ring-color" as string]: accent === c.id ? c.color : undefined,
                }}
              >
                {accent === c.id && (
                  <svg className="absolute inset-0 m-auto text-white" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span className="text-[11px] text-text-tertiary">{c.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
