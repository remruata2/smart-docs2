"use client";

import { useState } from "react";
import { Play } from "lucide-react";

// Helper to extract YouTube video ID from various link formats
const extractVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
};

// Placeholder links (using the one provided by the user)
const videoLinks = [
    { title: "Tutorial 1 - Overall Features", url: "https://www.youtube.com/watch?v=Rhfc8G7v1EA" },
    { title: "Tutorial 2 - Course Enrolment and Brief Walkthrough", url: "https://www.youtube.com/watch?v=DZ6C_qTaelw" },
    { title: "Tutorial 3 - Study Hub", url: "https://www.youtube.com/watch?v=bEBmdzbA-wE" },
    { title: "Tutorial 4 - AI Tutor", url: "https://www.youtube.com/watch?v=9LbwdKR1uWA" },
    { title: "Tutorial 5 - Mock Test", url: "https://www.youtube.com/watch?v=vbnKovyJHqk" },
    { title: "Tutorial 6 - Battle Mode", url: "https://www.youtube.com/watch?v=GaOWH4gnRf4" },
    { title: "Tutorial 7 - Custom Content", url: "https://www.youtube.com/watch?v=_A92nROFoUw" },
    { title: "Tutorial 8 - Performance Assessment", url: "https://www.youtube.com/watch?v=v3PeDYkzcRU" },
];

export default function TutorialVideosPage() {
    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                    <Play className="h-8 w-8 mr-3 text-indigo-600" />
                    Tutorial Videos
                </h1>
                <p className="text-gray-600">
                    Watch these tutorials to learn how to get the most out of Zirna.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {videoLinks.map((video, index) => {
                    const videoId = extractVideoId(video.url);

                    return (
                        <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col transition-all hover:shadow-md">
                            <div className="aspect-video bg-gray-100 relative w-full">
                                {videoId ? (
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        src={`https://www.youtube.com/embed/${videoId}`}
                                        title={video.title}
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="absolute inset-0"
                                    ></iframe>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        Invalid Video URL
                                    </div>
                                )}
                            </div>
                            <div className="p-4 flex-1 flex flex-col justify-between">
                                <h3 className="font-semibold text-gray-900 line-clamp-2">
                                    {video.title}
                                </h3>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
