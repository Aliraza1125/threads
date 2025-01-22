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

// Function to get the data file path
function getDataPath() {
  return process.env.VERCEL ? '/tmp/threads-posts.json' : path.join(process.cwd(), 'data', 'threads-posts.json');
}

// Function to read existing data from JSON file
async function readExistingData() {
  try {
    const dataPath = getDataPath();
    const fileData = await fs.readFile(dataPath, 'utf8');
    return JSON.parse(fileData);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { posts: [], timestamp: null };
    }
    console.error('Error reading existing data:', error);
    throw error;
  }
}

// Function to merge new posts with existing posts
function mergePosts(existingPosts, newPosts) {
  const mergedMap = new Map();
  
  // Add existing posts to map
  existingPosts.forEach(currency => {
    if (!mergedMap.has(currency.currency)) {
      mergedMap.set(currency.currency, {
        currency: currency.currency,
        symbol: currency.symbol,
        posts: new Map(currency.posts.map(post => [post.id, post]))
      });
    }
  });

  // Merge new posts
  newPosts.forEach(currency => {
    if (!mergedMap.has(currency.currency)) {
      mergedMap.set(currency.currency, {
        currency: currency.currency,
        symbol: currency.symbol,
        posts: new Map(currency.posts.map(post => [post.id, post]))
      });
    } else {
      const existing = mergedMap.get(currency.currency);
      currency.posts.forEach(post => {
        existing.posts.set(post.id, post);
      });
    }
  });

  // Convert back to array format
  return Array.from(mergedMap.values()).map(currency => ({
    currency: currency.currency,
    symbol: currency.symbol,
    posts: Array.from(currency.posts.values()),
    total_posts: currency.posts.size
  }));
}

// Modified fetchThreadsPosts function with rate limit handling
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
      // Check specifically for rate limit error
      if (error.response?.status === 429) {
        console.log('Rate limit reached, using cached data');
        throw { code: 'RATE_LIMIT_EXCEEDED' };
      }

      console.error(`Error fetching posts for ${query} (Attempt ${attempt}):`, 
        error.response?.data || error.message);
      
      if (attempt === retries) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

// Modified saveToJsonFile function
async function saveToJsonFile(data) {
  try {
    const dataPath = getDataPath();
    const dataDir = path.dirname(dataPath);
    
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }

    await fs.writeFile(
      dataPath,
      JSON.stringify({
        ...data,
        timestamp: new Date().toISOString()
      }, null, 2)
    );
    console.log(`Saved results to ${dataPath}`);
    return dataPath;
  } catch (error) {
    console.error('Error saving to JSON file:', error);
    throw error;
  }
}

// Modified main GET function
export async function GET() {
  try {
    console.log('Starting fetch-threads-posts request...');

    // Read existing data
    const existingData = await readExistingData();
    let allPosts = [];
    let usedCachedData = false;

    try {
      console.log(`Processing ${CURRENCIES.length} currencies...`);
      
      for (let i = 0; i < CURRENCIES.length; i += 2) {
        const currenciesToProcess = CURRENCIES.slice(i, i + 2);
        const currencyResults = await Promise.all(
          currenciesToProcess.map(async (currency) => {
            try {
              const nameResults = await fetchThreadsPosts(currency.name);
              const symbolResults = await fetchThreadsPosts(currency.symbol);

              const combinedPosts = [...nameResults.posts, ...symbolResults.posts];
              const uniquePosts = Array.from(new Map(combinedPosts.map(post => [post.id, post])).values());

              return {
                currency: currency.name,
                symbol: currency.symbol,
                posts: uniquePosts,
                total_posts: uniquePosts.length
              };
            } catch (error) {
              if (error.code === 'RATE_LIMIT_EXCEEDED') {
                usedCachedData = true;
                // Return existing data for this currency if available
                const existingCurrencyData = existingData.posts.find(p => p.currency === currency.name);
                return existingCurrencyData || {
                  currency: currency.name,
                  symbol: currency.symbol,
                  posts: [],
                  total_posts: 0
                };
              }
              throw error;
            }
          })
        );

        allPosts.push(...currencyResults.filter(result => result.total_posts > 0));
      }

      // Merge with existing data if we got new data
      if (!usedCachedData) {
        allPosts = mergePosts(existingData.posts, allPosts);
      }

    } catch (error) {
      console.error('Error fetching new data:', error);
      // If any error occurs, use existing data
      allPosts = existingData.posts;
      usedCachedData = true;
    }

    // Save the merged data
    const savedFilePath = await saveToJsonFile({
      posts: allPosts,
      timestamp: new Date().toISOString()
    });

    return Response.json({
      success: true,
      message: usedCachedData ? 'Using cached data due to API limits or errors' : 'Fresh data fetched and merged with existing data',
      postsCount: allPosts.reduce((acc, curr) => acc + curr.total_posts, 0),
      filePath: savedFilePath,
      data: allPosts,
      usingCache: usedCachedData
    });

  } catch (error) {
    console.error('Error in fetch-threads-posts route:', error);
    
    return Response.json({
      success: false,
      error: error.message || 'An unexpected error occurred',
      details: error.response?.data || null
    }, { status: 500 });
  }
}