import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { razorpay } from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";
import { validateCsrf } from "@/lib/csrf-protection";

export async function POST(request: NextRequest) {
    try {
        // SECURITY: Validate CSRF
        const csrfResult = validateCsrf(request);
        if (!csrfResult.valid) {
            console.warn(`[COURSE-CHECKOUT] CSRF validation failed: ${csrfResult.error}`);
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

        // Create a Razorpay Order
        const amount = Math.round(Number(course.price) * 100); // Razorpay expects amount in paise

        const options = {
            amount: amount,
            currency: course.currency || "INR",
            receipt: `course_enroll_${courseId}_user_${userId}`,
            notes: {
                courseId: courseId.toString(),
                userId: userId.toString(),
                type: "course_purchase"
            }
        };

        const order = await razorpay.orders.create(options);

        return NextResponse.json({
            orderId: order.id,
            amount: amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID,
            courseTitle: course.title,
            prefill: {
                name: session.user.name,
                email: session.user.email,
            }
        });
    } catch (error) {
        console.error("[COURSE-CHECKOUT] Error creating order:", error);
        return NextResponse.json(
            { error: "Failed to create payment order" },
            { status: 500 }
        );
    }
}
