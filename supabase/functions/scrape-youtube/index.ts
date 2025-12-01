import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface YouTubeVideoSnippet {
  title: string;
  description: string;
  publishedAt: string;
  thumbnails: {
    default?: { url: string };
    medium?: { url: string };
    high?: { url: string };
  };
  channelId: string;
  channelTitle: string;
}

interface YouTubeVideoStatistics {
  viewCount: string;
  likeCount: string;
  commentCount: string;
}

interface YouTubeVideoContentDetails {
  duration: string;
}

interface YouTubeVideo {
  id: string;
  snippet: YouTubeVideoSnippet;
  statistics: YouTubeVideoStatistics;
  contentDetails: YouTubeVideoContentDetails;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { channel_id } = await req.json();

    if (!channel_id) {
      return new Response(
        JSON.stringify({ error: 'channel_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');
    if (!youtubeApiKey) {
      return new Response(
        JSON.stringify({ error: 'YouTube API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${youtubeApiKey}&channelId=${channel_id}&part=snippet&order=date&maxResults=10&type=video`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (!searchResponse.ok) {
      throw new Error(searchData.error?.message || 'Failed to fetch videos');
    }

    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');

    if (!videoIds) {
      return new Response(
        JSON.stringify({ message: 'No videos found', videos: [] }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const videosUrl = `https://www.googleapis.com/youtube/v3/videos?key=${youtubeApiKey}&id=${videoIds}&part=snippet,statistics,contentDetails`;
    const videosResponse = await fetch(videosUrl);
    const videosData = await videosResponse.json();

    if (!videosResponse.ok) {
      throw new Error(videosData.error?.message || 'Failed to fetch video details');
    }

    const videos = videosData.items.map((video: YouTubeVideo) => ({
      video_id: video.id,
      channel_id: video.snippet.channelId,
      channel_name: video.snippet.channelTitle,
      title: video.snippet.title,
      description: video.snippet.description,
      published_at: video.snippet.publishedAt,
      thumbnail_url: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.medium?.url || '',
      view_count: parseInt(video.statistics?.viewCount || '0'),
      like_count: parseInt(video.statistics?.likeCount || '0'),
      comment_count: parseInt(video.statistics?.commentCount || '0'),
      duration: video.contentDetails?.duration || '',
      status: 'pending',
    }));

    for (const video of videos) {
      const { error } = await supabase
        .from('youtube_videos')
        .upsert(video, {
          onConflict: 'video_id',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error('Error inserting video:', error);
      }
    }

    const { error: updateError } = await supabase
      .from('media_sources')
      .update({ video_count: videos.length })
      .eq('youtube_channel_id', channel_id);

    if (updateError) {
      console.error('Error updating media source:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Scraped ${videos.length} videos`,
        videos,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in scrape-youtube:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});