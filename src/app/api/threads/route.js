import axios from 'axios';

const RAPIDAPI_KEY = '57d6a1b1d7msh3605f3ff116f195p1a53fcjsn7235d101ef04';
const RAPIDAPI_HOST = 'threads-api4.p.rapidapi.com';

const CURRENCIES = [
  { name: "Bitcoin", symbol: "BTC" },
  { name: "XRP", symbol: "XRP" },
  { name: "Dogecoin", symbol: "DOGE" }
];

async function fetchThreadsPosts(query) {
  try {
    if (!RAPIDAPI_KEY) {
      throw new Error('RapidAPI Key is not configured');
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
  } catch (error) {
    console.error(`Error fetching posts for ${query}:`, error.message);
    throw error;
  }
}

export async function GET() {
  try {
    // Only fetch one currency at a time to reduce timeout risk
    const currency = CURRENCIES[0];
    
    const [nameResults, symbolResults] = await Promise.all([
      fetchThreadsPosts(currency.name),
      fetchThreadsPosts(currency.symbol)
    ]);

    const data = {
      results: [{
        currency: currency.name,
        symbol: currency.symbol,
        nameResults: nameResults.data,
        symbolResults: symbolResults.data,
        pagination: {
          name: nameResults.pagination,
          symbol: symbolResults.pagination
        }
      }],
      timestamp: new Date().toISOString()
    };

    return Response.json({
      success: true,
      message: 'Data fetched successfully',
      data,
      source: 'api'
    });

  } catch (error) {
    console.error('Error in fetch-threads-posts route:', error);
    return Response.json({
      success: false,
      error: 'Failed to fetch data',
      details: error.message
    }, { status: error.response?.status || 500 });
  }
}