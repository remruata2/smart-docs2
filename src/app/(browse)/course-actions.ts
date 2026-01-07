"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { revalidatePath } from "next/cache";
import { enrollInCourse } from "./actions";

/**
 * Verify course payment and enroll user
 */
export async function verifyCoursePurchase(data: {
    courseId: number;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}) {
    const { courseId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = data;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    // 1. Verify Signature
    const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);

    if (!isValid) {
        throw new Error("Invalid payment signature");
    }

    // 2. Log Payment (Optional but recommended - could add a CoursePayment table later)
    // For now, we trust the verification and proceed to enrollment

    // 3. Enroll the user
    // We reuse the existing enrollment logic but explicitly mark it as paid
    const result = await enrollInCourse(courseId, undefined, true);

    if (result.success) {
        revalidatePath("/app/catalog");
        revalidatePath("/app/subjects");
        return { success: true };
    }

    throw new Error("Failed to enroll after payment");
}
