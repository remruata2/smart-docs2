"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuizGenerator } from "./QuizGenerator";
import { BattleLobby } from "@/components/battle/BattleLobby";
import { BrainCircuit, Swords } from "lucide-react";
import { useState } from "react";

interface PracticeTabsProps {
    initialSubjectId?: string;
    initialChapterId?: string;
    initialSubjects: any[];
    initialCourses: any[];
    battleCourseId: string;
}

export function PracticeTabs({
    initialSubjectId,
    initialChapterId,
    initialSubjects,
    initialCourses,
    battleCourseId
}: PracticeTabsProps) {
    const [activeTab, setActiveTab] = useState("mock-test");

    return (
        <div className="w-full space-y-6">
            <div className="flex flex-col items-center">
                <Tabs defaultValue="mock-test" value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex justify-center mb-6">
                        <TabsList className="grid w-full max-w-md grid-cols-2 h-12">
                            <TabsTrigger value="mock-test" className="text-sm md:text-base h-full font-medium">
                                <BrainCircuit className="w-4 h-4 mr-2" />
                                Mock Test
                            </TabsTrigger>
                            <TabsTrigger value="battle" className="text-sm md:text-base h-full font-medium">
                                <Swords className="w-4 h-4 mr-2" />
                                Battle Arena
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="mock-test" className="mt-0">
                        <QuizGenerator
                            initialSubjectId={initialSubjectId}
                            initialChapterId={initialChapterId}
                            initialSubjects={initialSubjects}
                            initialCourses={initialCourses}
                        />
                    </TabsContent>

                    <TabsContent value="battle" className="mt-0">
                        <BattleLobby
                            initialSubjects={initialSubjects}
                            courseId={battleCourseId}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
