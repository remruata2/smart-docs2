"use client";

interface Video {
    videoId: string;
    title: string;
    duration: string;
    thumbnail: string;
}

interface VideoGalleryProps {
    videos: Video[];
    hasApiKey?: boolean;
}

export function VideoGallery({ videos, hasApiKey = true }: VideoGalleryProps) {
    if (!videos || videos.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                {hasApiKey
                    ? "No educational videos found for this specific topic."
                    : "No curated videos available. Add YOUTUBE_API_KEY to environment variables."}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {videos.map((video, index) => (
                <div key={`${video.videoId}-${index}`} className="space-y-2">
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                        <iframe
                            src={`https://www.youtube.com/embed/${video.videoId}`}
                            title={video.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className=" absolute inset-0 w-full h-full"
                        />
                    </div>
                    <div>
                        <h4 className="font-medium line-clamp-2">{video.title}</h4>
                        <p className="text-sm text-muted-foreground">{video.duration}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
