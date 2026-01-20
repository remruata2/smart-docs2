"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const schema = z.object({
  searchLimit: z
    .number({ message: "Search limit must be a number" })
    .int()
    .min(1, "Minimum is 1")
    .max(200, "Maximum is 200"),
});

interface ModelSettings {
  chat: string;
  translation: string;
  comparison: string;
  title_gen: string;
  textbook_content: string;
  textbook_image: string;
  textbook_parser: string;
  // Chat-specific models
  chat_primary: string;
  chat_fallback: string;
  chat_analyzer: string;
  chat_image: string;
}

export default function AiConfigForm() {
  const [searchLimit, setSearchLimit] = useState<number>(30);
  const [models, setModels] = useState<ModelSettings>({
    chat: "",
    translation: "",
    comparison: "",
    title_gen: "",
    textbook_content: "",
    textbook_image: "",
    textbook_parser: "",
    chat_primary: "",
    chat_fallback: "",
    chat_analyzer: "",
    chat_image: "",
  });
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/settings/ai-config", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && res.ok) {
          if (data.data.searchLimit) setSearchLimit(Number(data.data.searchLimit));
          if (data.data.models) setModels(data.data.models);
          if (data.data.availableModels) setAvailableModels(data.data.availableModels);
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
        body: JSON.stringify({ searchLimit, models }),
      });
      if (res.ok) {
        toast.success("AI configuration updated");
      } else {
        const data = await res.json();
        toast.error(data?.error || "Failed to update settings");
      }
    } catch (e) {
      console.error(e);
      toast.error("Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  const updateModel = (key: keyof ModelSettings, value: string) => {
    setModels(prev => ({ ...prev, [key]: value }));
  };

  const modelFields: { key: keyof ModelSettings; label: string; description: string; placeholder: string }[] = [
    // Chat Models (Student-facing)
    { key: "chat_primary", label: "Chat Primary", description: "Primary model for student chat responses.", placeholder: "gemini-3-flash-preview" },
    { key: "chat_fallback", label: "Chat Fallback", description: "Fallback when primary chat model fails.", placeholder: "gemini-2.5-flash" },
    { key: "chat_analyzer", label: "Query Analyzer", description: "Fast model for analyzing student queries.", placeholder: "gemini-2.0-flash" },
    { key: "chat_image", label: "Chat Image Generation", description: "Model for generating educational diagrams in chat.", placeholder: "gemini-2.5-flash-image" },
    // Textbook Models
    { key: "textbook_content", label: "Textbook Content", description: "Primary model for generating textbook chapters.", placeholder: "gemini-3-pro-preview" },
    { key: "textbook_image", label: "Textbook Images", description: "Used for generating high-quality educational diagrams.", placeholder: "gemini-2.5-flash-image" },
    { key: "textbook_parser", label: "Syllabus Parser", description: "Used for parsing syllabus structure.", placeholder: "gemini-3-flash-preview" },
    // Other Features
    { key: "chat", label: "Legacy Chat (deprecated)", description: "Old chat model key - may not be used.", placeholder: "gemini-2.0-flash" },
    { key: "translation", label: "Translation model", description: "Used for multi-language content translation.", placeholder: "gemini-3-flash-preview" },
    { key: "comparison", label: "Document Comparison", description: "Used for comparing different document versions.", placeholder: "gemini-3-flash-preview" },
    { key: "title_gen", label: "Title Generation", description: "Used for generating conversation titles.", placeholder: "gemini-2.0-flash" },
  ];

  return (
    <form onSubmit={onSubmit} className="space-y-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Search Configuration</CardTitle>
          <CardDescription>Configure how AI search behaves.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature Model Mapping</CardTitle>
          <CardDescription>Assign specific AI models to different application features.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {modelFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                <Select value={models[field.key] || "__default__"} onValueChange={(val) => updateModel(field.key, val === "__default__" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Default (${field.placeholder})`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">Use Default ({field.placeholder})</SelectItem>
                    {availableModels.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{field.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full md:w-auto">
        {loading ? "Saving..." : "Save All Configuration"}
      </Button>
    </form>
  );
}
