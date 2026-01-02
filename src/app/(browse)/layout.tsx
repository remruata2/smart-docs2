import { BrowseHeader } from "@/components/layout/BrowseHeader";
import { Footer } from "@/components/Footer";
import { Toaster } from "@/components/ui/sonner";

export default function BrowseLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
            <Toaster richColors position="top-right" />
            <BrowseHeader />
            <main className="flex-1">
                {children}
            </main>
            <Footer />
        </div>
    );
}
