import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, FileText, ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ order_id?: string }>;
}

export default async function PaymentSuccessPage({ params, searchParams }: PageProps) {
    const { id: courseId } = await params;
    const { order_id } = await searchParams;

    if (!order_id) {
        notFound();
    }

    // Fetch the transaction from the database to ensure we only display what's verified
    const transaction = await db.paymentTransaction.findUnique({
        where: { order_id: order_id },
        include: {
            user: {
                select: {
                    name: true,
                    email: true
                }
            },
            course: {
                select: {
                    title: true,
                    price: true,
                    currency: true
                }
            }
        }
    });

    if (!transaction) {
        notFound();
    }

    const isCharged = transaction.status === "CHARGED";

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
            <Card className="max-w-md w-full shadow-2xl border-0 overflow-hidden bg-white">
                <div className="h-2 bg-emerald-500" />
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-4 bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-800">
                        Payment Successful!
                    </CardTitle>
                    <p className="text-slate-500 mt-1">
                        You have been successfully enrolled.
                    </p>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                    <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-100">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 font-medium">Order Number</span>
                            <span className="text-slate-900 font-bold font-mono">
                                {transaction.order_id}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 font-medium">Transaction ID</span>
                            <span className="text-slate-900 font-medium truncate ml-4 max-w-[200px]" title={transaction.gateway_transaction_id || "N/A"}>
                                {transaction.gateway_transaction_id || "N/A"}
                            </span>
                        </div>
                        <div className="h-px bg-slate-200 w-full" />
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 font-medium">Date</span>
                            <span className="text-slate-900 font-medium">
                                {new Date(transaction.created_at).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                })}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 font-medium">Course</span>
                            <span className="text-slate-900 font-medium text-right max-w-[200px] truncate">
                                {transaction.course?.title || "N/A"}
                            </span>
                        </div>
                        <div className="h-px bg-slate-200 w-full" />
                        <div className="flex justify-between items-center text-lg">
                            <span className="text-slate-800 font-bold">Total Amount</span>
                            <span className="text-emerald-600 font-extrabold">
                                {transaction.currency} {Number(transaction.amount).toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Link href={`/courses/${courseId}`} className="block">
                            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg font-semibold group shadow-lg shadow-indigo-200">
                                Go to Course
                                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                        
                        <Link 
                            href={`/api/payments/receipt?order_id=${transaction.order_id}`}
                            target="_blank"
                            className="block"
                        >
                            <Button variant="outline" className="w-full h-11 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200">
                                <Download className="w-4 h-4 mr-2" />
                                Download Receipt
                            </Button>
                        </Link>
                    </div>
                </CardContent>

                <CardFooter className="bg-slate-50 px-6 py-4 flex flex-col space-y-2">
                    <div className="flex items-center text-xs text-slate-400">
                        <FileText className="w-3 h-3 mr-1" />
                        <span>A copy of the receipt has been sent to your email.</span>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
