"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { updateSelfAction } from "../actions";
import { toast } from "sonner";
import { Loader2, Save, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";

export default function InstructorSettingsForm() {
    const { data: session, update } = useSession();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: session?.user?.name || "",
        image: session?.user?.image || "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const result = await updateSelfAction(formData);

        if (result.success) {
            toast.success("Profile updated successfully");
            // Update the session to reflect changes in the sidebar immediately
            await update({
                ...session,
                user: {
                    ...session?.user,
                    name: formData.name,
                    image: formData.image,
                }
            });
        } else {
            toast.error(result.error || "Failed to update profile");
        }
        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-indigo-600" />
                    Profile Information
                </h2>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                            Display Name
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Your full name or organization name"
                            required
                        />
                    </div>

                    <ImageUpload
                        value={formData.image}
                        onChange={(url) => setFormData({ ...formData, image: url })}
                        label="Profile Picture / Logo"
                        description="This image will be used in the sidebar and course listings."
                    />
                </div>

                <div className="mt-8 flex justify-end">
                    <Button
                        type="submit"
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </form>
    );
}
