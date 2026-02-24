'use client';

import { useState, useMemo } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, MessageSquare, Eye } from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";

export type ChatHistoryData = {
    id: number;
    title: string;
    message_count: number;
    created_at: string;
    updated_at: string;
    user: {
        id: number;
        username: string;
        name: string | null;
        enrollments: {
            course_id: number;
        }[];
    };
    subject: {
        id: number;
        name: string;
        courses: {
            id: number;
        }[];
    } | null;
};

export type CourseOption = {
    id: number;
    title: string;
};

interface ChatHistoryClientProps {
    initialConversations: ChatHistoryData[];
    courses: CourseOption[];
}

export default function ChatHistoryClient({ initialConversations, courses }: ChatHistoryClientProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCourse, setSelectedCourse] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12; // Adjusted for viewport height

    const filteredConversations = useMemo(() => {
        return initialConversations.filter((chat) => {
            // Filter by search term
            const matchesSearch =
                chat.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                chat.user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (chat.user.name && chat.user.name.toLowerCase().includes(searchTerm.toLowerCase()));

            if (!matchesSearch) return false;

            // Filter by course
            if (selectedCourse === 'all') return true;

            const courseId = parseInt(selectedCourse);

            // logic: user must be enrolled AND if subject exists, it must be in the course
            const userEnrolled = chat.user.enrollments.some(e => e.course_id === courseId);
            const subjectInCourse = chat.subject
                ? chat.subject.courses.some(c => c.id === courseId)
                : true; // If no subject, assume it's a general chat? Or filter out? 
            // Given the requirement, if user is enrolled but chat has no subject, 
            // maybe it's still relevant to the course context. 
            // But usually chats have subjects in this app.

            return userEnrolled && subjectInCourse;
        });
    }, [initialConversations, searchTerm, selectedCourse]);

    // Pagination logic
    const totalPages = Math.ceil(filteredConversations.length / itemsPerPage);
    const paginatedChats = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredConversations.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredConversations, currentPage]);

    // Reset to page 1 when search or filter changes
    useMemo(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedCourse]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium text-gray-700">Search Conversations</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search by title or student name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                <div className="w-full sm:w-64 space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Filter className="h-4 w-4" /> Filter by Course
                    </label>
                    <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Course" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Courses</SelectItem>
                            {courses.map((course) => (
                                <SelectItem key={course.id} value={course.id.toString()}>
                                    {course.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50">
                            <TableHead className="w-[120px]">Last Activity</TableHead>
                            <TableHead className="w-[180px]">Student</TableHead>
                            <TableHead className="max-w-[300px]">Conversation Title</TableHead>
                            <TableHead className="w-[140px]">Subject</TableHead>
                            <TableHead className="w-[100px]">Messages</TableHead>
                            <TableHead className="text-right w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedChats.length > 0 ? (
                            paginatedChats.map((chat) => (
                                <TableRow key={chat.id}>
                                    <TableCell className="text-xs text-gray-500">
                                        {formatDate(chat.updated_at)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{chat.user.name || chat.user.username}</div>
                                        <div className="text-xs text-gray-500">@{chat.user.username}</div>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2 max-w-[300px]">
                                            <MessageSquare className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                            <span className="truncate" title={chat.title}>{chat.title}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {chat.subject ? (
                                            <Badge variant="outline" className="font-normal">
                                                {chat.subject.name}
                                            </Badge>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">General</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 font-medium italic">
                                            {chat.message_count} msgs
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/admin/chat-history/${chat.id}`} className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1">
                                                <Eye className="h-4 w-4" /> View
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                                    No chat history found matching your filters.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-4 border-t">
                    <div className="text-sm text-gray-500">
                        Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredConversations.length)}</span> of <span className="font-medium">{filteredConversations.length}</span> results
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        <div className="flex items-center gap-1 px-2">
                            <span className="text-sm font-medium">{currentPage}</span>
                            <span className="text-sm text-gray-400">/</span>
                            <span className="text-sm text-gray-400">{totalPages}</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
