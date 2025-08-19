import { LlamaParseReader } from "llamaindex";
import { getProviderApiKey, recordKeyUsage } from "@/lib/ai-key-store";

export class LlamaParseDocumentParser {
  /**
   * Parses a document from a file path using LlamaParse.
   * Selects a DB-managed key for provider "llamaparse" with rotation.
   * Falls back to LLAMAPARSE_API_KEY env var if no DB key is active.
   * Records usage success/failure when a DB key is used.
   */
  public async parseFile(filePath: string): Promise<string> {
    const { apiKey, keyId } = await getProviderApiKey({ provider: "llamaparse" });
    const fallback = process.env.LLAMAPARSE_API_KEY || "";
    const keyToUse = apiKey || fallback;
    if (!keyToUse) {
      throw new Error(
        "No LlamaParse API key configured. Add a key in admin settings or set LLAMAPARSE_API_KEY."
      );
    }

    const reader = new LlamaParseReader({
      apiKey: keyToUse,
      resultType: "markdown",
    });

    let ok = false;
    try {
      console.log(`[LlamaParse] Parsing file: ${filePath} using ${apiKey ? "db" : "env"} key`);
      const documents = await reader.loadData(filePath);
      if (!documents || documents.length === 0) {
        throw new Error("LlamaParse returned no documents.");
      }
      const content = documents.map((doc) => doc.text).join("\n\n");
      ok = true;
      return content;
    } catch (error) {
      throw error;
    } finally {
      if (keyId) {
        // Only record usage for DB-managed keys
        recordKeyUsage(keyId, ok).catch(() => {});
      }
    }
  }
}
