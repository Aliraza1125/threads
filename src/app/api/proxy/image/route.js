import axios from 'axios';

export async function GET(request) {
  const url = new URL(request.url);
  const imageUrl = url.searchParams.get('url');

  try {
    if (!imageUrl) {
      return new Response('Image URL is required', { status: 400 });
    }

    const decodedUrl = decodeURIComponent(imageUrl);
    const response = await axios.get(decodedUrl, {
      responseType: 'arraybuffer',
      timeout: 5000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.instagram.com/',
        'Origin': 'https://www.instagram.com',
        'Connection': 'keep-alive',
        'Sec-Fetch-Site': 'same-site',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Dest': 'image',
      },
      validateStatus: (status) => status >= 200 && status < 500
    });

    if (response.status === 403) {
      console.warn(`Access forbidden for URL: ${decodedUrl}`);
      return new Response('Forbidden - Unable to access image', { 
        status: 403,
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-store'
        }
      });
    }

    if (response.status !== 200) {
      return new Response(`Error: ${response.status}`, { 
        status: response.status,
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-store'
        }
      });
    }

    const contentType = response.headers['content-type'] || 'image/jpeg';

    const headers = new Headers({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff',
      'Timing-Allow-Origin': '*',
      'Vary': 'Accept'
    });

    return new Response(response.data, { headers });

  } catch (error) {
    console.error('Proxy error:', {
      message: error.message,
      code: error.code,
      url: url.searchParams.get('url')
    });

    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return new Response('Request timeout', { status: 504 });
    }

    return new Response(error.message, { 
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store'
      }
    });
  }
}