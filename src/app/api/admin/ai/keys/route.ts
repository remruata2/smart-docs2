import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { upsertApiKey, keyExistsWithSameSecret } from "@/lib/ai-key-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: "Authentication required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    const role = (session.user as any).role;
    if (!isAdmin(role))
      return NextResponse.json({ error: "Admin privileges required" }, { status: 403, headers: { "Cache-Control": "no-store" } });

    const keys = await prisma.aiApiKey.findMany({
      orderBy: [{ provider: "asc" }, { priority: "desc" }, { label: "asc" }],
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
    return NextResponse.json({ keys }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[AI-KEYS] GET error", e);
    return NextResponse.json({ error: "Failed to load API keys" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: "Authentication required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    const role = (session.user as any).role;
    if (!isAdmin(role))
      return NextResponse.json({ error: "Admin privileges required" }, { status: 403, headers: { "Cache-Control": "no-store" } });

    const body = await request.json();
    const { provider, label, apiKeyPlain, active, priority } = body || {};
    if (!provider || !label || !apiKeyPlain) {
      return NextResponse.json(
        { error: "provider, label and apiKeyPlain are required" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Duplicate plaintext key check per provider
    const dup = await keyExistsWithSameSecret(provider, apiKeyPlain);
    if (dup) {
      return NextResponse.json(
        { error: "This API key already exists for the selected provider." },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    const created = await upsertApiKey({ provider, label, apiKeyPlain, active, priority });
    const key = await prisma.aiApiKey.findUnique({
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
    return NextResponse.json({ success: true, key }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[AI-KEYS] POST error", e);
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
