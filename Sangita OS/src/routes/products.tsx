import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp } from "lucide-react";
import { inr } from "@/lib/utils";

export const Route = createFileRoute("/products")({
  head: () => ({ meta: [{ title: "Products — Sangita OS" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error("Failed to fetch products");
        const data = await res.json();
        setProducts(data.products || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 max-w-[1400px] mx-auto">
          <PageHeader
            eyebrow="Operations"
            title="Products"
            description="Loading products from database..."
          />
          <div className="grid grid-cols-3 gap-4">
            <SkeletonProduct />
            <SkeletonProduct />
            <SkeletonProduct />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6 max-w-[1400px] mx-auto">
          <PageHeader eyebrow="Operations" title="Products" description="Failed to load products" />
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-rose-400">
            {error}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        <PageHeader
          eyebrow="Operations"
          title="Products"
          description="MRR, users and churn across your SaaS portfolio — from real database records."
          actions={
            <Button size="sm" className="gap-2">
              <Plus className="h-3.5 w-3.5" /> Add product
            </Button>
          }
        />
        <div className="grid grid-cols-3 gap-4">
          {products.map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-card p-5">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {p.tier || "Standard"}
              </div>
              <div className="text-xl font-semibold mt-1">{p.name}</div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">MRR</div>
                  <div className="text-lg font-semibold text-primary">{inr(p.mrr || 0)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Users</div>
                  <div className="text-lg font-semibold">{p.users || 0}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Churn</div>
                  <div className="text-lg font-semibold text-rose-400">{p.churn || 0}%</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Growth</div>
                  <div className="text-lg font-semibold text-emerald-400 flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {p.delta || 0}%
                  </div>
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <div className="col-span-3 rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p>No products found. Add products to the database to see them here.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function SkeletonProduct() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-pulse">
      <div className="h-3 w-20 bg-muted rounded" />
      <div className="h-5 w-32 bg-muted rounded mt-1" />
      <div className="h-4 w-16 bg-muted rounded mt-4" />
      <div className="h-4 w-16 bg-muted rounded mt-2" />
      <div className="h-4 w-16 bg-muted rounded mt-2" />
      <div className="h-4 w-16 bg-muted rounded mt-2" />
    </div>
  );
}
