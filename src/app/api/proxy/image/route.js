// app/api/proxy/image/route.js
import axios from 'axios';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return new Response('Image URL is required', { status: 400 });
    }

    const decodedUrl = decodeURIComponent(imageUrl);

    const response = await axios.get(decodedUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Instagram 219.0.0.12.117 Android',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Cookie': '', // Empty cookie to avoid Instagram blocking
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Dest': 'image',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      maxRedirects: 5,
      validateStatus: (status) => status < 400
    });

    return new Response(response.data, {
      headers: {
        'Content-Type': response.headers['content-type'] || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
        'Vary': 'Origin',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return Response.json({ error: 'Failed to fetch image' }, { status: 500 });
  }
}