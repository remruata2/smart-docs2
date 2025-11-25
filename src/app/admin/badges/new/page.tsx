import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBadge } from "../actions";
import Link from "next/link";

export default function NewBadgePage() {
    return (
        <div className="max-w-2xl mx-auto py-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Create Streak Badge</h1>
                <Link href="/admin/badges">
                    <Button variant="ghost">Cancel</Button>
                </Link>
            </div>

            <form action={createBadge} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
                <div className="space-y-2">
                    <Label htmlFor="name">Badge Name</Label>
                    <Input id="name" name="name" placeholder="e.g. Week Warrior" required />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="icon">Icon Name (Lucide)</Label>
                    <Input id="icon" name="icon" placeholder="e.g. Flame, Trophy, Award, Star" required />
                    <p className="text-xs text-muted-foreground">
                        Use icon names from <a href="https://lucide.dev/icons" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Lucide React</a>
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="min_streak">Minimum Streak (Days)</Label>
                    <Input id="min_streak" name="min_streak" type="number" min="1" required />
                </div>

                <div className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        id="is_active"
                        name="is_active"
                        defaultChecked
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <Label htmlFor="is_active">Active</Label>
                </div>

                <div className="pt-4">
                    <Button type="submit" className="w-full">Create Badge</Button>
                </div>
            </form>
        </div>
    );
}
