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
        Razorpay: any;
    }
}

export function EnrollmentButton({
    courseId,
    courseTitle,
    isFree,
    price,
    currency = "INR",
    upgradeMode = false,
}: EnrollmentButtonProps & { upgradeMode?: boolean }) {
    const [loadingAction, setLoadingAction] = useState<"free" | "paid" | null>(null);
    const router = useRouter();

    const handleFreeEnroll = async () => {
        setLoadingAction("free");
        try {
            const result = await enrollInCourse(courseId);
            if (result.success) {
                toast.success(`Successfully enrolled in ${courseTitle}`);
                router.refresh();
                router.push("/app/subjects");
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
            // 1. Create order
            const res = await fetch("/api/courses/checkout/razorpay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ courseId }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to create order");
            }

            const orderData = await res.json();

            // 2. Open Razorpay Modal
            const options = {
                key: orderData.key,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Zirna",
                description: `Enroll in ${courseTitle}`,
                order_id: orderData.orderId,
                handler: async function (response: any) {
                    try {
                        setLoadingAction("paid");
                        const verifyResult = await verifyCoursePurchase({
                            courseId,
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                        });

                        if (verifyResult.success) {
                            toast.success(`Payment successful! Enrolled in ${courseTitle}`);
                            router.refresh();
                            router.push("/app/subjects");
                        }
                    } catch (error: any) {
                        toast.error(error.message || "Payment verification failed");
                    } finally {
                        setLoadingAction(null);
                    }
                },
                prefill: orderData.prefill,
                theme: {
                    color: "#4f46e5", // indigo-600
                },
                modal: {
                    ondismiss: function () {
                        setLoadingAction(null);
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response: any) {
                toast.error(response.error.description || "Payment failed");
                setLoadingAction(null);
            });
            rzp.open();

        } catch (error: any) {
            toast.error(error.message || "Failed to initiate payment");
            setLoadingAction(null);
        }
    };

    return (
        <>
            <Script
                id="razorpay-checkout-js"
                src="https://checkout.razorpay.com/v1/checkout.js"
            />
            <div className="flex flex-col gap-3 w-full">
                {/* 1. Free Course / Trial Option - Hidden in Upgrade Mode */}
                {!upgradeMode && (
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
                        {isFree ? "Enroll Now" : "Start 3 Days Trial"}
                    </Button>
                )}

                {/* 2. Paid Option (Only for paid courses) */}
                {!isFree && (
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
                        <span>{upgradeMode ? `Upgrade Now - ${currency} ${price}` : `Buy Now - ${currency} ${price}`}</span>
                    </Button>
                )}
            </div>
        </>
    );
}
