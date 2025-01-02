import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';

// Threads API configuration
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'threads-api4.p.rapidapi.com';

// Specific currencies we want to track
const CURRENCIES = [
  { name: "Bitcoin", symbol: "BTC" },
  { name: "XRP", symbol: "XRP" },
  { name: "Dogecoin", symbol: "DOGE" }
];

// Function to check if cached data exists and is recent (less than 1 month old)
async function getCachedData() {
  try {
    // Use environment-specific data path for Vercel
    const dataPath = process.env.VERCEL ? '/tmp/threads-posts.json' : path.join(process.cwd(), 'data', 'threads-posts.json');

    try {
      const stats = await fs.stat(dataPath);
      const fileData = await fs.readFile(dataPath, 'utf8');
      const data = JSON.parse(fileData);

      // Check if file is less than 1 month old
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      if (new Date(stats.mtime) > oneMonthAgo) {
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

// Function to fetch posts from Threads API with improved error handling
async function fetchThreadsPosts(query, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Fetching posts for query: ${query}, Attempt: ${attempt}`);
      
      // Ensure API key exists
      if (!RAPIDAPI_KEY) {
        throw new Error('RapidAPI Key is not configured');
      }

      const response = await axios.get(`https://${RAPIDAPI_HOST}/api/search/recent`, {
        params: { query },
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': RAPIDAPI_HOST
        },
        timeout: 10000 // 10 seconds timeout
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
      console.error(`Error fetching posts for ${query} (Attempt ${attempt}):`, 
        error.response?.data || error.message);
      
      // If it's the last retry, throw the error
      if (attempt === retries) {
        throw error;
      }

      // Wait between retries
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

// Function to save data to JSON file
async function saveToJsonFile(data) {
  try {
    // Use environment-specific data path for Vercel
    const dataPath = process.env.VERCEL ? '/tmp/threads-posts.json' : path.join(process.cwd(), 'data', 'threads-posts.json');

    // Ensure directory exists
    const dataDir = path.dirname(dataPath);
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }

    // Save to JSON file
    await fs.writeFile(
      dataPath,
      JSON.stringify(data, null, 2)
    );
    console.log(`Saved results to ${dataPath}`);
    return dataPath;
  } catch (error) {
    console.error('Error saving to JSON file:', error);
    throw error;
  }
}

// Modify the main GET function to handle errors more robustly
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
    
    // Use Promise.all with limited concurrency
    for (let i = 0; i < CURRENCIES.length; i += 2) {
      const currenciesToProcess = CURRENCIES.slice(i, i + 2);
      const currencyResults = await Promise.all(
        currenciesToProcess.map(async (currency) => {
          // Search for both currency name and symbol
          const nameResults = await fetchThreadsPosts(currency.name);
          const symbolResults = await fetchThreadsPosts(currency.symbol);

          // Combine and deduplicate posts based on post ID
          const combinedPosts = [...nameResults.posts, ...symbolResults.posts];
          const uniquePosts = Array.from(new Map(combinedPosts.map(post => [post.id, post])).values());

          return {
            currency: currency.name,
            symbol: currency.symbol,
            posts: uniquePosts,
            total_posts: uniquePosts.length
          };
        })
      );

      allPosts.push(...currencyResults.filter(result => result.total_posts > 0));
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
    
    // Return a more informative error response
    return Response.json({
      success: false,
      error: error.message || 'An unexpected error occurred',
      details: error.response?.data || null
    }, { status: 500 });
  }
}