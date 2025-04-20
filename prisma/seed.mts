// prisma/seed.mts
import { PrismaClient } from '@prisma/client';
import axios, { AxiosError } from 'axios';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

// Interface for cleaner typing of API results
interface PlaceResult {
  place_id: string;
  name: string;
  vicinity?: string; // Address is often in 'vicinity' for nearby search
  formatted_address?: string; // Address might be here for text search
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  // Add other fields you might need, like rating, photos, etc.
}

// Interface for the NEW Places API response structure
interface NewPlace {
  id: string; // Corresponds to place_id in the old API
  formattedAddress: string; // Corresponds to formatted_address
  displayName?: { // Contains the name
    text: string;
    languageCode: string;
  };
  // Add other fields based on the field mask used
}

async function fetchBobaShops(apiKey: string, query: string, location?: string): Promise<PlaceResult[]> {
  // --- Use the NEW Places API endpoint --- 
  const baseUrl = 'https://places.googleapis.com/v1/places:searchText';
  
  // --- Construct the request body for the NEW API ---
  const requestBody: { textQuery: string; /* Add other params like locationBias if needed */ } = {
    textQuery: location ? `${query} in ${location}` : query,
    // Example: Add location bias if needed (requires coordinates)
    // locationBias: { circle: { center: { latitude: 37.8715, longitude: -122.2730 }, radius: 5000.0 } }
  };

  // --- Define required headers for the NEW API ---
  // Request specific fields to minimize cost and data transfer
  // Adjust fields based on what you need for the Shop model
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress' // Request place ID, name, address
  };

  console.log(`Querying NEW Google Places API with query: "${requestBody.textQuery}"`);

  try {
    // --- Use POST request for the NEW API ---
    const response = await axios.post<{ places?: NewPlace[] }>(baseUrl, requestBody, { headers });

    // --- Check response structure for the NEW API ---
    if (!response.data || !response.data.places || response.data.places.length === 0) {
        console.log('Google Places API (New) returned no results or unexpected format.');
        return [];
    }

    console.log(`Found ${response.data.places.length} potential results from NEW API.`);
    
    // --- Adapt the response to the old PlaceResult structure for compatibility downstream ---
    // (Or update the rest of the script to use NewPlace directly)
    const adaptedResults: PlaceResult[] = response.data.places.map(place => ({
        place_id: place.id,
        name: place.displayName?.text || 'Name not found',
        formatted_address: place.formattedAddress || 'Address not found',
        // Add other fields if requested in fieldMask and needed
    }));

    return adaptedResults;

  } catch (error) { 
    console.error('Error fetching data from Google Places API (New):');
    // Type guard for AxiosError
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError; // Cast after check
      if (axiosError.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Status:', axiosError.response.status);
        console.error('Data:', axiosError.response.data);
        console.error('Headers:', axiosError.response.headers);
      } else if (axiosError.request) {
        // The request was made but no response was received
        console.error('Request Error:', axiosError.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error Message:', axiosError.message);
      }
    } else {
      // Handle non-Axios errors
      console.error('Non-Axios Error:', error);
    }
    return [];
  }
}

function extractAddress(place: PlaceResult): string {
    // Use formatted_address if available, otherwise fallback to vicinity
    return place.formatted_address || place.vicinity || 'Address not found';
}

async function main() {
  console.log('Start seeding with Google Places data...');
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    console.error('Error: GOOGLE_PLACES_API_KEY is not set in .env.local');
    process.exit(1);
  }

  // 1. Fetch data from Google Places API FIRST
  console.log('Fetching boba shops from Google Places API...');
  const places = await fetchBobaShops(apiKey, 'boba tea', 'Berkeley, CA');

  if (places.length === 0) {
    console.log('No places found from Google API or API error occurred. Checking existing data before deleting...');
    // Decide if you want to proceed to delete even if fetch fails/returns zero
    // For safety, maybe only delete if fetch was successful? Let's proceed with delete for now.
  }

  // 2. Delete existing data (AFTER successful or ZERO_RESULTS fetch)
  console.log('Deleting existing shop and drink data...');
  try {
    // Delete ratings first if they depend on drinks/shops (adjust model name if needed)
    // await prisma.rating.deleteMany();
    await prisma.drink.deleteMany(); // Then drinks
    await prisma.shop.deleteMany(); // Then shops
    console.log('Deleted existing data.');
  } catch (deleteError) {
      console.error("Error deleting existing data:", deleteError);
      // Decide if you want to stop here if deletion fails
  }


  // 3. Create shops in the database (only if places were found)
  if (places.length > 0) {
    console.log(`Attempting to create ${places.length} shops in the database...`);
    let createdCount = 0;
    let skippedCount = 0;
    for (const place of places) {
      if (!place.name || !place.place_id) { // Ensure place_id exists too
          console.log(`-- Skipping place with missing name or place_id (ID: ${place.place_id || 'N/A'})`);
          skippedCount++;
          continue;
      }
      const address = extractAddress(place);
      try {
          const createdShop = await prisma.shop.create({
              data: {
                  googlePlaceId: place.place_id, // Store the UNIQUE Google Place ID
                  name: place.name,
                  address: address,
                  // Basic city/zip extraction (needs improvement)
                  // Note: The NEW API response (formattedAddress) might be easier to parse
                  city: address.includes('Berkeley') ? 'Berkeley' : 'Unknown', // Very basic check
                  zipCode: address.match(/\b\d{5}\b/)?.[0] || null, // Basic US zip code regex
              },
          });
          console.log(`-- Created shop: ${createdShop.name} (ID: ${createdShop.id}, Google Place ID: ${createdShop.googlePlaceId})`);
          createdCount++;

          // Optional: Add some default drinks for every shop created?

      } catch (error) {
           // Check if it's the unique constraint error specifically
          // Refined type check for PrismaClientKnownRequestError
          if (error instanceof Error && typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
              console.warn(`-- Skipping shop '${place.name}' due to duplicate googlePlaceId: ${place.place_id}`);
          } else {
              console.error(`!! Failed to create shop '${place.name}' (Place ID: ${place.place_id}):`, error);
          }
          skippedCount++;
      }
    }
    console.log(`Finished creating shops: ${createdCount} created, ${skippedCount} skipped.`);
  } else {
      console.log('No new shops to create from Google Places API.');
  }
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error('An error occurred during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
