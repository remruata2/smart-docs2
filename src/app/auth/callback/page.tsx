"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Loader2, CheckCircle2, ChevronRight, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthCallbackPage() {
    const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleAuth = async () => {
            const supabase = createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            // Handle implicit flow (hash fragment)
            const hash = window.location.hash;
            if (hash) {
                const params = new URLSearchParams(hash.substring(1));
                const access_token = params.get("access_token");
                const refresh_token = params.get("refresh_token");

                if (access_token && refresh_token) {
                    const { error } = await supabase.auth.setSession({
                        access_token,
                        refresh_token,
                    });

                    if (error) {
                        setStatus("error");
                        setError(error.message);
                    } else {
                        setStatus("success");
                    }
                    return;
                }
            }

            // Handle PKCE flow (query params)
            const searchParams = new URLSearchParams(window.location.search);
            const code = searchParams.get("code");
            if (code) {
                const { error } = await supabase.auth.exchangeCodeForSession(code);
                if (error) {
                    setStatus("error");
                    setError(error.message);
                } else {
                    setStatus("success");
                }
                return;
            }

            // Check if already logged in
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setStatus("success");
            } else {
                setStatus("error");
                setError("No authentication parameters found.");
            }
        };

        handleAuth();
    }, []);

    const openApp = () => {
        // Construct the deep link with all params/fragments
        const deepLink = "zirnaio://auth/callback" + window.location.hash + window.location.search;
        window.location.href = deepLink;
    };

    return (
        <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4 text-white font-sans">
            <div className="w-full max-w-md bg-[#1E293B] rounded-2xl border border-white/10 p-8 shadow-2xl relative overflow-hidden">
                {/* Decorative element */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />

                <div className="flex flex-col items-center text-center space-y-6">
                    {status === "verifying" && (
                        <>
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                                <Loader2 className="h-16 w-16 text-blue-500 animate-spin relative" />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-2xl font-bold tracking-tight text-white">Verifying your account</h1>
                                <p className="text-gray-400">Please wait while we confirm your email address...</p>
                            </div>
                        </>
                    )}

                    {status === "success" && (
                        <>
                            <div className="relative">
                                <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full" />
                                <CheckCircle2 className="h-16 w-16 text-green-500 relative" />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-2xl font-bold tracking-tight text-white">Identity Verified</h1>
                                <p className="text-gray-400">Your account has been successfully confirmed. You can now return to the app.</p>
                            </div>

                            <div className="w-full pt-4">
                                <Button
                                    onClick={openApp}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl text-lg font-semibold flex items-center justify-center gap-2 group transition-all"
                                >
                                    <Smartphone className="h-5 w-5" />
                                    Open Zirna App
                                    <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                                <p className="mt-4 text-[10px] text-gray-500 uppercase tracking-widest font-medium">
                                    Manual Redirect
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                    If the button doesn't work, manually open the Zirna app on your device.
                                </p>
                            </div>
                        </>
                    )}

                    {status === "error" && (
                        <>
                            <div className="relative">
                                <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full" />
                                <div className="h-16 w-16 rounded-full border-2 border-red-500 flex items-center justify-center relative">
                                    <span className="text-red-500 text-4xl font-bold">!</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-2xl font-bold tracking-tight text-white">Verification Failed</h1>
                                <p className="text-red-400/80">{error || "The link may be expired or invalid."}</p>
                            </div>
                            <div className="w-full pt-4">
                                <Button
                                    onClick={() => window.location.href = "/"}
                                    className="w-full bg-white/10 hover:bg-white/20 text-white h-12 rounded-xl border border-white/10"
                                >
                                    Back to Home
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Logo/Brand at bottom */}
            <div className="mt-8 flex items-center gap-2 opacity-50">
                <span className="text-xl font-bold tracking-tighter text-white">ZIRNA</span>
                <span className="w-1 h-1 bg-blue-500 rounded-full" />
                <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">AI Exam Prep</span>
            </div>
        </div>
    );
}
