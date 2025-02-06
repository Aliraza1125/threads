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

      return {
        data: response.data,
        pagination: {
          has_next_page: response.data?.data?.searchResults?.page_info?.has_next_page || false,
          end_cursor: response.data?.data?.searchResults?.page_info?.end_cursor || null
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

async function fetchAndSaveData() {
  const allResults = [];

  for (let i = 0; i < CURRENCIES.length; i += 2) {
    const currenciesToProcess = CURRENCIES.slice(i, i + 2);
    const currencyResults = await Promise.all(
      currenciesToProcess.map(async (currency) => {
        const nameResults = await fetchThreadsPosts(currency.name);
        const symbolResults = await fetchThreadsPosts(currency.symbol);

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

    allResults.push(...currencyResults);
  }

  const dataToSave = {
    results: allResults,
    timestamp: new Date().toISOString()
  };

  await saveToJsonFile(dataToSave);
  return dataToSave;
}

export async function GET() {
  try {
    console.log('Starting fetch-threads-posts request...');
    
    const { hasLimit, error: limitError } = await checkApiLimit();
    
    if (!hasLimit) {
      console.log('Fetching fresh data from API...');
      try {
        const freshData = await fetchAndSaveData();
        return Response.json({
          success: true,
          message: 'Fresh data fetched successfully',
          data: freshData,
          source: 'api'
        });
      } catch (fetchError) {
        console.error('Error fetching fresh data:', fetchError);
      }
    }

    // Try to get data from API directly as fallback
    try {
      const data = await fetchAndSaveData();
      return Response.json({
        success: true,
        message: 'Data fetched from API',
        data: data,
        source: 'api_fallback'
      });
    } catch (error) {
      return Response.json({
        success: false,
        error: 'Failed to fetch data',
        details: error.message
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in fetch-threads-posts route:', error);
    return Response.json({
      success: false,
      error: 'Unexpected error occurred',
      details: error.message
    }, { status: 500 });
  }
}