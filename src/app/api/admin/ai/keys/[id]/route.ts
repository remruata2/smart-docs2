import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptSecret, keyExistsWithSameSecret } from "@/lib/ai-key-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    const role = (session.user as any).role;
    if (!isAdmin(role)) return NextResponse.json({ error: "Admin privileges required" }, { status: 403, headers: { "Cache-Control": "no-store" } });

    const { id: idStr } = await context.params;
    const id = Number(idStr);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400, headers: { "Cache-Control": "no-store" } });

    const key = await prisma.aiApiKey.findUnique({
      where: { id },
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
    if (!key) return NextResponse.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ key }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[AI-KEYS] GET /[id] error", e);
    return NextResponse.json({ error: "Failed to load API key" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const role = (session.user as any).role;
    if (!isAdmin(role)) return NextResponse.json({ error: "Admin privileges required" }, { status: 403 });

    const { id: idStr } = await context.params;
    const id = Number(idStr);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const { provider, label, apiKeyPlain, active, priority } = body || {};

    const data: any = {
      provider: provider ? String(provider).toLowerCase() : undefined,
      label: label ?? undefined,
      active: typeof active === "boolean" ? active : undefined,
      priority: Number.isFinite(Number(priority)) ? Number(priority) : undefined,
    };
    if (apiKeyPlain && typeof apiKeyPlain === 'string') {
      // Check duplicate against other keys for this provider
      const providerForCheck = data.provider ?? (await prisma.aiApiKey.findUnique({ where: { id }, select: { provider: true } }))?.provider;
      if (providerForCheck) {
        const dup = await keyExistsWithSameSecret(providerForCheck as any, apiKeyPlain, id);
        if (dup) {
          return NextResponse.json(
            { error: "This API key already exists for the selected provider." },
            { status: 409, headers: { "Cache-Control": "no-store" } }
          );
        }
      }
      data.api_key_enc = encryptSecret(apiKeyPlain);
    }

    const updated = await prisma.aiApiKey.update({
      where: { id },
      data,
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
    return NextResponse.json({ success: true, key: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[AI-KEYS] PUT /[id] error", e);
    return NextResponse.json({ error: "Failed to update API key" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const role = (session.user as any).role;
    if (!isAdmin(role)) return NextResponse.json({ error: "Admin privileges required" }, { status: 403 });

    const { id: idStr } = await context.params;
    const id = Number(idStr);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.aiApiKey.delete({ where: { id } });
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[AI-KEYS] DELETE /[id] error", e);
    return NextResponse.json({ error: "Failed to delete API key" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
