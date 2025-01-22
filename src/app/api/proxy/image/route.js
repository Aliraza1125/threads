// app/api/proxy/image/route.js
import axios from 'axios';

export async function GET(request) {
  try {
    // Get the image URL from the query parameters
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return new Response('Image URL is required', { status: 400 });
    }

    // Decode the URL if it's encoded
    const decodedUrl = decodeURIComponent(imageUrl);

    // Fetch the image
    const response = await axios.get(decodedUrl, {
      responseType: 'arraybuffer',
      headers: {
        // Add Instagram-specific headers
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': 'https://www.instagram.com/',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    // Get the content type from the response
    const contentType = response.headers['content-type'];

    // Return the image with proper headers
    return new Response(response.data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error proxying image:', error);
    return new Response('Error fetching image', { status: 500 });
  }
}