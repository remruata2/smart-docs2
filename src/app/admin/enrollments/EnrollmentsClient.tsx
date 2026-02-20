"use client";

import { useCallback, useEffect, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Filter,
    Users,
    BookOpen,
    CreditCard,
    Clock,
    Gift,
    AlertTriangle,
    Download,
    RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pageContainer } from "@/styles/ui-classes";

interface Enrollment {
    id: number;
    enrolled_at: string;
    trial_ends_at: string | null;
    is_paid: boolean;
    status: string;
    progress: number;
    enrollmentType: "paid" | "trial" | "trial_expired" | "free";
    user: { id: number; username: string; email: string | null; name: string | null };
    course: { id: number; title: string; is_free: boolean; price: string | null };
}

interface Course {
    id: number;
    title: string;
}

const TYPE_OPTIONS = [
    { value: "all", label: "All Types" },
    { value: "paid", label: "Paid" },
    { value: "trial", label: "Trial" },
    { value: "free", label: "Free" },
];

const STATUS_OPTIONS = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "expired", label: "Expired / Inactive" },
];

function getTypeBadge(type: Enrollment["enrollmentType"]) {
    switch (type) {
        case "paid":
            return (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 gap-1">
                    <CreditCard className="w-3 h-3" /> Paid
                </Badge>
            );
        case "trial":
            return (
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-0 gap-1">
                    <Clock className="w-3 h-3" /> Trial
                </Badge>
            );
        case "trial_expired":
            return (
                <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-0 gap-1">
                    <AlertTriangle className="w-3 h-3" /> Trial Expired
                </Badge>
            );
        case "free":
            return (
                <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-0 gap-1">
                    <Gift className="w-3 h-3" /> Free
                </Badge>
            );
    }
}

export default function EnrollmentsClient() {
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [totals, setTotals] = useState({ all: 0, paid: 0, trial: 0, free: 0, expired: 0 });
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [courseFilter, setCourseFilter] = useState("all");
    const [page, setPage] = useState(1);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchEnrollments = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: "20",
                search: debouncedSearch,
                type: typeFilter,
                status: statusFilter,
                ...(courseFilter !== "all" ? { courseId: courseFilter } : {}),
            });

            const res = await fetch(`/api/admin/enrollments?${params}`);
            const data = await res.json();
            setEnrollments(data.enrollments || []);
            setTotal(data.total || 0);
            setTotalPages(data.totalPages || 1);
            if (data.courses?.length) setCourses(data.courses);
            if (data.totals) setTotals(data.totals);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, typeFilter, statusFilter, courseFilter]);

    useEffect(() => {
        fetchEnrollments();
    }, [fetchEnrollments]);

    // Reset page on filter change
    const handleTypeChange = (v: string) => { setTypeFilter(v); setPage(1); };
    const handleStatusChange = (v: string) => { setStatusFilter(v); setPage(1); };
    const handleCourseChange = (v: string) => { setCourseFilter(v); setPage(1); };

    return (
        <div className={pageContainer}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Enrollments</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {total.toLocaleString()} total enrollments
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchEnrollments} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
                {[
                    { label: "Total", value: totals.all, icon: Users, color: "text-blue-600" },
                    { label: "Paid", value: totals.paid, icon: CreditCard, color: "text-emerald-600" },
                    { label: "Active Trials", value: totals.trial, icon: Clock, color: "text-orange-600" },
                    { label: "Free", value: totals.free, icon: Gift, color: "text-gray-600" },
                    { label: "Expired", value: totals.expired, icon: AlertTriangle, color: "text-red-600" },
                ].map((s) => (
                    <Card key={s.label} className="border-none shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</CardTitle>
                            <s.icon className={`w-4 h-4 ${s.color}`} />
                        </CardHeader>
                        <CardContent className="pb-4 px-4">
                            <p className="text-2xl font-bold">{s.value.toLocaleString()}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        className="pl-9"
                        placeholder="Search by name, username or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Select value={typeFilter} onValueChange={handleTypeChange}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                        <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                        {TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={courseFilter} onValueChange={handleCourseChange}>
                    <SelectTrigger className="w-full sm:w-[220px]">
                        <SelectValue placeholder="All Courses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Courses</SelectItem>
                        {courses.map(c => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <Card className="border-none shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-b">
                                <TableHead className="pl-6">User</TableHead>
                                <TableHead>Course</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Enrolled</TableHead>
                                <TableHead>Trial Ends</TableHead>
                                <TableHead>Progress</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                [...Array(8)].map((_, i) => (
                                    <TableRow key={i}>
                                        {[...Array(7)].map((_, j) => (
                                            <TableCell key={j}>
                                                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : enrollments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                                        <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-30" />
                                        No enrollments found matching the filters.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                enrollments.map((e) => (
                                    <TableRow key={e.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                                        <TableCell className="pl-6">
                                            <div>
                                                <p className="font-medium text-sm">{e.user.name || e.user.username}</p>
                                                <p className="text-xs text-muted-foreground">{e.user.email || e.user.username}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-sm max-w-[180px] truncate" title={e.course.title}>{e.course.title}</p>
                                            {e.course.price && !e.course.is_free && (
                                                <p className="text-xs text-muted-foreground">₹{e.course.price}</p>
                                            )}
                                        </TableCell>
                                        <TableCell>{getTypeBadge(e.enrollmentType)}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                            {format(new Date(e.enrolled_at), "MMM d, yyyy")}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                            {e.trial_ends_at ? (
                                                <span className={new Date(e.trial_ends_at) < new Date() ? "text-red-500 font-medium" : ""}>
                                                    {formatDistanceToNow(new Date(e.trial_ends_at), { addSuffix: true })}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-500 rounded-full"
                                                        style={{ width: `${e.progress}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-muted-foreground">{e.progress}%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={e.status === "active" ? "default" : "secondary"} className="text-[10px]">
                                                {e.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-sm text-muted-foreground">
                            Page {page} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
