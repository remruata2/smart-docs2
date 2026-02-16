"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Footer } from "@/components/Footer";
import { AlertCircle, Trash2, ArrowLeft, Loader2 } from "lucide-react";

export default function RemoveAccountPage() {
    const { data: session, status } = useSession();
    const [confirmation, setConfirmation] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleDelete = async () => {
        if (confirmation !== "DELETE") return;

        setIsDeleting(true);
        setError(null);

        try {
            const response = await fetch("/api/user/delete", {
                method: "DELETE",
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to delete account");
            }

            setSuccess(true);
            // Wait a moment for the user to see the success message
            setTimeout(() => {
                signOut({ callbackUrl: "/" });
            }, 3000);
        } catch (err: any) {
            setError(err.message);
            setIsDeleting(false);
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (status === "unauthenticated") {
        return (
            <div className="min-h-screen flex flex-col bg-gray-50">
                <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
                    <div className="container mx-auto px-4 py-4">
                        <Link href="/" className="inline-block">
                            <Image
                                src="/zirna-brand-logo.png"
                                alt="Zirna"
                                width={120}
                                height={40}
                                className="h-10 w-auto"
                                priority
                                unoptimized
                            />
                        </Link>
                    </div>
                </header>

                <main className="flex-grow flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
                        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-8 h-8 text-indigo-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">Login Required</h1>
                        <p className="text-gray-600 mb-8">
                            You must be logged in to delete your account. This is a security measure to protect your data.
                        </p>
                        <Link
                            href="/login"
                            className="inline-block w-full bg-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                        >
                            Go to Login
                        </Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
            <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <Link href="/" className="inline-block">
                        <Image
                            src="/zirna-brand-logo.png"
                            alt="Zirna"
                            width={120}
                            height={40}
                            className="h-10 w-auto"
                            priority
                            unoptimized
                        />
                    </Link>
                    <Link
                        href="/app/dashboard"
                        className="text-sm font-medium text-gray-600 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                </div>
            </header>

            <main className="flex-grow container mx-auto px-4 py-12 max-w-2xl">
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
                    {/* Header Accent */}
                    <div className="h-2 bg-red-500 w-full" />

                    <div className="p-8 md:p-12">
                        {!success ? (
                            <>
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                                        <Trash2 className="w-7 h-7 text-red-600" />
                                    </div>
                                    <div>
                                        <h1 className="text-3xl font-bold text-gray-900 leading-tight">Delete Account</h1>
                                        <p className="text-gray-500 font-medium">This action cannot be undone</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                                        <div className="flex gap-3">
                                            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <h3 className="font-bold text-amber-900 mb-2 italic">Wait! What happens next?</h3>
                                                <p className="text-amber-800 text-sm leading-relaxed">
                                                    Deleting your account will result in the permanent removal of:
                                                </p>
                                                <ul className="list-disc list-inside mt-3 text-sm text-amber-800 space-y-1 ml-2">
                                                    <li>Your personal profile and settings</li>
                                                    <li>All exam scores and learning progress</li>
                                                    <li>Your saved textbooks and chapters</li>
                                                    <li>Active battles and quiz histories</li>
                                                    <li>Subscription data (access will be revoked immediately)</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <p className="text-gray-700 font-medium">To confirm, please type <span className="text-red-600 font-bold select-all">DELETE</span> in the box below:</p>
                                        <input
                                            type="text"
                                            value={confirmation}
                                            onChange={(e) => setConfirmation(e.target.value)}
                                            placeholder="Type DELETE to confirm"
                                            className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-red-500 focus:outline-none transition-all text-lg font-medium text-center tracking-widest uppercase"
                                            disabled={isDeleting}
                                        />
                                    </div>

                                    {error && (
                                        <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm flex items-center gap-3">
                                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                            {error}
                                        </div>
                                    )}

                                    <div className="pt-4 flex flex-col md:flex-row gap-4">
                                        <button
                                            onClick={handleDelete}
                                            disabled={confirmation !== "DELETE" || isDeleting}
                                            className={`flex-grow py-4 px-8 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 ${confirmation === "DELETE" && !isDeleting
                                                    ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200"
                                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                }`}
                                        >
                                            {isDeleting ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    Removing everything...
                                                </>
                                            ) : (
                                                <>
                                                    <Trash2 className="w-5 h-5" />
                                                    Permanently Delete My Data
                                                </>
                                            )}
                                        </button>
                                        <Link
                                            href="/app/dashboard"
                                            className="py-4 px-8 bg-white border-2 border-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-all text-center"
                                        >
                                            Cancel
                                        </Link>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
                                </div>
                                <h2 className="text-3xl font-bold text-gray-900 mb-4">Account Deleted</h2>
                                <p className="text-gray-600 mb-2">We've successfully removed all your data from our systems.</p>
                                <p className="text-gray-400 text-sm">Redirecting you to the home page...</p>
                            </div>
                        )}
                    </div>
                </div>

                <p className="text-center mt-12 text-gray-400 text-sm">
                    Protected by Zirna Security Systems. <br />
                    If you have questions, contact <a href="mailto:support@zirna.io" className="text-indigo-600 hover:underline">support@zirna.io</a>
                </p>
            </main>

            <Footer />
        </div>
    );
}
