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
      const response = await axios.get(`https://${RAPIDAPI_HOST}/api/search/recent`, {
        params: { query },
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': RAPIDAPI_HOST
        },
        timeout: 30000 // Increased timeout to 30 seconds
      });

      return {
        data: response.data,
        pagination: response.data?.data?.searchResults?.page_info || {}
      };
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        console.error('Request timeout for query:', query);
      }
      if (attempt === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
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
      // If API limit not reached, fetch new data and save it
      console.log('Fetching fresh data from API...');
      try {
        const freshData = await fetchAndSaveData();
        // Read the saved data back from file to ensure consistency
        const savedData = await getLatestSavedData();
        
        if (savedData) {
          return Response.json({
            success: true,
            message: 'Fresh data fetched, saved, and retrieved successfully',
            data: savedData,
            source: 'api_saved'
          });
        }
      } catch (fetchError) {
        console.error('Error fetching/saving fresh data:', fetchError);
        // Continue to fallback options
      }
    }

    // Try to get previously saved data
    console.log('Attempting to read latest saved data...');
    const savedData = await getLatestSavedData();
    if (savedData) {
      return Response.json({
        success: true,
        message: 'Retrieved from saved data',
        data: savedData,
        source: 'saved',
        limitError: hasLimit ? limitError : null
      });
    }

    // If no saved data, try sample data
    console.log('Attempting to read sample data...');
    const sampleData = await getSampleData();
    if (sampleData) {
      return Response.json({
        success: true,
        message: 'Retrieved from sample data',
        data: sampleData,
        source: 'sample',
        limitError: hasLimit ? limitError : null
      });
    }

    // If all attempts fail
    return Response.json({
      success: false,
      error: 'No data available from any source',
      details: {
        apiLimit: hasLimit,
        limitError: limitError
      }
    }, { status: 500 });

  } catch (error) {
    console.error('Error in fetch-threads-posts route:', error);
    return Response.json({
      success: false,
      error: 'Unexpected error occurred',
      details: error.message
    }, { status: 500 });
  }
}