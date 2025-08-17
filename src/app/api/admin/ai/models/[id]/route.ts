import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Ensure this route is always dynamic and never cached
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: "Authentication required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    const role = (session.user as any).role;
    if (!isAdmin(role))
      return NextResponse.json({ error: "Admin privileges required" }, { status: 403, headers: { "Cache-Control": "no-store" } });

    const { id: idParam } = await ctx.params;
    const id = Number(idParam);
    if (!Number.isFinite(id))
      return NextResponse.json({ error: "Invalid id" }, { status: 400, headers: { "Cache-Control": "no-store" } });

    const model = await (prisma as any).aiModel?.findUnique?.({
      where: { id },
      select: { id: true, provider: true, name: true, label: true, active: true, priority: true },
    });
    if (!model) return NextResponse.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ model }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[AI-MODELS] GET /[id] error", e);
    return NextResponse.json({ error: "Failed to load model" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    const role = (session.user as any).role;
    if (!isAdmin(role))
      return NextResponse.json(
        { error: "Admin privileges required" },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );

    const { id: idParam } = await ctx.params;
    const id = Number(idParam);
    if (!Number.isFinite(id))
      return NextResponse.json(
        { error: "Invalid id" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );

    const body = await request.json();
    const { provider, name, label, active, priority } = body || {};

    const updated = await (prisma as any).aiModel.update({
      where: { id },
      data: {
        provider: provider ? String(provider).toLowerCase() : undefined,
        name: name ?? undefined,
        label: label ?? undefined,
        active: typeof active === "boolean" ? active : undefined,
        priority: Number.isFinite(Number(priority)) ? Number(priority) : undefined,
      },
      select: { id: true, provider: true, name: true, label: true, active: true, priority: true },
    });
    return NextResponse.json({ success: true, model: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[AI-MODELS] PUT /[id] error", e);
    return NextResponse.json({ error: "Failed to update model" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    const role = (session.user as any).role;
    if (!isAdmin(role))
      return NextResponse.json(
        { error: "Admin privileges required" },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );

    const { id: idParam } = await ctx.params;
    const id = Number(idParam);
    if (!Number.isFinite(id))
      return NextResponse.json(
        { error: "Invalid id" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );

    await (prisma as any).aiModel.delete({ where: { id } });
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[AI-MODELS] DELETE /[id] error", e);
    return NextResponse.json({ error: "Failed to delete model" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
