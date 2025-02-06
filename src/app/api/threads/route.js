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

async function getSampleData() {
  try {
    const filePath = process.env.VERCEL
      ? path.join(process.cwd(), 'public', 'data', 'sample-threads-posts.json')
      : path.join(process.cwd(), 'data', 'sample-threads-posts.json');
    
    const fileContent = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading sample data:', error);
    return null;
  }
}
async function getLatestSavedData() {
  if (process.env.VERCEL) {
    // On Vercel, try to fetch from API directly
    return fetchAndSaveData();
  }

  try {
    const filePath = path.join(process.cwd(), 'data', 'latest-threads-posts.json');
    const fileContent = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading latest saved data:', error);
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

async function fetchThreadsPosts(query) {
  if (!RAPIDAPI_KEY) {
    throw new Error('RapidAPI Key not configured');
  }

  const response = await axios.get(`https://${RAPIDAPI_HOST}/api/search/recent`, {
    params: { query },
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': RAPIDAPI_HOST
    },
    timeout: 5000 // Reduced timeout
  });

  return {
    data: response.data,
    pagination: {
      has_next_page: response.data?.data?.searchResults?.page_info?.has_next_page || false,
      end_cursor: response.data?.data?.searchResults?.page_info?.end_cursor || null
    }
  };
}

async function saveToJsonFile(data) {
  try {
    if (process.env.VERCEL) return null;

    const dataPath = path.join(process.cwd(), 'data', 'latest-threads-posts.json');
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

// Optimize fetchAndSaveData function
async function fetchAndSaveData() {
  try {
    // Fetch only one result per currency to reduce load
    const results = await Promise.all(
      CURRENCIES.map(async (currency) => {
        try {
          const symbolResults = await fetchThreadsPosts(currency.symbol);
          return {
            currency: currency.name,
            symbol: currency.symbol,
            symbolResults: symbolResults.data,
            pagination: {
              symbol: symbolResults.pagination
            }
          };
        } catch (error) {
          console.error(`Error fetching ${currency.symbol}:`, error);
          return null;
        }
      })
    );

    const validResults = results.filter(Boolean);
    
    return {
      results: validResults,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Data fetch failed: ${error.message}`);
  }
}


export async function GET() {
  try {
    const data = await fetchAndSaveData();
    return Response.json({
      success: true,
      data: data
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}