import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Provider } from "@/generated/prisma";
import path from "path";
import fs from "fs";

// Ensure this route is always dynamic and never cached
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const role = (session.user as any).role;
    if (!isAdmin(role)) {
      return NextResponse.json({ error: "Admin privileges required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");
    if (mode === "admin") {
      try {
        const all = await prisma.aiModel.findMany({
          orderBy: [{ provider: "asc" }, { priority: "desc" }, { label: "asc" }],
          select: { id: true, provider: true, name: true, label: true, active: true, priority: true },
        });
        return NextResponse.json(
          { models: Array.isArray(all) ? all : [] },
          { headers: { "Cache-Control": "no-store" } }
        );
      } catch (e) {
        console.warn("[AI-MODELS] admin list failed", e);
        return NextResponse.json({ models: [] }, { headers: { "Cache-Control": "no-store" } });
      }
    }

    const provider = (searchParams.get("provider") || "gemini").toLowerCase() as Provider;

    // Try DB first (if AiModel exists), else fall back to config file
    try {
      const models = await prisma.aiModel.findMany({
        where: { provider: provider as Provider, active: true },
        orderBy: [{ priority: "desc" }, { label: "asc" }],
        select: { name: true, label: true },
      });
      if (Array.isArray(models) && models.length > 0) {
        return NextResponse.json({ provider, models }, { headers: { "Cache-Control": "no-store" } });
      }
    } catch (e) {
      console.warn("[AI-MODELS] DB lookup failed or table missing, using config fallback");
    }

    // Fallback to config file
    try {
      const cfgPath = path.join(process.cwd(), "src", "config", "ai-models.json");
      const file = fs.readFileSync(cfgPath, "utf8");
      const data = JSON.parse(file) as Record<string, Array<{ model: string; label: string; active?: boolean }>>;
      const list = (data[provider] || []).filter((m) => m.active !== false);
      const models = list.map((m) => ({ name: m.model, label: m.label }));
      return NextResponse.json({ provider, models }, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
      return NextResponse.json(
        { provider, models: [] },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }
  } catch (error) {
    console.error("[AI-MODELS] GET error", error);
    return NextResponse.json({ error: "Failed to load models" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const role = (session.user as any).role;
    if (!isAdmin(role)) {
      return NextResponse.json({ error: "Admin privileges required" }, { status: 403 });
    }

    const body = await request.json();
    const { provider, name, label, active, priority } = body || {};

    if (!provider || typeof provider !== "string") {
      return NextResponse.json({ error: "provider is required" }, { status: 400 });
    }
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!label || typeof label !== "string") {
      return NextResponse.json({ error: "label is required" }, { status: 400 });
    }

    try {
      const created = await prisma.aiModel.create({
        data: {
          provider: String(provider).toLowerCase() as Provider,
          name,
          label,
          active: active === undefined ? true : !!active,
          priority: Number.isFinite(Number(priority)) ? Number(priority) : 0,
        },
        select: { id: true, provider: true, name: true, label: true, active: true, priority: true },
      });
      return NextResponse.json({ success: true, model: created });
    } catch (e: any) {
      console.error("[AI-MODELS] POST create error", e);
      return NextResponse.json({ error: "Failed to create model" }, { status: 500 });
    }
  } catch (error) {
    console.error("[AI-MODELS] POST error", error);
    return NextResponse.json({ error: "Failed to create model" }, { status: 500 });
  }
}
