import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';

const RAPIDAPI_KEY = '57d6a1b1d7msh3605f3ff116f195p1a53fcjsn7235d101ef04';
const RAPIDAPI_HOST = 'threads-api4.p.rapidapi.com';

const CURRENCIES = [
  { name: "Bitcoin", symbol: "BTC" },
  { name: "XRP", symbol: "XRP" },
  { name: "Dogecoin", symbol: "DOGE" }
];

// Cache for API responses
let responseCache = {
  data: null,
  timestamp: null
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getLatestSavedData() {
  try {
    const filePath = process.env.VERCEL
      ? path.join(process.cwd(), 'public', 'data', 'latest-threads-posts.json')
      : path.join(process.cwd(), 'data', 'latest-threads-posts.json');
    
    const fileContent = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading latest saved data:', error);
    return null;
  }
}

async function fetchThreadsPosts(query) {
  try {
    const response = await axios.get(`https://${RAPIDAPI_HOST}/api/search/recent`, {
      params: { query },
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST
      },
      timeout: 10000 // Reduced timeout to 10 seconds
    });

    return {
      data: response.data,
      pagination: response.data?.data?.searchResults?.page_info || {}
    };
  } catch (error) {
    console.error(`Error fetching data for ${query}:`, error.message);
    return { data: null, pagination: {} };
  }
}

async function fetchAndSaveData() {
  // Process currencies in parallel with Promise.all
  const allResults = await Promise.all(
    CURRENCIES.map(async (currency) => {
      const [nameResults, symbolResults] = await Promise.all([
        fetchThreadsPosts(currency.name),
        fetchThreadsPosts(currency.symbol)
      ]);

      return {
        currency: currency.name,
        symbol: currency.symbol,
        nameResults: nameResults.data,
        symbolResults: symbolResults.data,
        pagination: {
          name: nameResults.pagination,
          symbol: symbolResults.pagination
        }
      };
    })
  );

  const dataToSave = {
    results: allResults,
    timestamp: new Date().toISOString()
  };

  // Only save to file if not on Vercel
  if (!process.env.VERCEL) {
    try {
      const dataPath = path.join(process.cwd(), 'data', 'latest-threads-posts.json');
      await fs.mkdir(path.dirname(dataPath), { recursive: true });
      await fs.writeFile(dataPath, JSON.stringify(dataToSave, null, 2));
    } catch (error) {
      console.error('Error saving to file:', error);
    }
  }

  return dataToSave;
}

export async function GET() {
  try {
    console.log('Starting threads-posts request...');

    // Check cache first
    if (responseCache.data && responseCache.timestamp) {
      const cacheAge = Date.now() - responseCache.timestamp;
      if (cacheAge < CACHE_DURATION) {
        console.log('Returning cached data');
        return Response.json({
          success: true,
          message: 'Retrieved from cache',
          data: responseCache.data,
          source: 'cache'
        });
      }
    }

    // Try to fetch new data
    console.log('Fetching fresh data...');
    const freshData = await fetchAndSaveData();
    
    // Update cache
    responseCache = {
      data: freshData,
      timestamp: Date.now()
    };

    return Response.json({
      success: true,
      message: 'Fresh data fetched successfully',
      data: freshData,
      source: 'api'
    });

  } catch (error) {
    console.error('Error in threads-posts route:', error);
    
    // Try to get saved data as fallback
    const savedData = await getLatestSavedData();
    if (savedData) {
      return Response.json({
        success: true,
        message: 'Retrieved from saved data (fallback)',
        data: savedData,
        source: 'saved'
      });
    }

    return Response.json({
      success: false,
      error: 'Unable to fetch data from any source',
      details: error.message
    }, { status: 500 });
  }
}