import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import { getSettingInt, setSettingInt, getSetting, setSetting } from "@/lib/app-settings";
import { getActiveModelNames } from "@/lib/ai-key-store";

const SEARCH_LIMIT_KEY = "ai.search.limit";
const DEFAULT_LIMIT = 30;

// Model keys from refactor
const MODEL_KEYS = {
  // Legacy chat key (keeping for compatibility)
  chat: "ai.model.chat",
  translation: "ai.model.translation",
  comparison: "ai.model.comparison",
  title_gen: "ai.model.title_gen",
  // Textbook models
  textbook_content: "ai.model.textbook.content",
  textbook_image: "ai.model.textbook.image",
  textbook_parser: "ai.model.textbook.parser",
  // Chat-specific models
  chat_primary: "ai.model.chat.primary",
  chat_fallback: "ai.model.chat.fallback",
  chat_analyzer: "ai.model.chat.analyzer",
  chat_image: "ai.model.chat.image",
  // Feature-specific models
  study_material: "ai.model.study_material",
  quiz_generation: "ai.model.quiz_generation",
  question_bank: "ai.model.question_bank",
};

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

    const searchLimit = await getSettingInt(SEARCH_LIMIT_KEY, DEFAULT_LIMIT);

    // Fetch current model settings
    const models: Record<string, string> = {};
    for (const [key, dbKey] of Object.entries(MODEL_KEYS)) {
      models[key] = await getSetting(dbKey) || "";
    }

    // Fetch available models from DB for the dropdowns
    const availableModels = await getActiveModelNames("gemini");

    return NextResponse.json({
      success: true,
      data: {
        searchLimit,
        models,
        availableModels
      }
    });
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
    const { searchLimit, models } = body || {};

    if (searchLimit !== undefined) {
      const parsed = Number(searchLimit);
      if (Number.isFinite(parsed)) {
        let clamped = Math.floor(parsed);
        if (clamped < 1) clamped = 1;
        if (clamped > 200) clamped = 200;
        await setSettingInt(SEARCH_LIMIT_KEY, clamped);
      }
    }

    if (models && typeof models === 'object') {
      for (const [key, value] of Object.entries(models)) {
        const dbKey = (MODEL_KEYS as any)[key];
        if (dbKey && typeof value === 'string') {
          await setSetting(dbKey, value);
        }
      }
    }

    console.log(`[ADMIN SETTINGS] ${session.user.email} updated AI configuration`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN SETTINGS] POST ai-config error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update AI config" },
      { status: 500 }
    );
  }
}
