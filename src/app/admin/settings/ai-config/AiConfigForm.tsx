"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  searchLimit: z
    .number({ invalid_type_error: "Search limit must be a number" })
    .int()
    .min(1, "Minimum is 1")
    .max(200, "Maximum is 200"),
});

export default function AiConfigForm() {
  const [searchLimit, setSearchLimit] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/settings/ai-config", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && res.ok && data?.data?.searchLimit) {
          setSearchLimit(Number(data.data.searchLimit));
        }
      } catch (e) {
        console.error("Load AI config failed", e);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parse = schema.safeParse({ searchLimit });
    if (!parse.success) {
      const msg = parse.error.issues[0]?.message || "Invalid input";
      toast.error(msg);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/admin/settings/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchLimit }),
      });
      const data = await res.json();
      if (res.ok) {
        setSearchLimit(Number(data?.data?.searchLimit ?? searchLimit));
        toast.success("Search limit updated");
      } else {
        toast.error(data?.error || "Failed to update settings");
      }
    } catch (e) {
      console.error(e);
      toast.error("Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="searchLimit">Hybrid search limit</Label>
        <Input
          id="searchLimit"
          type="number"
          min={1}
          max={200}
          value={Number.isFinite(searchLimit) ? searchLimit : 30}
          onChange={(e) => setSearchLimit(Number(e.target.value))}
          className="w-40"
        />
        <p className="text-sm text-muted-foreground">
          Controls how many records the hybrid search retrieves. Range: 1–200.
        </p>
      </div>

      <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
        {loading ? "Saving..." : "Update Settings"}
      </Button>
    </form>
  );
}
