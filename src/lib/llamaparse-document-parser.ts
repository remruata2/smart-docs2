import { LlamaParseReader } from "llama-cloud-services";
import { getProviderApiKey, recordKeyUsage } from "@/lib/ai-key-store";

// Suppress llamaindex duplicate import warning (harmless - happens when package is imported multiple times)
// This is a known issue with llama-cloud-services and doesn't affect functionality
if (typeof process !== "undefined" && process.env.NODE_ENV !== "development") {
	const originalWarn = console.warn;
	console.warn = (...args: any[]) => {
		const message = args[0];
		if (typeof message === "string" && message.includes("llamaindex was already imported")) {
			return; // Suppress this specific warning in production
		}
		originalWarn.apply(console, args);
	};
}

export interface LlamaParseOptions {
	fastMode?: boolean; // If true, uses "fast" mode (cheaper, no OCR)
	language?: "en" | "es" | "fr" | "de" | "it" | "pt" | "ja" | "zh" | string;
	parsingInstruction?: string; // "Extract tables as markdown"
	splitByPage?: boolean; // Keep page structure?
}

export class LlamaParseDocumentParser {
	/**
	 * Parses a document with advanced configuration.
	 */
	public async parseFile(
		filePath: string,
		options: LlamaParseOptions = {}
	): Promise<any> {
		const { apiKey, keyId } = await getProviderApiKey({
			provider: "llamaparse",
		});
		const fallback = process.env.LLAMAPARSE_API_KEY || "";
		const keyToUse = apiKey || fallback;

		if (!keyToUse) {
			throw new Error(
				"No LlamaParse API key configured. Add a key in admin settings or set LLAMAPARSE_API_KEY."
			);
		}

		let ok = false;
		try {
			const mode = options.fastMode
				? "FAST (Text-Only)"
				: "PREMIUM (OCR+Layout)";
			console.log(`[LlamaParse] Parsing file: ${filePath}`);
			console.log(`[LlamaParse] Mode: ${mode} | Key Source: ${apiKey ? "DB" : "ENV"}`);

			if (keyToUse) {
				console.log(`[LlamaParse-DEBUG] Key loaded. Length: ${keyToUse.length}, Prefix: ${keyToUse.substring(0, 4)}...`);
			} else {
				console.error(`[LlamaParse-DEBUG] NO KEY LOADED!`);
			}

			// Use loadJson method from llama-cloud-services
			const reader = new LlamaParseReader({
				apiKey: keyToUse.trim(), // Ensure no whitespace
				language: (options.language || "en") as any,
				parsingInstruction: options.parsingInstruction,
				premiumMode: !options.fastMode,
			});

			const maxRetries = 3;
			let jsonObjs;

			for (let i = 0; i < maxRetries; i++) {
				try {
					console.log(`[LlamaParse] Attempt ${i + 1}/${maxRetries}...`);
					// loadJson returns an array of objects with pages, job_metadata, etc.
					jsonObjs = await reader.loadJson(filePath);
					break; // Success
				} catch (err: any) {
					const errorMessage = err.message || String(err);
					console.warn(`[LlamaParse] Attempt ${i + 1} failed:`, errorMessage);

					// Check for LlamaParse API credit limit error
					const errorDetail = err.detail || errorMessage || "";
					if (errorDetail.includes("exceeded the maximum number of credits") ||
						errorDetail.includes("credits for your plan")) {
						const creditError = new Error("LlamaParse API credit limit exceeded. Please upgrade your LlamaParse plan or wait for credits to reset.");
						(creditError as any).isCreditLimit = true;
						throw creditError;
					}

					// Handle "fetch failed" (common in Node 18+ for networking issues)
					if (errorMessage.includes("fetch failed")) {
						console.error("[LlamaParse] Network error ('fetch failed'). This often indicates a DNS issue, unstable internet, or LlamaParse being temporarily unreachable.");
						if (i === maxRetries - 1) {
							throw new Error("LlamaParse parsing failed due to persistent network issues ('fetch failed'). Please check your internet connection and try again.");
						}
					}

					if (i === maxRetries - 1) throw err; // Throw on last attempt

					// Progressive wait before retry (2s, 5s, 10s)
					const delay = [2000, 5000, 10000][i] || 5000;
					await new Promise(resolve => setTimeout(resolve, delay));
				}
			}

			if (!jsonObjs || jsonObjs.length === 0) {
				console.error("[LlamaParse-DEBUG] jsonObjs is empty or undefined:", JSON.stringify(jsonObjs));
				throw new Error("LlamaParse returned no documents.");
			}

			// Extract pages from the first result
			// jsonObjs[0] has structure: { pages: [...], job_metadata: {...}, job_id: string, file_path: string }
			const result = jsonObjs[0];
			if (!result.pages || result.pages.length === 0) {
				throw new Error("LlamaParse returned no pages.");
			}

			ok = true;
			console.log(`[LlamaParse] Successfully parsed ${result.pages.length} pages`);

			// Debug: Log the structure of the first page to see what data we have
			if (result.pages[0]) {
				console.log(`[LlamaParse-DEBUG] First page structure:`, {
					hasText: !!result.pages[0].text,
					hasMd: !!result.pages[0].md,
					hasImages: !!result.pages[0].images,
					hasItems: !!result.pages[0].items,
					itemsCount: result.pages[0].items?.length || 0,
					hasWidth: 'width' in result.pages[0],
					hasHeight: 'height' in result.pages[0],
					width: result.pages[0].width,
					height: result.pages[0].height,
					allKeys: Object.keys(result.pages[0]),
					sampleItem: result.pages[0].items?.[0]
				});
			}

			// Return the pages array
			// Each page has: { page: number, text: string, md: string, images: [], items: [] }
			return result.pages;
		} catch (error) {
			console.error("[LlamaParse] Error:", error);
			throw error;
		} finally {
			if (keyId) {
				recordKeyUsage(keyId, ok).catch(() => { });
			}
		}
	}
}
