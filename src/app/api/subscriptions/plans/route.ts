import { NextResponse } from "next/server";
import { getActivePlans } from "@/services/subscription-service";

export async function GET() {
    try {
        const plans = await getActivePlans();
        return NextResponse.json(plans);
    } catch (error) {
        console.error("Error fetching plans:", error);
        return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
    }
}
