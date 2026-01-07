import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { UserRole } from "@/generated/prisma";
import { z } from "zod";
import { getDefaultPlan, upsertUserSubscription } from "@/services/subscription-service";
import { BillingCycle } from "@/generated/prisma";
import { startOfMonth, endOfMonth } from "date-fns";

const registerSchema = z.object({
	email: z.string().email("Invalid email address"),
	password: z.string().min(8, "Password must be at least 8 characters"),
	name: z.string().min(2, "Name must be at least 2 characters").optional(),
});

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const validatedData = registerSchema.parse(body);

		// Check if email already exists
		const existingUser = await db.user.findFirst({
			where: {
				OR: [
					{ email: validatedData.email.toLowerCase() },
					{ username: validatedData.email.toLowerCase() },
				],
			},
		});

		if (existingUser) {
			return NextResponse.json(
				{ error: "Email or username already exists" },
				{ status: 400 }
			);
		}

		// Hash password
		const password_hash = await hash(validatedData.password, 10);

		// Generate username from email if not provided
		const username =
			validatedData.name?.toLowerCase().replace(/\s+/g, "_") ||
			validatedData.email.toLowerCase().split("@")[0];

		// Ensure username is unique
		let finalUsername = username;
		let counter = 1;
		while (await db.user.findUnique({ where: { username: finalUsername } })) {
			finalUsername = `${username}_${counter}`;
			counter++;
		}

		// Create user
		const user = await db.user.create({
			data: {
				username: finalUsername,
				email: validatedData.email.toLowerCase(),
				password_hash,
				role: UserRole.student,
				is_active: true,
			},
		});

		// Assign default (free) subscription plan
		try {
			const defaultPlan = await getDefaultPlan();
			if (defaultPlan) {
				const now = new Date();
				await upsertUserSubscription(user.id, {
					planId: defaultPlan.id,
					currentPeriodStart: startOfMonth(now),
					currentPeriodEnd: endOfMonth(now),
					billingCycle: BillingCycle.monthly,
				});
			}
		} catch (subscriptionError) {
			console.error("[REGISTER] Error assigning default subscription:", subscriptionError);
			// Don't fail registration if subscription assignment fails
		}

		return NextResponse.json(
			{
				success: true,
				message: "Registration successful",
				user: {
					id: user.id,
					username: user.username,
					email: user.email,
				},
			},
			{ status: 201 }
		);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{
					error: "Validation failed",
					details: error.issues,
				},
				{ status: 400 }
			);
		}

		console.error("[REGISTER] Error:", error);
		return NextResponse.json(
			{ error: "Registration failed. Please try again." },
			{ status: 500 }
		);
	}
}

