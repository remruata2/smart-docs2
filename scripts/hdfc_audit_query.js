
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

async function run() {
    const merchantId = process.env.SMARTGATEWAY_MERCHANT_ID;
    const keyId = process.env.SMARTGATEWAY_KEY_ID;
    const baseUrl = process.env.SMARTGATEWAY_BASE_URL || "https://smartgatewayuat.hdfcbank.com";
    
    // Load Keys (Simplified version of getSmartGateway)
    let privateKey = process.env.SMARTGATEWAY_PRIVATE_KEY;
    if (fs.existsSync(path.join(process.cwd(), "privateKey.pem"))) {
        privateKey = fs.readFileSync(path.join(process.cwd(), "privateKey.pem"), "utf8");
    }
    
    if (!merchantId || !keyId || !privateKey) {
        console.error("Missing configuration. Check .env and privateKey.pem");
        return;
    }

    // Since installing expresscheckout-nodejs might be slow, let's use the local node_modules
    try {
        const expressCheckout = require("expresscheckout-nodejs");
        const Juspay = expressCheckout.Juspay || expressCheckout;
        
        const juspayClient = new Juspay({
            merchantId: merchantId,
            baseUrl: baseUrl,
            jweAuth: {
                keyId: keyId,
                publicKey: "", // Public key is optional for status API
                privateKey: privateKey,
            }
        });

        const orderId = process.argv[2] || "CRSE_13_1_803001";
        console.log(`Querying status for Order ID: ${orderId}...`);
        
        const orderStatus = await juspayClient.order.status(orderId, {});
        
        console.log("\n================ HDFC ORDER STATUS API RESPONSE ================");
        console.log(JSON.stringify(orderStatus, null, 2));
        console.log("===============================================================\n");
        
    } catch (e) {
        console.error("Execution failed:", e.message);
    }
}

run();
