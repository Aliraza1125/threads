import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';

// Threads API configuration
const RAPIDAPI_KEY = '47d3008859msh5fe50d70249f660p1db0b3jsnf3ce9b66332c';
const RAPIDAPI_HOST = 'threads-api4.p.rapidapi.com';

// Specific currencies we want to track
const CURRENCIES = [
  { name: "Bitcoin", symbol: "BTC" },
  { name: "XRP", symbol: "XRP" },
  { name: "Dogecoin", symbol: "DOGE" }
];

// Function to check if cached data exists and is recent (less than 1 hour old)
async function getCachedData() {
  try {
    const projectRoot = process.cwd();
    const filePath = path.join(projectRoot, 'data', 'threads-posts.json');

    try {
      const stats = await fs.stat(filePath);
      const fileData = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(fileData);

      // Check if file is less than 1 month old
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      if (stats.mtime > oneMonthAgo) {
        console.log('Using cached data');
        return data;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error reading cache:', error);
      }
    }
    return null;
  } catch (error) {
    console.error('Error checking cache:', error);
    return null;
  }
}

// Function to process thread items from the API response
function processThreadData(edges) {
  if (!edges || !Array.isArray(edges)) return [];

  return edges.map(edge => {
    const thread = edge.node?.thread;
    if (!thread) return null;

    const threadItems = thread.thread_items || [];
    const processedItems = threadItems.map(item => {
      if (!item.post) return null;

      return {
        id: item.post.pk || '',
        user: {
          id: item.post.user?.pk || '',
          username: item.post.user?.username || '',
          is_verified: item.post.user?.is_verified || false,
          profile_pic_url: item.post.user?.profile_pic_url || ''
        },
        content: item.post.caption?.text || '',
        media_type: item.post.media_type,
        like_count: item.post.like_count || 0,
        taken_at: item.post.taken_at || '',
        has_replies: item.should_show_replies_cta || false,
        cursor: edge.cursor || null
      };
    }).filter(item => item !== null);

    return processedItems;
  })
    .filter(items => items !== null && items.length > 0)
    .flat();
}

// Function to fetch posts from Threads API
async function fetchThreadsPosts(query) {
  try {
    console.log(`Fetching posts for query: ${query}`);
    const response = await axios.get(`https://${RAPIDAPI_HOST}/api/search/recent`, {
      params: {
        query: query
      },
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST
      }
    });

    const searchResults = response.data?.data?.searchResults;
    if (!searchResults) {
      console.log('No search results found');
      return {
        posts: [],
        pagination: {
          has_next_page: false,
          end_cursor: null
        }
      };
    }

    const processedPosts = processThreadData(searchResults.edges || []);
    console.log(`Processed ${processedPosts.length} posts for ${query}`);

    return {
      posts: processedPosts,
      pagination: {
        has_next_page: searchResults.page_info?.has_next_page || false,
        end_cursor: searchResults.page_info?.end_cursor || null
      }
    };
  } catch (error) {
    console.error(`Error fetching posts for ${query}:`, error.response?.data || error.message);
    return {
      posts: [],
      pagination: {
        has_next_page: false,
        end_cursor: null
      }
    };
  }
}

// Function to save data to JSON file
async function saveToJsonFile(data) {
  try {
    // Get the project root directory
    const projectRoot = process.cwd();

    // Create data directory if it doesn't exist
    const dataDir = path.join(projectRoot, 'data');
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }

    // Save to JSON file
    const filePath = path.join(dataDir, 'threads-posts.json');
    await fs.writeFile(
      filePath,
      JSON.stringify(data, null, 2)
    );
    console.log(`Saved results to ${filePath}`);
    return filePath;
  } catch (error) {
    console.error('Error saving to JSON file:', error);
    throw error;
  }
}

export async function GET() {
  try {
    console.log('Starting fetch-threads-posts request...');

    // First, try to get cached data
    const cachedData = await getCachedData();
    if (cachedData) {
      return Response.json({
        success: true,
        message: 'Posts retrieved from cache',
        data: cachedData
      });
    }

    // If no cache or cache is old, fetch new data
    const allPosts = [];
    let lastPagination = null;

    console.log(`Processing ${CURRENCIES.length} currencies...`);
    for (const currency of CURRENCIES) {
      // Search for both currency name and symbol
      const nameResults = await fetchThreadsPosts(currency.name);
      const symbolResults = await fetchThreadsPosts(currency.symbol);

      // Combine and deduplicate posts based on post ID
      const combinedPosts = [...nameResults.posts, ...symbolResults.posts];
      const uniquePosts = Array.from(new Map(combinedPosts.map(post => [post.id, post])).values());

      if (uniquePosts.length > 0) {
        allPosts.push({
          currency: currency.name,
          symbol: currency.symbol,
          posts: uniquePosts,
          total_posts: uniquePosts.length
        });
        console.log(`Added ${uniquePosts.length} unique posts for ${currency.name}`);
      }

      // Store pagination info from the last request
      lastPagination = symbolResults.pagination;

      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Save the new data to cache
    const savedFilePath = await saveToJsonFile({
      posts: allPosts,
      pagination: lastPagination,
      timestamp: new Date().toISOString()
    });

    return Response.json({
      success: true,
      message: 'Posts fetched and cached successfully',
      postsCount: allPosts.reduce((acc, curr) => acc + curr.total_posts, 0),
      filePath: savedFilePath,
      data: allPosts,
      pagination: lastPagination
    });
  } catch (error) {
    console.error('Error in fetch-threads-posts route:', error);
    return Response.json({
      success: false,
      error: error.message,
      details: error.response?.data
    }, { status: 500 });
  }
}