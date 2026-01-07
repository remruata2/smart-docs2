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
}: EnrollmentButtonProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleFreeEnroll = async () => {
        setLoading(true);
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
            setLoading(false);
        }
    };

    const handlePaidEnroll = async () => {
        setLoading(true);
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
                        setLoading(true);
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
                        setLoading(false);
                    }
                },
                prefill: orderData.prefill,
                theme: {
                    color: "#4f46e5", // indigo-600
                },
                modal: {
                    ondismiss: function () {
                        setLoading(false);
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response: any) {
                toast.error(response.error.description || "Payment failed");
                setLoading(false);
            });
            rzp.open();

        } catch (error: any) {
            toast.error(error.message || "Failed to initiate payment");
            setLoading(false);
        }
    };

    return (
        <>
            <Script
                id="razorpay-checkout-js"
                src="https://checkout.razorpay.com/v1/checkout.js"
            />
            <Button
                onClick={isFree ? handleFreeEnroll : handlePaidEnroll}
                disabled={loading}
                className={`w-full py-5 text-base font-bold transition-all active:scale-95 shadow-lg ${isFree
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                    }`}
            >
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isFree ? "Enrolling..." : "Processing..."}
                    </>
                ) : (
                    <>
                        {isFree ? (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                        ) : (
                            <CreditCard className="mr-2 h-4 w-4" />
                        )}
                        {isFree ? "Enroll Now" : `Buy Now - ${currency} ${price}`}
                    </>
                )}
            </Button>
        </>
    );
}
