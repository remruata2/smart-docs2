import { Loader2 } from "lucide-react";

export default function BattleLoading() {
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 rounded-full animate-pulse" />
                <Loader2 className="h-16 w-16 text-indigo-500 animate-spin relative z-10" />
            </div>

            <div className="space-y-4 w-full max-w-md text-center">
                <div className="h-8 bg-slate-900 rounded-lg animate-pulse w-3/4 mx-auto" />
                <div className="h-4 bg-slate-900 rounded-lg animate-pulse w-1/2 mx-auto" />

                <div className="grid grid-cols-2 gap-4 mt-8">
                    <div className="h-24 bg-slate-900 rounded-xl animate-pulse" />
                    <div className="h-24 bg-slate-900 rounded-xl animate-pulse" />
                </div>

                <div className="h-64 bg-slate-900 rounded-2xl animate-pulse mt-4" />
            </div>

            <p className="mt-8 text-slate-500 font-medium animate-pulse">
                Entering the Arena...
            </p>
        </div>
    );
}
