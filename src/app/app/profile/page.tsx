import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Mail, School, BookOpen, CreditCard, Calendar, Activity } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import ProfileActions from "./profile-actions";
import { ProfileEditForm } from "./ProfileEditForm";

export default async function ProfilePage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/login");
    }

    const user = await prisma.user.findUnique({
        where: { id: parseInt(session.user.id) },
        include: {
            profile: true,
            subscription: {
                include: {
                    plan: true
                }
            },
            enrollments: {
                where: { status: "active" },
                orderBy: { last_accessed_at: "desc" },
                take: 1,
                include: {
                    course: true,
                    institution: {
                        include: {
                            board: true
                        }
                    },
                    program: {
                        include: {
                            board: true
                        }
                    }
                }
            }
        }
    });

    if (!user) {
        return <div>User not found</div>;
    }

    const profile = user.profile;
    const subscription = user.subscription;
    const latestEnrollment = (user as any).enrollments?.[0];

    // Helper for trial access
    const getTrialInfo = () => {
        if (!latestEnrollment || !latestEnrollment.course) return null;

        // Simple logic mirroring lib/trial-access if we don't want to import constraints
        // Or better, just implement simple check since we have fields
        const isFree = latestEnrollment.course.is_free;
        const isPaid = latestEnrollment.is_paid;
        const trialEndsAt = latestEnrollment.trial_ends_at ? new Date(latestEnrollment.trial_ends_at) : null;
        const now = new Date();

        if (isFree) return { type: 'free', label: 'Free Course' };
        if (isPaid) return { type: 'paid', label: 'Full Access' };

        if (trialEndsAt && trialEndsAt > now) {
            const diffTime = Math.abs(trialEndsAt.getTime() - now.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

            return {
                type: 'trial',
                label: 'Trial Active',
                daysLeft: diffDays,
                hoursLeft: diffHours,
                endsAt: trialEndsAt
            };
        }

        return { type: 'expired', label: 'Trial Expired' };
    };

    const courseStatus = getTrialInfo();

    return (
        <div className="container mx-auto py-8 px-4 max-w-5xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
                    <p className="text-gray-500 mt-1">Manage your account and subscription</p>
                </div>
                <Link href="/app/usage">
                    <Button variant="outline" className="gap-2">
                        <Activity className="h-4 w-4" />
                        View Usage
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Personal Info */}
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <User className="h-5 w-5 text-indigo-600" />
                            Personal Info
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg mb-4">
                            <div className="h-20 w-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold mb-3">
                                {user.username?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <h3 className="font-semibold text-lg">{user.username}</h3>
                            <Badge variant="secondary" className="mt-1 capitalize">
                                {user.role}
                            </Badge>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600">{user.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600">
                                    Joined {user.created_at ? format(new Date(user.created_at), 'MMM yyyy') : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="md:col-span-2 space-y-6">
                    {/* Current Enrollment / Course Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-indigo-600" />
                                Current Enrollment
                            </CardTitle>
                            <CardDescription>Your active learning path</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {latestEnrollment && latestEnrollment.course ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">{latestEnrollment.course.title}</h3>
                                            <p className="text-gray-500 text-sm mt-1">
                                                {latestEnrollment.institution?.name || latestEnrollment.program?.name || "Independent Study"}
                                            </p>
                                        </div>
                                        {courseStatus?.type === 'trial' && (
                                            <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700 animate-pulse">
                                                Trial Mode
                                            </Badge>
                                        )}
                                        {courseStatus?.type === 'paid' && (
                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                                                Full Access
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Trial Status Details */}
                                    {courseStatus?.type === 'trial' && (
                                        <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 flex items-center gap-3">
                                            <div className="bg-white p-2 rounded-full shadow-sm">
                                                <Calendar className="h-5 w-5 text-orange-500" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-orange-900">
                                                    {courseStatus.daysLeft && courseStatus.daysLeft > 1
                                                        ? `${courseStatus.daysLeft} Days Remaining`
                                                        : `${courseStatus.hoursLeft} Hours Remaining`
                                                    }
                                                </p>
                                                <p className="text-xs text-orange-700">
                                                    Your trial ends on {format(courseStatus.endsAt!, 'MMM d, h:mm a')}
                                                </p>
                                            </div>
                                            <Link href={`/courses/${latestEnrollment.course.id}`} className="ml-auto">
                                                <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white border-none">
                                                    Upgrade Now
                                                </Button>
                                            </Link>
                                        </div>
                                    )}

                                    {courseStatus?.type === 'expired' && (
                                        <div className="bg-red-50 border border-red-100 rounded-lg p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-white p-2 rounded-full shadow-sm">
                                                    <CreditCard className="h-5 w-5 text-red-500" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-red-900">Trial Expired</p>
                                                    <p className="text-xs text-red-700">Please upgrade to continue learning.</p>
                                                </div>
                                            </div>
                                            <Link href={`/courses/${latestEnrollment.course.id}`}>
                                                <Button size="sm" variant="destructive">
                                                    Upgrade
                                                </Button>
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-gray-500 mb-4">You are not enrolled in any course yet.</p>
                                    <Link href="/app/catalog">
                                        <Button>Browse Catalog</Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>


                    <div className="flex justify-end">
                        <ProfileActions />
                    </div>
                </div>
            </div>
        </div>
    );
}
