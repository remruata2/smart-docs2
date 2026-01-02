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
            profile: {
                include: {
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
            },
            subscription: {
                include: {
                    plan: true
                }
            }
        }
    });

    if (!user) {
        return <div>User not found</div>;
    }

    const profile = user.profile;
    const subscription = user.subscription;

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
                    {/* Academic Profile */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <School className="h-5 w-5 text-indigo-600" />
                                Academic Profile
                            </CardTitle>
                            <CardDescription>Your current educational context</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {profile ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-gray-500">Institution</p>
                                            <ProfileEditForm
                                                currentInstitutionId={profile.institution_id?.toString()}
                                                currentBoardId={profile.institution?.board_id || profile.program?.board_id}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <School className="h-4 w-4 text-gray-400" />
                                            <span className="font-medium">
                                                {profile.institution?.name || "Self-Paced / Independent"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-gray-500">Program / Class</p>
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="h-4 w-4 text-gray-400" />
                                            <span className="font-medium">
                                                {profile.program?.name || "Not Selected"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-gray-500">Board</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                                                {profile.institution?.board?.name || profile.program?.board?.name || "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-gray-500">
                                    <p>No profile information set.</p>
                                    <Link href="/app/onboarding">
                                        <Button variant="link" className="mt-2">Complete Onboarding</Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Subscription Details */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-indigo-600" />
                                    Subscription
                                </CardTitle>
                                <CardDescription>Current plan and billing info</CardDescription>
                            </div>
                            {subscription?.status === 'active' && (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                                    Active
                                </Badge>
                            )}
                        </CardHeader>
                        <CardContent>
                            {subscription ? (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-start p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                                        <div>
                                            <h3 className="font-bold text-lg text-indigo-900">
                                                {subscription.plan.display_name}
                                            </h3>
                                            <p className="text-indigo-700 text-sm mt-1">
                                                {subscription.billing_cycle === 'monthly'
                                                    ? `₹${subscription.plan.price_monthly}/month`
                                                    : `₹${subscription.plan.price_yearly}/year`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                        <div className="flex justify-between py-2 border-b">
                                            <span className="text-gray-500">Status</span>
                                            <span className="font-medium capitalize">{subscription.status}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b">
                                            <span className="text-gray-500">Billing Cycle</span>
                                            <span className="font-medium capitalize">{subscription.billing_cycle}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b">
                                            <span className="text-gray-500">Current Period Start</span>
                                            <span className="font-medium">
                                                {format(new Date(subscription.current_period_start), 'MMM d, yyyy')}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b">
                                            <span className="text-gray-500">Renews On</span>
                                            <span className="font-medium">
                                                {format(new Date(subscription.current_period_end), 'MMM d, yyyy')}
                                            </span>
                                        </div>
                                    </div>

                                    {subscription.cancel_at_period_end && (
                                        <div className="bg-yellow-50 text-yellow-800 p-3 rounded-md text-sm border border-yellow-200">
                                            Your subscription will end on {format(new Date(subscription.current_period_end), 'MMM d, yyyy')}.
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                    <p className="text-gray-500">You are currently on the Free Plan</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Account Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                Account Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <ProfileActions />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
