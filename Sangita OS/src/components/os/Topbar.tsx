import { useEffect, useState } from "react";
import { Search, Sparkles, Bell } from "lucide-react";
import { useOS } from "./os-store";

export function Topbar() {
  const { openPalette, openAI } = useOS();
  const [date, setDate] = useState("");

  useEffect(() => {
    setDate(
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    );
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openPalette();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        openAI();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openPalette, openAI]);

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border glass px-4 flex items-center gap-3">
      <button
        onClick={openPalette}
        className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-muted-foreground text-sm w-72 max-w-[40vw] hover:text-foreground transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Search anything…</span>
        <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted">⌘K</kbd>
      </button>

      <div className="flex-1" />

      <div className="hidden md:block text-xs text-muted-foreground">{date}</div>

      <button
        onClick={openAI}
        className="h-9 px-3 rounded-lg gradient-primary text-white text-sm inline-flex items-center gap-2 soft-shadow"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Ask AI
        <kbd className="text-[10px] px-1 py-0.5 rounded bg-white/10">⌘/</kbd>
      </button>

      <button className="h-9 w-9 grid place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground relative">
        <Bell className="h-4 w-4" />
        <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary" />
      </button>

      <img src="/Sanglogo.png" alt="Sangita Group" className="h-9 w-9 rounded-lg" />
    </header>
  );
}
