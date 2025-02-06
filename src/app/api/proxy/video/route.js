// app/api/proxy/video/route.js
import axios from 'axios';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get('url');

    if (!videoUrl) {
      return new Response('Video URL is required', { status: 400 });
    }

    const decodedUrl = decodeURIComponent(videoUrl);

    const response = await axios.get(decodedUrl, {
      responseType: 'stream',
      headers: {
        'User-Agent': 'Instagram 219.0.0.12.117 Android',
        'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
        'Range': 'bytes=0-',
        'Cookie': '',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Dest': 'video',
      },
      maxRedirects: 5,
      validateStatus: (status) => status < 400
    });

    return new Response(response.data, {
      headers: {
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
        'Vary': 'Origin',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return Response.json({ error: 'Failed to fetch video' }, { status: 500 });
  }
}