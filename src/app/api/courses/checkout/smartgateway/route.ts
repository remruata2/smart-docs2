import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getSmartGateway } from "@/lib/smartgateway";
import { prisma } from "@/lib/prisma";
import { validateCsrf } from "@/lib/csrf-protection";

export async function POST(request: NextRequest) {
    try {
        // SECURITY: Validate CSRF
        const csrfResult = validateCsrf(request);
        if (!csrfResult.valid) {
            console.warn(`[COURSE-CHECKOUT-SG] CSRF validation failed: ${csrfResult.error}`);
            return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
        }

        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = parseInt(session.user.id as string);
        const body = await request.json();
        const { courseId } = body;

        if (!courseId) {
            return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
        }

        const course = await prisma.course.findUnique({
            where: { id: parseInt(courseId) },
        });

        if (!course) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        if (course.is_free) {
            return NextResponse.json({ error: "This is a free course. Use direct enrollment." }, { status: 400 });
        }

        if (!course.price) {
            return NextResponse.json({ error: "Course price not configured" }, { status: 400 });
        }

        const amount = Number(course.price).toFixed(2);
        const orderId = `CRSE_${courseId}_${userId}_${Date.now().toString().slice(-6)}`;

        // Create a SmartGateway (Juspay) Order
        const orderParams = {
            order_id: orderId,
            amount: amount,
            customer_id: userId.toString(),
            customer_email: session.user.email || "",
            customer_phone: "", // Optional, but can be added if available in session
            return_url: `${process.env.NEXTAUTH_URL}/api/payments/smartgateway/return?destination=/courses/${courseId}&courseId=${courseId}&payment=success`, // Bridge route
            webhook_url: `${process.env.NEXTAUTH_URL}/api/webhooks/smartgateway`,
            action: "paymentPage",
            description: `Enroll in ${course.title}`,
            payment_page_client_id: process.env.SMARTGATEWAY_CLIENT_ID || "",
        };

        const smartgateway = getSmartGateway();
        const response = await (smartgateway as any).orderSession.create(orderParams);

        // console.log("[COURSE-CHECKOUT-SG] Full SmartGateway response:", JSON.stringify(response, null, 2));

        // The web checkout uses payment_links.web for redirect
        const paymentLink = response.payment_links?.web || response.payment_links?.mobile;
        const sdkPayload = response.sdk_payload;

        if (!paymentLink && !sdkPayload) {
            console.error("[COURSE-CHECKOUT-SG] No payment_links or sdk_payload in response");
            throw new Error("Failed to get payment URL from SmartGateway");
        }

        return NextResponse.json({
            paymentLink: paymentLink || null,
            sdkPayload: sdkPayload || null,
            orderId: orderId,
            amount: amount,
            currency: course.currency || "INR",
            courseTitle: course.title,
        });
    } catch (error) {
        console.error("[COURSE-CHECKOUT-SG] Error creating order:", error);
        return NextResponse.json(
            { error: "Failed to create payment order" },
            { status: 500 }
        );
    }
}
