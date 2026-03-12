"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";
import { enrollInCourse } from "./actions";
import { getSmartGateway } from "@/lib/smartgateway";

/**
 * Verify course payment and enroll user
 * (If using webhook, this might not be strictly necessary, but helpful for immediate UI feedback)
 */
export async function verifyCoursePurchase(data: {
    courseId: number;
    orderId: string;
}) {
    const { courseId, orderId } = data;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    // 1. Verify Status with SmartGateway
    try {
        const smartgateway = getSmartGateway();
        const orderStatus = await (smartgateway as any).order.status({ order_id: orderId });
        
        if (orderStatus.status === "CHARGED" || orderStatus.status === "SUCCESS") {
            // 2. Enroll the user
            const result = await enrollInCourse(courseId, undefined, true);

            if (result.success) {
                revalidatePath("/app/catalog");
                revalidatePath("/app/subjects");
                return { success: true };
            }
        }
    } catch (error) {
         console.error("Payment verification failed", error);
    }
    
    throw new Error("Failed to verify payment or enroll");
}
