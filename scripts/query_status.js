
const expressCheckout = require("expresscheckout-nodejs");
const Juspay = expressCheckout.Juspay || expressCheckout;
const fs = require("fs");
const path = require("path");
require("dotenv").config();

function loadKey(fileName) {
    try {
        const keyPath = path.join(process.cwd(), fileName);
        if (fs.existsSync(keyPath)) {
            return fs.readFileSync(keyPath, "utf8");
        }
    } catch (e) {
        console.error("Error loading key:", e);
    }
    return null;
}

async function run() {
    const merchantId = process.env.SMARTGATEWAY_MERCHANT_ID;
    const keyId = process.env.SMARTGATEWAY_KEY_ID;
    const baseUrl = process.env.SMARTGATEWAY_BASE_URL || "https://smartgatewayuat.hdfcbank.com";
    
    const privateKey = loadKey("privateKey.pem");
    const publicKey = loadKey("key_32609c0122f6470093972bd2e90064dd.pem");
    
    if (!merchantId || !keyId || !privateKey) {
        console.error("Configuration incomplete.");
        return;
    }

    const juspayClient = new Juspay({
        merchantId: merchantId,
        baseUrl: baseUrl,
        jweAuth: {
            keyId: keyId,
            publicKey: publicKey || "",
            privateKey: privateKey,
        }
    });

    const orderId = process.argv[2] || "CRSE_13_1_803001";
    console.log(`Querying Order Status for: ${orderId}...`);
    
    try {
        const status = await juspayClient.order.status(orderId, {});
        console.log("\n================ [LOG ENTRY] STATUS API RESPONSE ================");
        console.log(JSON.stringify(status, null, 2));
        console.log("=================================================================\n");
    } catch (e) {
        console.error("API Call Failed:", e.message);
    }
}

run();
