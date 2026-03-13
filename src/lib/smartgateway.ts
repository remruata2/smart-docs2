import crypto from "crypto";

import fs from "fs";
import path from "path";

const merchantId = process.env.SMARTGATEWAY_MERCHANT_ID;
const keyId = process.env.SMARTGATEWAY_KEY_ID;

// Helper to sanitize keys from env (handling newlines and quotes)
function sanitizeKey(key: string | undefined): string | undefined {
    if (!key || key.includes("your_public_key_string") || key.includes("your_private_key_string")) return undefined;
    return key.replace(/\\n/g, '\n').replace(/^["']|["']$/g, '');
}

function loadKey(fileName: string, envVar: string | undefined): string {
    // 1. Try File (Lowest precedence in env, but preferred if files are pushed)
    try {
        const keyPath = path.join(process.cwd(), fileName);
        if (fs.existsSync(keyPath)) {
            const content = fs.readFileSync(keyPath, 'utf8');
            if (content && content.length > 50) {
                console.log(`[SMARTGATEWAY] Loaded ${fileName} from disk`);
                return content;
            }
        }
    } catch (error) {
        console.warn(`[SMARTGATEWAY] Error reading ${fileName}:`, error);
    }

    // 2. Try Env (Sanitized)
    const sanitized = sanitizeKey(envVar);
    if (sanitized) {
        console.log(`[SMARTGATEWAY] Loaded key for ${fileName} from environment`);
        return sanitized;
    }

    console.warn(`[SMARTGATEWAY] Warning: No valid key found for ${fileName}`);
    return "";
}

const publicKey = loadKey('key_32609c0122f6470093972bd2e90064dd.pem', process.env.SMARTGATEWAY_PUBLIC_KEY);
const privateKey = loadKey('privateKey.pem', process.env.SMARTGATEWAY_PRIVATE_KEY);

const baseUrl = process.env.SMARTGATEWAY_BASE_URL || "https://smartgatewayuat.hdfcbank.com";

let juspayClient: any = null;

export function getSmartGateway() {
    if (!juspayClient) {
        // Try CommonJS require
        const expressCheckout = require("expresscheckout-nodejs");
        const Juspay = expressCheckout.Juspay || expressCheckout;
        
        juspayClient = new Juspay({
            merchantId: merchantId || "",
            baseUrl: baseUrl,
            jweAuth: {
                keyId: keyId || "",
                publicKey: publicKey,
                privateKey: privateKey,
            }
        });
    }
    return juspayClient;
}

/**
 * Verify SmartGateway webhook signature
 * Note: SmartGateway typically uses JWS or a specific signature header.
 * Based on common Juspay integrations, it might be a 'x-juspay-signature'.
 */
export function verifySmartGatewaySignature(
    payload: string,
    signature: string,
    secret: string
): boolean {
    const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

    const match = expectedSignature === signature;
    if (!match) {
        console.log(`[VERIFY-SG] Expected: ${expectedSignature}`);
        console.log(`[VERIFY-SG] Received: ${signature}`);
    }

    return match;
}
