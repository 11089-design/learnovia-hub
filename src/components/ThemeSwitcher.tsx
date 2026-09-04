import { useEffect, useState } from "react";
import { Palette, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const THEMES = [
  { id: "lavender", label: "Lavender", swatch: "linear-gradient(135deg,#6C63FF,#A78BFA)" },
  { id: "neon", label: "Neon (dark)", swatch: "linear-gradient(135deg,#F5F32B,#1b1c2e)" },
  { id: "sunset", label: "Sunset", swatch: "linear-gradient(135deg,#C86A4A,#E7B77C)" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
const STORAGE_KEY = "learnova-theme";

/** Neon is a dark cyberpunk theme, so it also toggles the dark class. */
export function applyTheme(id: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (id === "lavender") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", id);
  root.classList.toggle("dark", id === "neon");

}


/** Restores the saved theme on mount. Kids routes override with their own theme. */
export function useThemeRestore() {
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) ?? "lavender";
    applyTheme(saved);
  }, []);
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<string>("lavender");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) ?? "lavender";
    setTheme(saved);
    applyTheme(saved);
  }, []);

  const pick = (id: string) => {
    setTheme(id);
    localStorage.setItem(STORAGE_KEY, id);
    applyTheme(id);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Change theme">
          <Palette className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {THEMES.map((t) => (
          <DropdownMenuItem key={t.id} onClick={() => pick(t.id)} className="gap-2">
            <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: t.swatch }} />
            <span className="flex-1">{t.label}</span>
            {theme === t.id && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
