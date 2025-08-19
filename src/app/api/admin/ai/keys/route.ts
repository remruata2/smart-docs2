import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { keyExistsWithSameSecret, upsertApiKey } from "@/lib/ai-key-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    const role = (session.user as any).role;
    if (!isAdmin(role)) {
      return NextResponse.json({ error: "Admin privileges required" }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }

    const keys = await prisma.aiApiKey.findMany({
      orderBy: [{ provider: "asc" }, { priority: "desc" }, { id: "asc" }],
      select: {
        id: true,
        provider: true,
        label: true,
        active: true,
        priority: true,
        last_used_at: true,
        success_count: true,
        error_count: true,
        created_at: true,
        updated_at: true,
      },
    });
    return NextResponse.json({ keys: Array.isArray(keys) ? keys : [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[AI-KEYS] GET error", e);
    return NextResponse.json({ error: "Failed to load API keys" }, { status: 500, headers: { "Cache-Control": "no-store" } });
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
    const { provider, label, apiKeyPlain, active, priority } = body || {};

    if (!provider || typeof provider !== "string") {
      return NextResponse.json({ error: "provider is required" }, { status: 400 });
    }
    if (!label || typeof label !== "string") {
      return NextResponse.json({ error: "label is required" }, { status: 400 });
    }
    if (!apiKeyPlain || typeof apiKeyPlain !== "string") {
      return NextResponse.json({ error: "apiKeyPlain is required" }, { status: 400 });
    }

    // Prevent duplicate of same plaintext for same provider
    const dup = await keyExistsWithSameSecret(provider.toLowerCase() as any, apiKeyPlain);
    if (dup) {
      return NextResponse.json(
        { error: "This API key already exists for the selected provider." },
        { status: 409 }
      );
    }

    const created = await upsertApiKey({
      provider: provider.toLowerCase() as any,
      label,
      apiKeyPlain,
      active: active === undefined ? true : !!active,
      priority: Number.isFinite(Number(priority)) ? Number(priority) : 0,
    });

    const safe = await prisma.aiApiKey.findUnique({
      where: { id: created.id },
      select: {
        id: true,
        provider: true,
        label: true,
        active: true,
        priority: true,
        last_used_at: true,
        success_count: true,
        error_count: true,
        created_at: true,
        updated_at: true,
      },
    });

    return NextResponse.json({ success: true, key: safe }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[AI-KEYS] POST error", e);
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }
}
