
const { getSmartGateway } = require("./src/lib/smartgateway");
require("dotenv").config();

async function checkStatus(orderId) {
    try {
        const smartgateway = getSmartGateway();
        const orderStatus = await smartgateway.order.status(orderId, {});
        console.log("---------------- STATUS API RESPONSE START ----------------");
        console.log(JSON.stringify(orderStatus, null, 2));
        console.log("---------------- STATUS API RESPONSE END ------------------");
    } catch (e) {
        console.error("Error querying SmartGateway:", e);
    }
}

const orderId = process.argv[2] || "CRSE_13_1_803001";
checkStatus(orderId);
