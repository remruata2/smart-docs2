/**
 * YouTube Data API v3 Service
 * Provides functions to search for educational videos based on topics/queries
 */

export interface YouTubeVideo {
    videoId: string;
    title: string;
    duration: string; // e.g., "PT10M30S" or formatted "10:30"
    thumbnail: string;
    channelTitle: string;
    viewCount?: number;
}

interface YouTubeSearchConfig {
    query: string;
    maxResults?: number;
    maxDuration?: number; // in minutes
    minViews?: number;
}

/**
 * Search for educational videos on YouTube
 * Requires YOUTUBE_API_KEY in environment variables
 */
export async function searchYouTubeVideos(config: YouTubeSearchConfig): Promise<YouTubeVideo[]> {
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
        console.warn("YOUTUBE_API_KEY not configured. Skipping video search.");
        return [];
    }

    const {
        query,
        maxResults = 3,
        maxDuration = 25, // Relaxed from 15 to 25 minutes
        minViews = 500,  // Relaxed from 1000 to 500
    } = config;

    try {
        // Step 1: Search for videos
        const searchQuery = query.toLowerCase().includes('english') ? query : `${query} English`;
        const searchParams = new URLSearchParams({
            part: 'snippet',
            q: searchQuery,
            type: 'video',
            maxResults: String(maxResults * 2), // Get more to filter
            key: apiKey,
            videoDuration: 'medium', // 4-20 minutes
            videoEmbeddable: 'true',
            videoSyndicated: 'true',
            relevanceLanguage: 'en',
            safeSearch: 'strict',
        });

        const searchResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/search?${searchParams}`,
            { cache: 'force-cache', next: { revalidate: 86400 } } // Cache for 24 hours
        );

        if (!searchResponse.ok) {
            throw new Error(`YouTube API error: ${searchResponse.statusText}`);
        }

        const searchData = await searchResponse.json();
        const videoIds = searchData.items?.map((item: any) => item.id.videoId).filter(Boolean) || [];

        if (videoIds.length === 0) {
            return [];
        }

        // Step 2: Get video details (duration, views)
        const detailsParams = new URLSearchParams({
            part: 'contentDetails,statistics,snippet',
            id: videoIds.join(','),
            key: apiKey,
        });

        const detailsResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?${detailsParams}`,
            { cache: 'force-cache', next: { revalidate: 86400 } }
        );

        if (!detailsResponse.ok) {
            throw new Error(`YouTube API error: ${detailsResponse.statusText}`);
        }

        const detailsData = await detailsResponse.json();

        // Step 3: Filter and format results
        const videos: YouTubeVideo[] = detailsData.items
            ?.map((item: any) => {
                const durationSeconds = parseDuration(item.contentDetails.duration);
                const viewCount = parseInt(item.statistics.viewCount || '0');

                // Filter by duration and view count
                if (durationSeconds > maxDuration * 60 || viewCount < minViews) {
                    return null;
                }

                return {
                    videoId: item.id,
                    title: item.snippet.title,
                    duration: formatDuration(durationSeconds),
                    thumbnail: item.snippet.thumbnails.medium.url,
                    channelTitle: item.snippet.channelTitle,
                    viewCount,
                };
            })
            .filter(Boolean)
            .slice(0, maxResults) || [];

        return videos;

    } catch (error) {
        console.error("Error searching YouTube videos:", error);
        return [];
    }
}

/**
 * Parse ISO 8601 duration (PT10M30S) to seconds
 */
function parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
}
