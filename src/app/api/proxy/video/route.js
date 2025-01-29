// app/api/proxy/video/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' }, 
        { status: 400 }
      );
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch video' },
        { status: response.status }
      );
    }

    // Get the headers from the original response
    const contentType = response.headers.get('content-type');
    const contentRange = response.headers.get('content-range');
    const contentLength = response.headers.get('content-length');

    // Create headers for our response
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', contentType || 'video/mp4');
    responseHeaders.set('Accept-Ranges', 'bytes');
    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange);
    }
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }
    responseHeaders.set('Cache-Control', 'public, max-age=31536000');
    // Add CORS headers if needed
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET');

    // Stream the response
    const blob = await response.blob();
    return new NextResponse(blob, {
      headers: responseHeaders,
      status: response.status,
    });

  } catch (error) {
    console.error('Video proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy video' },
      { status: 500 }
    );
  }
}

// Configure the API route
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};