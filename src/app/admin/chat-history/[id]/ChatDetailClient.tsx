'use client';

import { ArrowLeft, User, Calendar, MessageSquare, Bot, Clock } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { pageContainer, pageTitle } from '@/styles/ui-classes';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

export type MessageData = {
    id: number;
    role: string;
    content: string;
    created_at: string;
};

export type ChatDetailData = {
    id: number;
    title: string;
    message_count: number;
    created_at: string;
    updated_at: string;
    user: {
        username: string;
        name: string | null;
    };
    subject: {
        name: string;
    } | null;
    messages: MessageData[];
};

interface ChatDetailClientProps {
    chat: ChatDetailData;
}

export default function ChatDetailClient({ chat }: ChatDetailClientProps) {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className={pageContainer}>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                <Card className="lg:col-span-3">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-indigo-500" />
                            {chat.title}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium text-nowrap">Subject</p>
                                <p className="text-sm font-semibold truncate">
                                    {chat.subject?.name || <span className="text-gray-400 italic font-normal text-xs">General</span>}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Messages</p>
                                <p className="text-sm font-bold text-indigo-600">{chat.message_count}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Started</p>
                                <p className="text-sm truncate">{formatDate(chat.created_at)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Last Activity</p>
                                <p className="text-sm truncate">{formatDate(chat.updated_at)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            Student
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            <p className="text-sm font-semibold truncate">{chat.user.name || chat.user.username}</p>
                            <p className="text-xs text-gray-500">@{chat.user.username}</p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <Link
                                href={`/admin/users/${chat.user.username}`}
                                className="text-xs text-indigo-600 hover:underline font-medium"
                            >
                                View Profile
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden flex flex-col max-h-[70vh]">
                <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700">Transcript</p>
                    <Badge variant="outline" className="text-xs font-normal">
                        <Clock className="h-3 w-3 mr-1" /> {chat.message_count} messages
                    </Badge>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 shadow-inner">
                    {chat.messages.length === 0 && (
                        <div className="text-center py-20 text-gray-400">
                            No messages recorded for this conversation.
                        </div>
                    )}

                    {chat.messages.map((message) => {
                        const isAI = message.role === 'assistant' || message.role === 'system';

                        return (
                            <div
                                key={message.id}
                                className={`flex flex-col ${isAI ? 'items-start' : 'items-end'} max-w-[85%] ${isAI ? 'mr-auto' : 'ml-auto'}`}
                            >
                                <div className="flex items-center gap-2 mb-1 px-1">
                                    {isAI && <Bot className="h-3 w-3 text-indigo-500" />}
                                    {!isAI && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Student</span>}
                                    {isAI && <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-tight">AI Assistant</span>}
                                    <span className="text-[10px] text-gray-400">{formatTime(message.created_at)}</span>
                                </div>

                                <div
                                    className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${isAI
                                        ? 'bg-white text-gray-800 border-gray-100 rounded-tl-sm w-full'
                                        : 'bg-indigo-600 text-white rounded-tr-sm'
                                        }`}
                                >
                                    {isAI ? (
                                        <div className="prose prose-sm max-w-none break-words">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}
                                                rehypePlugins={[rehypeKatex]}
                                                components={{
                                                    code({ node, inline, className, children, ...props }: any) {
                                                        return !inline ? (
                                                            <pre className="bg-gray-900 text-gray-100 p-3 rounded-md overflow-x-auto my-2">
                                                                <code {...props}>{children}</code>
                                                            </pre>
                                                        ) : (
                                                            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-indigo-600" {...props}>
                                                                {children}
                                                            </code>
                                                        );
                                                    },
                                                    table({ children }) {
                                                        return (
                                                            <div className="overflow-x-auto my-4 border rounded-lg">
                                                                <table className="min-w-full divide-y divide-gray-200">{children}</table>
                                                            </div>
                                                        );
                                                    },
                                                    th({ children }) {
                                                        return <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{children}</th>;
                                                    },
                                                    td({ children }) {
                                                        return <td className="px-4 py-3 whitespace-nowrap text-sm border-t border-gray-100">{children}</td>;
                                                    },
                                                    p({ children }) { return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>; },
                                                    ul({ children }) { return <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>; },
                                                    ol({ children }) { return <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>; },
                                                    li({ children }) { return <li className="leading-relaxed">{children}</li>; },
                                                    h1({ children }) { return <h1 className="text-xl font-bold mb-2 mt-4">{children}</h1>; },
                                                    h2({ children }) { return <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>; },
                                                    h3({ children }) { return <h3 className="text-base font-bold mb-1 mt-2">{children}</h3>; },
                                                }}
                                            >
                                                {message.content.replace(/```json\s*({[\s\S]*"related_questions"[\s\S]*})\s*```/g, "")}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <div className="whitespace-pre-wrap">{message.content}</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
