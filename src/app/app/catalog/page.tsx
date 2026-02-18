import { getCatalogData } from "@/app/(browse)/actions";
import { CourseCard } from "@/components/catalog/CourseCard";
import { BookOpen } from "lucide-react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export default async function CatalogPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect("/login");
    }

    const data: any = await getCatalogData();
    const { categories, upcoming, isAuthenticated } = data;

    return (
        <div className="container mx-auto px-4 py-8 pb-24 md:pb-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Explore Courses</h1>
                <p className="text-gray-500 mt-2">Find the perfect course for your exam preparation</p>
            </div>

            <div className="space-y-12">
                {categories?.map((category: any) => (
                    <section key={category.id}>
                        <div className="flex items-center gap-4 mb-6">
                            <h2 className="text-xl font-bold text-gray-900">{category.name}</h2>
                            <div className="h-px flex-1 bg-gray-100"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {category.courses.map((course: any) => (
                                <CourseCard key={course.id} course={course} isAuthenticated={isAuthenticated} />
                            ))}
                        </div>
                    </section>
                ))}

                {/* Upcoming Section */}
                {upcoming && upcoming.length > 0 && (
                    <div className="mt-12">
                        <div className="flex items-center gap-4 mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Coming Soon</h2>
                            <div className="h-px flex-1 bg-gray-100"></div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {upcoming.map((category: any) => (
                                <div key={category.id} className="p-6 bg-gray-50 rounded-xl border border-gray-200 text-center">
                                    <h4 className="font-semibold text-gray-900 mb-1">{category.name}</h4>
                                    <p className="text-xs font-medium text-emerald-600 bg-emerald-50 inline-block px-2 py-1 rounded-full mt-2">Coming Soon</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {(!categories || categories.length === 0) && (!upcoming || upcoming.length === 0) && (
                    <div className="text-center py-20 bg-gray-50 rounded-xl border-dashed border-2 border-gray-200">
                        <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <BookOpen className="w-6 h-6 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">No courses available yet</h3>
                    </div>
                )}
            </div>
        </div>
    );
}
