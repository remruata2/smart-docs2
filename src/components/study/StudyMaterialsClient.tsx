"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlashcardViewer } from "@/components/study/FlashcardViewer";
import { VideoGallery } from "@/components/study/VideoGallery";
import { BookOpen, Video, CreditCard, Book } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface StudyMaterialsClientProps {
    materials: any;
}

export function StudyMaterialsClient({ materials }: StudyMaterialsClientProps) {
    const summary = materials.summary as any;
    const definitions = materials.definitions as any[];
    const flashcards = materials.flashcards as any[];
    const videos = materials.curated_videos as any[];

    return (
        <div className="space-y-8">
            <Tabs defaultValue="overview" className="w-full">
                <div className="flex justify-center mb-8">
                    <TabsList className="grid w-full max-w-3xl grid-cols-2 md:grid-cols-4 h-auto md:h-14 p-1 bg-muted/50 backdrop-blur-sm border rounded-xl md:rounded-full gap-1">
                        <TabsTrigger
                            value="overview"
                            className="cursor-pointer rounded-lg md:rounded-full data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300 h-10 md:h-full"
                        >
                            <BookOpen className="w-4 h-4 mr-2" />
                            <span className="font-medium">Overview</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="keyterms"
                            className="cursor-pointer rounded-lg md:rounded-full data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300 h-10 md:h-full"
                        >
                            <Book className="w-4 h-4 mr-2" />
                            <span className="font-medium">Key Terms</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="flashcards"
                            className="cursor-pointer rounded-lg md:rounded-full data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300 h-10 md:h-full"
                        >
                            <CreditCard className="w-4 h-4 mr-2" />
                            <span className="font-medium">Flashcards</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="videos"
                            className="cursor-pointer rounded-lg md:rounded-full data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300 h-10 md:h-full"
                        >
                            <Video className="w-4 h-4 mr-2" />
                            <span className="font-medium">Videos</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="overview" className="space-y-8 animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
                    {/* Summary */}
                    <Card className="border-none shadow-lg overflow-hidden bg-white dark:bg-gray-800">
                        <CardHeader className="bg-muted/30 pb-4">
                            <CardTitle className="text-xl font-bold flex items-center gap-2 text-purple-700 dark:text-green-400">
                                <BookOpen className="w-6 h-6" /> Chapter Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="prose prose-lg prose-slate dark:prose-invert max-w-none prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground">
                                <ReactMarkdown
                                    components={{
                                        h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mb-6 mt-2 text-foreground" {...props} />,
                                        h2: ({ node, ...props }) => <h2 className="text-2xl font-semibold mb-4 mt-8 border-b pb-2 border-border" {...props} />,
                                        h3: ({ node, ...props }) => <h3 className="text-xl font-semibold mb-3 mt-6" {...props} />,
                                        p: ({ node, ...props }) => <p className="mb-4 leading-relaxed text-muted-foreground" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
                                        li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                    }}
                                >
                                    {summary?.brief || "No summary available"}
                                </ReactMarkdown>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="keyterms" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
                    {/* Key Terms */}
                    {definitions && definitions.length > 0 ? (
                        <Card className="border-none shadow-lg overflow-hidden bg-white dark:bg-gray-800">
                            <CardHeader className="bg-muted/30 pb-4">
                                <CardTitle className="text-xl font-bold flex items-center gap-2 text-purple-700 dark:text-green-400">
                                    <Book className="w-6 h-6" /> Key Terms & Definitions
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {definitions.map((def, idx) => (
                                        <div key={idx} className="group p-4 rounded-xl bg-card border hover:border-blue-500/50 hover:shadow-md transition-all duration-200">
                                            <dt className="font-bold text-lg mb-2 text-blue-700 dark:text-blue-400 group-hover:text-blue-600 transition-colors">{def.term}</dt>
                                            <dd className="text-muted-foreground text-sm leading-relaxed">{def.definition}</dd>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">No definitions available</div>
                    )}
                </TabsContent>

                <TabsContent value="flashcards" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
                    <Card className="border-none shadow-xl bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-gray-900">
                        <CardHeader className="text-center pb-2">
                            <CardTitle className="text-2xl font-bold text-purple-600 dark:text-purple-400">Interactive Flashcards</CardTitle>
                            <p className="text-muted-foreground">Test your knowledge with these cards</p>
                        </CardHeader>
                        <CardContent className="p-6">
                            <FlashcardViewer flashcards={flashcards || []} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="videos" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
                    <Card className="border-none shadow-xl">
                        <CardHeader>
                            <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                                <Video className="w-6 h-6 text-red-500" />
                                Curated Educational Videos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <VideoGallery videos={videos || []} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
