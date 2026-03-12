"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { enrollInCourse } from "@/app/(browse)/actions";
import { verifyCoursePurchase } from "@/app/(browse)/course-actions";
import Script from "next/script";

interface EnrollmentButtonProps {
    courseId: number;
    courseTitle: string;
    isFree: boolean;
    price?: number | string;
    currency?: string;
}

declare global {
    interface Window {
        Juspay: any;
    }
}

export function EnrollmentButton({
    courseId,
    courseTitle,
    isFree,
    price,
    currency = "INR",
    upgradeMode = false,
    isEnrolled = false,
    isAdmin = false,
    className = "",
}: EnrollmentButtonProps & { upgradeMode?: boolean; isEnrolled?: boolean; isAdmin?: boolean; className?: string }) {
    const [loadingAction, setLoadingAction] = useState<"free" | "paid" | "unenroll" | null>(null);
    const router = useRouter();

    const handleFreeEnroll = async () => {
        setLoadingAction("free");
        try {
            const result = await enrollInCourse(courseId);
            if (result.success) {
                toast.success(`Successfully enrolled in ${courseTitle}`);
                router.refresh();
                router.push(`/app/subjects?courseId=${courseId}`);
            }
        } catch (error) {
            toast.error("Failed to enroll in course");
            console.error(error);
        } finally {
            setLoadingAction(null);
        }
    };

    const handlePaidEnroll = async () => {
        setLoadingAction("paid");
        try {
            // 1. Create order session
            const res = await fetch("/api/courses/checkout/smartgateway", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ courseId }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to create order");
            }

            const orderData = await res.json();
            console.log("[EnrollmentButton] SmartGateway response:", orderData);

            // 2. Redirect to payment page (primary approach for web)
            if (orderData.paymentLink) {
                window.location.href = orderData.paymentLink;
                return; // Don't reset loading - user is navigating away
            }

            // 3. Fallback: Try SDK approach if paymentLink not available
            if (orderData.sdkPayload && window.Juspay) {
                window.Juspay.Setup({
                    payment_form: "#payment_form",
                    success_handler: function(status: any) {
                        toast.success("Payment successful! Please wait while we confirm your enrollment.");
                        setTimeout(() => {
                            router.refresh();
                            router.push(`/app/subjects?courseId=${courseId}`);
                            setLoadingAction(null);
                        }, 2000);
                    },
                    error_handler: function(error: any) {
                        toast.error("Payment failed or was cancelled.");
                        setLoadingAction(null);
                    }
                });
                window.Juspay.openPaymentPage(orderData.sdkPayload);
                return;
            }

            throw new Error("No payment method available in the response.");
        } catch (error: any) {
            toast.error(error.message || "Failed to initiate payment");
            setLoadingAction(null);
        }
    };

    const handleUnenroll = async () => {
        if (!confirm("Are you sure you want to unenroll? All progress will be lost.")) return;
        setLoadingAction("unenroll");
        try {
            // Dynamically import to avoid circular dependency issues if any
            const { unenrollFromCourse } = await import("@/app/(browse)/actions");
            const result = await unenrollFromCourse(courseId);
            if (result.success) {
                toast.success(`Unenrolled from ${courseTitle}`);
                router.refresh();
            }
        } catch (error) {
            toast.error("Failed to unenroll");
            console.error(error);
        } finally {
            setLoadingAction(null);
        }
    };

    return (
        <>
            <Script
                id="smartgateway-checkout-js"
                src={process.env.NEXT_PUBLIC_SMARTGATEWAY_ENV === "production" ? "https://smartgateway.hdfcbank.com/checkout.js" : "https://smartgateway.hdfcuat.bank.in/checkout.js"}
            />
            <div className={`flex flex-col gap-3 w-full ${className}`}>
                {/* 1. Free Course / Trial Option - Hidden in Upgrade Mode or if already Enrolled */}
                {!upgradeMode && !isEnrolled && (
                    <Button
                        onClick={handleFreeEnroll}
                        disabled={loadingAction !== null}
                        className={`w-full py-6 text-base font-bold transition-all active:scale-95 shadow-lg ${isFree
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20"
                            }`}
                    >
                        {loadingAction === "free" ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        {isFree ? "Enroll now for Free" : "Start 3 Days Trial"}
                    </Button>
                )}

                {/* 2. Paid Option (Only for paid courses) - Hidden if already enrolled */}
                {!isFree && !isEnrolled && (
                    <Button
                        onClick={handlePaidEnroll}
                        disabled={loadingAction !== null}
                        variant={upgradeMode ? "default" : "outline"} // Highlight as primary in upgrade mode
                        className={`w-full py-4 h-auto whitespace-normal text-base font-bold active:scale-95 ${upgradeMode
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 shadow-lg border-2 border-emerald-600"
                            : "border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                            }`}
                    >
                        {loadingAction === "paid" ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />
                        ) : (
                            <CreditCard className="mr-2 h-4 w-4 shrink-0" />
                        )}
                        <span>
                            {upgradeMode 
                                ? `Upgrade Now - ₹ ${price}/month` 
                                : isFree 
                                    ? "Enroll now for Free" 
                                    : `Enroll now : ₹ ${price}/month`
                            }
                        </span>
                    </Button>
                )}

                {/* Subscriptions usually have a slightly different button in some contexts, but if this component is used for it: */}
                {/* We can add a more explicit Subscription button label if we detect it's a subscription */}

                {/* 3. Unenroll Option (For testing/admin) */}
                {isEnrolled && isAdmin && (
                    <Button
                        onClick={handleUnenroll}
                        disabled={loadingAction !== null}
                        variant="ghost"
                        className="w-full text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                        {loadingAction === "unenroll" ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <span className="mr-2">✕</span>
                        )}
                        Unenroll (Testing)
                    </Button>
                )}
            </div>
        </>
    );
}
