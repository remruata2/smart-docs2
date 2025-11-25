"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MobileHeader() {
    const router = useRouter();
    const pathname = usePathname();

    // Don't show on dashboard as it's the root
    if (pathname === "/app/dashboard") {
        return null;
    }

    return (
        <div className="sticky top-0 z-40 flex items-center h-14 bg-white border-b border-gray-200 px-4 md:hidden">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="-ml-2 text-gray-600 hover:text-gray-900"
            >
                <ChevronLeft className="h-6 w-6" />
            </Button>
            <span className="ml-2 font-medium text-gray-900">Back</span>
        </div>
    );
}
