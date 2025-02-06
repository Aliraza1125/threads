import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';

const RAPIDAPI_KEY = '57d6a1b1d7msh3605f3ff116f195p1a53fcjsn7235d101ef04';
const RAPIDAPI_HOST = 'threads-api4.p.rapidapi.com';

const CURRENCIES = [
  { name: "Bitcoin" },
  { name: "XRP" },
  { name: "Dogecoin" }
];

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

async function fetchAndSaveData() {
  const allResults = [];

  for (const currency of CURRENCIES) {
    try {
      const nameResults = await fetchThreadsPosts(currency.name);
      allResults.push({
        currency: currency.name,
        nameResults: nameResults.data,
        pagination: nameResults.pagination
      });
    } catch (error) {
      console.error(`Failed to fetch data for ${currency.name}:`, error);
    }
  }

  return {
    results: allResults,
    timestamp: new Date().toISOString()
  };
}

export async function GET() {
  try {
    console.log('Starting fetch-threads-posts request...');
    const freshData = await fetchAndSaveData();
    return Response.json({
      success: true,
      message: 'Fresh data fetched successfully',
      data: freshData,
      source: 'api'
    });
  } catch (error) {
    console.error('Error in fetch-threads-posts route:', error);
    return Response.json({
      success: false,
      error: 'Unexpected error occurred',
      details: error.message
    }, { status: 500 });
  }
}
