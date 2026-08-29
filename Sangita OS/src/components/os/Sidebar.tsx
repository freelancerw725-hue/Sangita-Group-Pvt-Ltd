import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles, ExternalLink, Users, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV } from "@/lib/nav";
import { Badge } from "@/components/ui/badge";

function getLeadsUrl(): string | null {
  const url =
    (import.meta.env.VITE_LEADS_BASE_URL as string | undefined) ||
    (import.meta.env.VITE_LEAD_FINDER_BASE_URL as string | undefined) ||
    (import.meta.env.VITE_LEADS_URL as string | undefined) ||
    "";
  const trimmed = url.trim();
  return trimmed ? trimmed : null;
}

function getBulkMailUrl(): string | null {
  const url =
    (import.meta.env.VITE_BULK_MAIL_BASE_URL as string | undefined) ||
    (import.meta.env.VITE_BULK_MAIL_URL as string | undefined) ||
    "";
  const trimmed = url.trim();
  return trimmed ? trimmed : null;
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="sticky top-0 h-screen shrink-0 border-r border-border bg-sidebar flex flex-col"
    >
      <div className="h-14 flex items-center px-4 border-b border-border gap-2">
        <div className="h-8 w-8 rounded-lg gradient-primary grid place-items-center soft-shadow">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold tracking-tight">Sangita OS</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Business OS</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="h-7 w-7 rounded-md hover:bg-accent grid place-items-center text-muted-foreground"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <div className="px-2 mb-1 text-[10px] uppercase tracking-widest text-muted-foreground/70">
                {group.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.to;
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={cn(
                        "group flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors",
                        active
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.title}</span>
                          {item.badge && (
                            <Badge
                              variant="secondary"
                              className="h-4 px-1.5 text-[10px] bg-primary/15 text-primary border-primary/20"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="p-3 border-t border-border space-y-3">
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="text-xs font-medium">Business Health</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-semibold tracking-tight">82</span>
              <span className="text-xs text-emerald-400">+4 this week</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full gradient-primary" style={{ width: "82%" }} />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-3">
            <div className="text-xs font-medium">Plugins</div>
            <div className="mt-2 space-y-2">
              {(() => {
                const leadsUrl = getLeadsUrl();
                if (leadsUrl) {
                  return (
                    <a
                      key="leads"
                      href={leadsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-accent/50 transition-colors"
                      aria-label="Open Leads in new tab"
                    >
                      <Users className="h-4 w-4 shrink-0 text-emerald-500" />
                      <span className="flex-1 truncate">Leads</span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    </a>
                  );
                }
                return (
                  <div key="leads-disabled" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground/50">
                    <Users className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span className="flex-1 truncate">Leads</span>
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded">Not configured</span>
                  </div>
                );
              })()}
              {(() => {
                const bulkMailUrl = getBulkMailUrl();
                if (bulkMailUrl) {
                  return (
                    <a
                      key="bulk-mail"
                      href={bulkMailUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-accent/50 transition-colors"
                      aria-label="Open Bulk Mail in new tab"
                    >
                      <Mail className="h-4 w-4 shrink-0 text-emerald-500" />
                      <span className="flex-1 truncate">Bulk Email</span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    </a>
                  );
                }
                return (
                  <div key="bulk-mail-disabled" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground/50">
                    <Mail className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span className="flex-1 truncate">Bulk Email</span>
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded">Not configured</span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </motion.aside>
  );
}