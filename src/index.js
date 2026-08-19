/**
 * AEM Edge Function Entry Point
 */
import { SecretStoreManager } from "./lib/config";

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event));
});

async function handleRequest(event) {
  const request = event.request;
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    const url = new URL(request.url);
    const location = url.searchParams.get('location') || 'Chennai,IN';

    const placeholderKey = 'YOUR_OPENWEATHERMAP_APPID_HERE';
    let apiKey = placeholderKey;
    try {
      apiKey = await SecretStoreManager.getSecret('WEATHER_API_KEY');
    } catch (e) {
      // Fallback to placeholder so the response clearly indicates missing secret config.
      console.warn('WEATHER_API_KEY not found in secret store');
    }

    if (!apiKey || apiKey === placeholderKey) {
      return new Response(
        JSON.stringify({ cod: 500, message: 'Missing WEATHER_API_KEY secret. Configure it in EdgeFunctions secrets and Cloud Manager.' }),
        { status: 500, headers }
      );
    }

    // Call OpenWeatherMap API with metric units (°C)
    const targetUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&units=metric&appid=${apiKey}`;
    
    const apiResponse = await fetch(targetUrl, {
      backend: 'openweathermap'
    });

    const data = await apiResponse.json();

    return new Response(JSON.stringify(data), {
      status: apiResponse.status || 200,
      headers,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        cod: 500, 
        message: `Edge Function Error: ${error.message}` 
      }),
      { status: 500, headers }
    );
  }
}