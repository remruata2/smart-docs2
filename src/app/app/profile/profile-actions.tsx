"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function ProfileActions() {
    return (
        <Button
            variant="destructive"
            className="w-full sm:w-auto gap-2"
            onClick={() => signOut({ callbackUrl: "/login" })}
        >
            <LogOut className="h-4 w-4" />
            Sign Out
        </Button>
    );
}
