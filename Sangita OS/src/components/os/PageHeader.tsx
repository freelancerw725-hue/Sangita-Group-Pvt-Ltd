import { type ReactNode } from "react";

export function PageHeader({
  title, eyebrow, description, actions,
}: {
  title: string; eyebrow?: string; description?: string; actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        {eyebrow && (
          <div className="text-[10px] uppercase tracking-widest text-primary/80 mb-1">{eyebrow}</div>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions}
    </div>
  );
}