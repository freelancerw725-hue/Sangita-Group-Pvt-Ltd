import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { NAV } from "@/lib/nav";
import { useOS } from "./os-store";
import { Sparkles } from "lucide-react";

export function CommandPalette() {
  const { paletteOpen, closePalette, openAI } = useOS();
  const navigate = useNavigate();
  const go = (to: string) => {
    closePalette();
    navigate({ to });
  };

  return (
    <CommandDialog
      open={paletteOpen}
      onOpenChange={(o) => {
        if (!o) closePalette();
      }}
    >
      <CommandInput placeholder="Search modules, actions, ask AI…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              closePalette();
              openAI();
            }}
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Ask Sangita AI…</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        {NAV.map((g) => (
          <CommandGroup key={g.label} heading={g.label}>
            {g.items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem key={item.to} onSelect={() => go(item.to)}>
                  <Icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
