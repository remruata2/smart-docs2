"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { upsertInstructor, deleteInstructor } from "./actions";
import { Trash2, Loader2, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface InstructorFormProps {
    instructor?: any;
    eligibleUsers?: any[];
}

export default function InstructorForm({ instructor, eligibleUsers = [] }: InstructorFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [formData, setFormData] = useState({
        userId: instructor?.user_id || "",
        bio: instructor?.bio || "",
        title: instructor?.title || "",
        avatar_url: instructor?.avatar_url || "",
        social_links: instructor?.social_links || {},
    });

    const isEdit = !!instructor;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.userId) {
            toast.error("Please select a user");
            return;
        }

        setLoading(true);
        try {
            await upsertInstructor({
                id: instructor?.id,
                userId: parseInt(formData.userId),
                bio: formData.bio,
                title: formData.title,
                avatar_url: formData.avatar_url,
                social_links: formData.social_links
            });
            toast.success(isEdit ? "Instructor updated" : "Instructor created");
            router.push("/admin/instructors");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save instructor");
        } finally {
            setLoading(true);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure? This will remove the instructor profile but keep the user account. The user's role will be reset to student.")) return;

        setDeleting(true);
        try {
            await deleteInstructor(instructor.id);
            toast.success("Instructor removed");
            router.push("/admin/instructors");
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete instructor");
            setDeleting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/instructors">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                    {isEdit ? "Edit Instructor" : "New Instructor"}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Profile Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!isEdit && (
                            <div className="space-y-2">
                                <Label htmlFor="user">Select User</Label>
                                <Select
                                    value={formData.userId.toString()}
                                    onValueChange={(val) => setFormData(prev => ({ ...prev, userId: val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a user to make instructor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {eligibleUsers.map(user => (
                                            <SelectItem key={user.id} value={user.id.toString()}>
                                                {user.username} ({user.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-sm text-gray-500">Only users without an instructor profile are listed.</p>
                            </div>
                        )}

                        {isEdit && (
                            <div className="space-y-2">
                                <Label>User</Label>
                                <div className="p-2 bg-gray-50 rounded border text-gray-600 font-medium">
                                    {instructor.user.username} ({instructor.user.email})
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Professional Title</Label>
                                <Input
                                    id="title"
                                    placeholder="e.g. Senior Maths Teacher"
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="avatar_url">Avatar URL</Label>
                                <Input
                                    id="avatar_url"
                                    placeholder="https://..."
                                    value={formData.avatar_url}
                                    onChange={(e) => setFormData(prev => ({ ...prev, avatar_url: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bio">Biography</Label>
                            <Textarea
                                id="bio"
                                rows={5}
                                placeholder="Describe instructor background and expertise..."
                                value={formData.bio}
                                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-between">
                    {isEdit ? (
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleting || loading}
                        >
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                            Remove Instructor
                        </Button>
                    ) : <div></div>}

                    <Button type="submit" disabled={loading || deleting} className="bg-indigo-600 hover:bg-indigo-700">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        {isEdit ? "Update Instructor" : "Create Instructor"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
