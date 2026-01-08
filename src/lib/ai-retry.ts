
import { getProviderApiKey, recordKeyUsage } from "@/lib/ai-key-store";
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

/**
 * Execute a Google Generative AI operation with automatic key rotation on rate limits (429).
 * This wrapper handles:
 * 1. Fetching an active API key (excluding previously failed ones in this session).
 * 2. Creating the GoogleGenerativeAI client.
 * 3. Executing the operation.
 * 4. Recording usage stats (success/error).
 * 5. Retrying with a new key if a Rate Limit (429) occurs.
 */
export async function executeGeminiWithRetry<T>(
    operation: (model: GenerativeModel, keyInfo: { keyId: number | null; keyLabel: string | null }) => Promise<T>,
    options: {
        modelName: string;
        maxRetries?: number;
        logLabel?: string;
    }
): Promise<{ result: T; keyId: number | null; keyLabel: string | null }> {
    let attempts = 0;
    const maxAttempts = options.maxRetries || 3;
    const usedKeyIds: number[] = [];
    const label = options.logLabel || "AI-RETRY";

    while (true) {
        attempts++;

        // 1. Get API Key
        const { apiKey, keyId, keyLabel } = await getProviderApiKey({
            provider: 'gemini',
            excludeKeyIds: usedKeyIds
        });
        const keyToUse = apiKey || process.env.GEMINI_API_KEY;
        const currentLabel = keyLabel || (apiKey ? "Unknown DB Key" : "ENV Variable");

        if (!keyToUse) {
            throw new Error("No Gemini API keys available/configured");
        }

        // 2. Initialize Client
        const client = new GoogleGenerativeAI(keyToUse);
        const model = client.getGenerativeModel({ model: options.modelName });

        try {
            // 3. Execute Operation
            const result = await operation(model, { keyId, keyLabel: currentLabel });

            // 4. Record Success
            if (keyId) await recordKeyUsage(keyId, true);

            return { result, keyId, keyLabel: currentLabel };

        } catch (error: any) {
            // 4. Record Failure
            if (keyId) await recordKeyUsage(keyId, false);

            const errorMsg = error.message || String(error);
            const isRateLimit =
                errorMsg.includes('429') ||
                error.status === 429 ||
                errorMsg.toLowerCase().includes('rate limit');

            // 5. Retry on Rate Limit
            if (isRateLimit && attempts < maxAttempts) {
                console.warn(`[${label}] Key "${currentLabel}" (${keyId}) rate limited. Rotating...`);
                if (keyId) usedKeyIds.push(keyId);
                // Small backoff
                await new Promise(r => setTimeout(r, 500));
                continue;
            }

            // Re-throw other errors
            console.warn(`[${label}] Operation failed with Key "${currentLabel}" (Attempt ${attempts}):`, errorMsg);
            throw error;
        }
    }
}
