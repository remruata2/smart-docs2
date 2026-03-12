import crypto from "crypto";

import fs from "fs";
import path from "path";

const merchantId = process.env.SMARTGATEWAY_MERCHANT_ID;
const keyId = process.env.SMARTGATEWAY_KEY_ID;

let publicKey = process.env.SMARTGATEWAY_PUBLIC_KEY;
try {
    const pubKeyPath = path.join(process.cwd(), 'key_32609c0122f6470093972bd2e90064dd.pem');
    if (fs.existsSync(pubKeyPath)) {
        publicKey = fs.readFileSync(pubKeyPath, 'utf8');
    }
} catch (error) {
    console.warn("Could not read key_32609c0122f6470093972bd2e90064dd.pem, falling back to environment variable.");
}

let privateKey = process.env.SMARTGATEWAY_PRIVATE_KEY;
try {
    const keyPath = path.join(process.cwd(), 'privateKey.pem');
    if (fs.existsSync(keyPath)) {
        privateKey = fs.readFileSync(keyPath, 'utf8');
    }
} catch (error) {
    console.warn("Could not read privateKey.pem, falling back to environment variable.");
}
const baseUrl = process.env.SMARTGATEWAY_BASE_URL || "https://smartgatewayuat.hdfcbank.com";

let juspayClient: any = null;

export function getSmartGateway() {
    if (!juspayClient) {
        // Try CommonJS require
        const expressCheckout = require("expresscheckout-nodejs");
        // The package might export Juspay or might be Juspay directly
        const Juspay = expressCheckout.Juspay || expressCheckout;
        
        juspayClient = new Juspay({
            merchantId: merchantId || "",
            baseUrl: baseUrl,
            jweAuth: {
                keyId: keyId || "",
                publicKey: publicKey || "",
                privateKey: privateKey || "",
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
