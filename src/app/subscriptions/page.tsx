import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import Image from "next/image";
import { BrowseHeader } from "@/components/layout/BrowseHeader";
import { Footer } from "@/components/Footer";
import { format } from "date-fns";

export default async function SubscriptionsPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect("/login?callbackUrl=/subscriptions");
    }

    const userId = Number(session.user.id);

    const enrollments = await prisma.userEnrollment.findMany({
        where: {
            user_id: userId,
            status: "active",
        },
        include: {
            course: true,
        },
        orderBy: {
            enrolled_at: "desc",
        },
    });

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <BrowseHeader />

            <main className="flex-grow container mx-auto px-4 py-12">
                <div className="max-w-6xl mx-auto">
                    <header className="mb-10">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Subscriptions</h1>
                        <p className="text-gray-600">Manage your enrolled courses and track your progress.</p>
                    </header>

                    {enrollments.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.168 0.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332 0.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332 0.477-4.5 1.253" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">No active subscriptions</h2>
                            <p className="text-gray-500 mb-8 max-w-sm mx-auto">You haven't enrolled in any courses yet. Explore our catalog to find your first course!</p>
                            <a
                                href="/browse"
                                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
                            >
                                Browse Courses
                            </a>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {enrollments.map((enrollment) => {
                                const isExpired = enrollment.trial_ends_at && new Date() > enrollment.trial_ends_at;
                                const isFree = enrollment.course.is_free;

                                return (
                                    <div key={enrollment.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col group">
                                        <div className="relative h-48 overflow-hidden bg-gray-100">
                                            {enrollment.course.thumbnail_url ? (
                                                <Image
                                                    src={enrollment.course.thumbnail_url}
                                                    alt={enrollment.course.title}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-400">
                                                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            )}
                                            <div className="absolute top-4 right-4 flex flex-col gap-2">
                                                {isFree ? (
                                                    <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full border border-green-200 shadow-sm">
                                                        FREE
                                                    </span>
                                                ) : (
                                                    <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                                                        PREMIUM
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-6 flex-grow">
                                            <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{enrollment.course.title}</h3>
                                            <div className="space-y-3 mb-6">
                                                <div className="flex items-center text-sm">
                                                    <span className="text-gray-500 w-24">Enrolled:</span>
                                                    <span className="text-gray-900 font-medium">
                                                        {format(new Date(enrollment.enrolled_at), "MMM dd, yyyy")}
                                                    </span>
                                                </div>

                                                {enrollment.trial_ends_at && (
                                                    <div className="flex items-center text-sm">
                                                        <span className="text-gray-500 w-24">Expires:</span>
                                                        <span className={`font-medium ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                                                            {format(new Date(enrollment.trial_ends_at), "MMM dd, yyyy")}
                                                            {isExpired && " (Expired)"}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex items-center text-sm">
                                                    <span className="text-gray-500 w-24">Status:</span>
                                                    <span className={`inline-flex items-center font-bold ${enrollment.status === 'active' && !isExpired ? 'text-green-600' : 'text-amber-600'}`}>
                                                        <span className={`w-2 h-2 rounded-full mr-2 ${enrollment.status === 'active' && !isExpired ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></span>
                                                        {enrollment.status.toUpperCase()}
                                                    </span>
                                                </div>

                                                <div className="mt-4">
                                                    <div className="flex items-center justify-between text-xs mb-1">
                                                        <span className="text-gray-500">Progress</span>
                                                        <span className="text-gray-900 font-bold">{enrollment.progress}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                        <div
                                                            className="bg-indigo-600 h-full rounded-full transition-all duration-1000"
                                                            style={{ width: `${enrollment.progress}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="px-6 pb-6 mt-auto">
                                            <a
                                                href={`/app/subjects?courseId=${enrollment.course_id}`}
                                                className="block w-full text-center py-3 px-4 rounded-xl font-bold text-sm bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 transition-colors duration-200"
                                            >
                                                Go to Course
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
