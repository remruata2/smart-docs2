import Razorpay from "razorpay";
import crypto from "crypto";

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
}

export const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a Razorpay customer
 */
export async function createCustomer(
    email: string,
    name?: string,
    contact?: string
) {
    try {
        return await razorpay.customers.create({
            name: name || "",
            email,
            contact: contact || "",
        });
    } catch (error) {
        console.error("Error creating Razorpay customer:", error);
        throw error;
    }
}

/**
 * Create a Razorpay subscription
 */
export async function createSubscription(
    planId: string,
    customerId?: string,
    totalCount: number = 120 // 10 years by default
) {
    try {
        const options: any = {
            plan_id: planId,
            total_count: totalCount,
            customer_notify: 1,
        };

        // Only add customer_id if provided (Razorpay allows creating subs without it initially)
        // But for recurring, it's better to have it linked.
        // Note: Razorpay subscription creation doesn't strictly require customer_id in all flows,
        // but linking it is good practice.

        return await razorpay.subscriptions.create(options);
    } catch (error) {
        console.error("Error creating Razorpay subscription:", error);
        throw error;
    }
}

/**
 * Verify Razorpay webhook signature
 */
export function verifyWebhookSignature(
    body: string,
    signature: string,
    secret: string
): boolean {
    const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("hex");

    return expectedSignature === signature;
}

/**
 * Verify Razorpay payment signature
 */
export function verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
): boolean {
    const text = orderId + "|" + paymentId;
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(text)
        .digest("hex");

    return expectedSignature === signature;
}
