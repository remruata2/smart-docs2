import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import { getSettingInt, setSettingInt } from "@/lib/app-settings";

const SETTING_KEY = "ai.search.limit";
const DEFAULT_LIMIT = 30;
const MIN_LIMIT = 1;
const MAX_LIMIT = 200;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const userRole = (session.user as any).role;
    if (!isAdmin(userRole)) {
      return NextResponse.json({ error: "Admin privileges required" }, { status: 403 });
    }

    const searchLimit = await getSettingInt(SETTING_KEY, DEFAULT_LIMIT);
    return NextResponse.json({ success: true, data: { searchLimit } });
  } catch (error) {
    console.error("[ADMIN SETTINGS] GET ai-config error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load AI config" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const userRole = (session.user as any).role;
    if (!isAdmin(userRole)) {
      return NextResponse.json({ error: "Admin privileges required" }, { status: 403 });
    }

    const body = await request.json();
    const { searchLimit } = body || {};

    // Validate
    const parsed = Number(searchLimit);
    if (!Number.isFinite(parsed)) {
      return NextResponse.json(
        { error: "searchLimit must be a number" },
        { status: 400 }
      );
    }
    let clamped = Math.floor(parsed);
    if (clamped < MIN_LIMIT) clamped = MIN_LIMIT;
    if (clamped > MAX_LIMIT) clamped = MAX_LIMIT;

    await setSettingInt(SETTING_KEY, clamped);

    console.log(
      `[ADMIN SETTINGS] ${session.user.email} updated ${SETTING_KEY} to ${clamped}`
    );

    return NextResponse.json({ success: true, data: { searchLimit: clamped } });
  } catch (error) {
    console.error("[ADMIN SETTINGS] POST ai-config error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update AI config" },
      { status: 500 }
    );
  }
}
