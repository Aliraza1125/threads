import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';

const RAPIDAPI_KEY = 'e24b9156abmshdf9b08bb4abe7b9p11227fjsnffd05261ebe2';
const RAPIDAPI_HOST = 'threads-api4.p.rapidapi.com';

const CURRENCIES = [
  { name: "Bitcoin", symbol: "BTC" },
  { name: "XRP", symbol: "XRP" },
  { name: "Dogecoin", symbol: "DOGE" }
];

async function getDefaultData() {
  try {
    // For Vercel deployment
    if (process.env.VERCEL) {
      const filePath = path.join(process.cwd(), 'public', 'data', 'threads-posts.json');
      const fileContent = await fs.readFile(filePath, 'utf8');
      return JSON.parse(fileContent);
    }
    // For local development
    const filePath = path.join(process.cwd(), 'data', 'threads-posts.json');
    const fileContent = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading default data:', error);
    return null;
  }
}

async function checkApiLimit() {
  try {
    const response = await axios.get(`https://${RAPIDAPI_HOST}/api/search/recent`, {
      params: { query: 'test' },
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST
      },
      timeout: 5000
    });
    return { hasLimit: false };
  } catch (error) {
    console.error('API limit check error:', error.message);
    return { hasLimit: true, error: error.message };
  }
}

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

async function fetchThreadsPosts(query, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Fetching posts for query: ${query}, Attempt: ${attempt}`);
      
      if (!RAPIDAPI_KEY) {
        throw new Error('RapidAPI Key is not configured');
      }

      const response = await axios.get(`https://${RAPIDAPI_HOST}/api/search/recent`, {
        params: { query },
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': RAPIDAPI_HOST
        },
        timeout: 10000
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
      
      if (attempt === retries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

async function saveToJsonFile(data) {
  try {
    // Don't attempt to save in Vercel environment
    if (process.env.VERCEL) return null;

    const dataPath = path.join(process.cwd(), 'data', 'threads-posts.json');
    const dataDir = path.dirname(dataPath);
    
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }

    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
    console.log(`Saved results to ${dataPath}`);
    return dataPath;
  } catch (error) {
    console.error('Error saving to JSON file:', error);
    return null;
  }
}

export async function GET() {
  try {
    console.log('Starting fetch-threads-posts request...');

    const { hasLimit, error: limitError } = await checkApiLimit();
    
    if (hasLimit) {
      console.log('API limit reached or error, using default data');
      const defaultData = await getDefaultData();
      if (defaultData) {
        return Response.json({
          success: true,
          message: 'Posts retrieved from default data',
          data: defaultData,
          source: 'default',
          limitError: limitError || 'API limit reached'
        });
      }
      
      return Response.json({
        success: false,
        error: 'API limit reached and unable to read default data',
      }, { status: 500 });
    }

    const allPosts = [];
    let lastPagination = null;

    console.log(`Processing ${CURRENCIES.length} currencies...`);
    
    for (let i = 0; i < CURRENCIES.length; i += 2) {
      const currenciesToProcess = CURRENCIES.slice(i, i + 2);
      const currencyResults = await Promise.all(
        currenciesToProcess.map(async (currency) => {
          const nameResults = await fetchThreadsPosts(currency.name);
          const symbolResults = await fetchThreadsPosts(currency.symbol);

          const combinedPosts = [...nameResults.posts, ...symbolResults.posts];
          const uniquePosts = Array.from(new Map(
            combinedPosts.map(post => [post.id, post])
          ).values());

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

    // Only try to save if we're not in Vercel
    const savedFilePath = await saveToJsonFile({
      posts: allPosts,
      pagination: lastPagination,
      timestamp: new Date().toISOString()
    });

    return Response.json({
      success: true,
      message: 'Posts fetched successfully',
      postsCount: allPosts.reduce((acc, curr) => acc + curr.total_posts, 0),
      filePath: savedFilePath,
      data: allPosts,
      pagination: lastPagination,
      source: 'api'
    });

  } catch (error) {
    console.error('Error in fetch-threads-posts route:', error);
    
    try {
      const defaultData = await getDefaultData();
      if (defaultData) {
        return Response.json({
          success: true,
          message: 'Error occurred, using default data',
          data: defaultData,
          source: 'default',
          error: error.message || 'An unexpected error occurred'
        });
      }

      return Response.json({
        success: false,
        error: 'Unable to fetch data and read default data',
        details: error.message
      }, { status: 500 });

    } catch (fallbackError) {
      return Response.json({
        success: false,
        error: 'All data sources failed',
        details: {
          originalError: error.message,
          fallbackError: fallbackError.message
        }
      }, { status: 500 });
    }
  }
}