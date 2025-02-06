// app/api/proxy/video/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'URL required' }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Instagram 219.0.0.12.117 Android',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      }
    });
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Fetch failed' }, { status: response.status });
    }

    const headers = new Headers({
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET'
    });

    const contentRange = response.headers.get('content-range');
    const contentLength = response.headers.get('content-length');

    if (contentRange) headers.set('Content-Range', contentRange);
    if (contentLength) headers.set('Content-Length', contentLength);

    const blob = await response.blob();
    return new NextResponse(blob, { headers, status: 200 });

  } catch (error) {
    console.error('Video proxy error:', error);
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};