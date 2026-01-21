"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "use-debounce";

export function SearchInput() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get("q") || "";

    const [text, setText] = useState(initialQuery);
    const [query] = useDebounce(text, 500);

    // Update internal state if URL changes externally (e.g. back button)
    useEffect(() => {
        if (searchParams.get("q") !== text) {
            setText(searchParams.get("q") || "");
        }
    }, [searchParams]);

    useEffect(() => {
        const currentQuery = searchParams.get("q") || "";
        if (query === currentQuery) return;

        const params = new URLSearchParams(searchParams.toString());
        if (query) {
            params.set("q", query);
        } else {
            params.delete("q");
        }

        router.push(`/courses?${params.toString()}`, { scroll: false });
    }, [query, router, searchParams]);

    const handleClear = useCallback(() => {
        setText("");
        router.push("/courses", { scroll: false });
    }, [router]);

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-12">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Search for courses, subjects, or topics..."
                    className="w-full pl-12 pr-12 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg"
                />
                {text && (
                    <button
                        onClick={handleClear}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Clear search"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                )}
            </div>
        </div>
    );
}
