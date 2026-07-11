import {
  cleanText,
  createServiceClient,
  defaultCorsHeaders as corsHeaders,
  enforceRateLimit,
  httpError,
  json,
  readJson,
  requestIp,
} from '../_shared/security.ts';

const legacyGoogleBase = 'https://maps.googleapis.com/maps/api/place';
const googlePlacesBase = 'https://places.googleapis.com/v1';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (req.method !== 'POST') throw httpError('Unsupported method.', 405);
    const body = await readJson(req);
    const db = createServiceClient();
    await enforceRateLimit({
      db,
      scope: 'google_places_lookup',
      identifier: requestIp(req) || 'anonymous',
      limit: 40,
      windowSeconds: 300,
    });
    const action = cleanText(body.action, 40);

    if (action === 'autocomplete') {
      return json(await autocomplete(body));
    }
    if (action === 'details') {
      return json(await details(body));
    }

    throw httpError('Unsupported Google Places action.', 400);
  } catch (err) {
    console.error(err);
    return json({ error: err.message || 'Unexpected Google Places error.' }, err.status || 500);
  }
});

async function autocomplete(body: Record<string, unknown>) {
  const input = cleanText(body.input, 160);
  if (input.length < 3) return { predictions: [] };

  return await autocompleteNew(input);
}

async function autocompleteNew(input: string) {
  const data = await googleNewJson(`${googlePlacesBase}/places:autocomplete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': googleKey(),
      'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text',
    },
    body: JSON.stringify({
      input,
      includedRegionCodes: ['gb'],
      languageCode: 'en-GB',
      regionCode: 'gb',
    }),
  });

  const suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
  const predictions = suggestions
    .map((item: any) => item.placePrediction)
    .filter(Boolean)
    .slice(0, 6)
    .map((prediction: any) => {
      const description = cleanText(prediction.text?.text, 300);
      const [main, ...secondary] = description.split(',').map(part => part.trim()).filter(Boolean);
      return {
        place_id: cleanText(prediction.placeId, 140),
        description,
        main_text: cleanText(main || description, 180),
        secondary_text: cleanText(secondary.join(', '), 220),
      };
    })
    .filter((item: any) => item.place_id && item.description);

  return { predictions };
}

async function autocompleteLegacy(input: string) {
  const params = new URLSearchParams({
    input,
    key: googleKey(),
    components: 'country:gb',
    types: 'address',
  });

  const data = await googleLegacyJson(`${legacyGoogleBase}/autocomplete/json?${params.toString()}`);
  const predictions = Array.isArray(data.predictions) ? data.predictions : [];

  return {
    predictions: predictions.slice(0, 6).map((item: any) => ({
      place_id: cleanText(item.place_id, 140),
      description: cleanText(item.description, 300),
      main_text: cleanText(item.structured_formatting?.main_text, 180),
      secondary_text: cleanText(item.structured_formatting?.secondary_text, 220),
    })).filter((item: any) => item.place_id && item.description),
  };
}

async function details(body: Record<string, unknown>) {
  const placeId = cleanText(body.place_id, 160);
  if (!placeId) throw httpError('Place ID is required.', 400);

  return await detailsNew(placeId);
}

async function detailsNew(placeId: string) {
  const data = await googleNewJson(`${googlePlacesBase}/places/${encodeURIComponent(placeId)}?regionCode=gb&languageCode=en-GB`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': googleKey(),
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,addressComponents,location',
    },
  });

  return {
    place: {
      formatted_address: cleanText(data.formattedAddress || data.displayName?.text, 300),
      name: cleanText(data.displayName?.text, 180),
      lat: toNumber(data.location?.latitude),
      lng: toNumber(data.location?.longitude),
      address_components: Array.isArray(data.addressComponents) ? data.addressComponents.map((component: any) => ({
        long_name: cleanText(component.longText, 160),
        short_name: cleanText(component.shortText, 80),
        types: Array.isArray(component.types) ? component.types.map((type: unknown) => cleanText(type, 80)).filter(Boolean) : [],
      })) : [],
    },
  };
}

async function detailsLegacy(placeId: string) {
  const params = new URLSearchParams({
    place_id: placeId,
    key: googleKey(),
    fields: 'formatted_address,name,address_component,geometry',
  });

  const data = await googleLegacyJson(`${legacyGoogleBase}/details/json?${params.toString()}`);
  const result = data.result || {};
  const location = result.geometry?.location || {};

  return {
    place: {
      formatted_address: cleanText(result.formatted_address || result.name, 300),
      name: cleanText(result.name, 180),
      lat: toNumber(location.lat),
      lng: toNumber(location.lng),
      address_components: Array.isArray(result.address_components) ? result.address_components.map((component: any) => ({
        long_name: cleanText(component.long_name, 160),
        short_name: cleanText(component.short_name, 80),
        types: Array.isArray(component.types) ? component.types.map((type: unknown) => cleanText(type, 80)).filter(Boolean) : [],
      })) : [],
    },
  };
}

async function googleNewJson(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw httpError('Google Places returned an unreadable response.', 502);
  }

  if (!response.ok) {
    const detail = data.error?.message || data.message || text;
    throw httpError(userSafeGoogleMessage(data.error?.status || String(response.status), detail), response.status);
  }

  return data;
}

async function googleLegacyJson(url: string) {
  const response = await fetch(url);
  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw httpError('Google Places returned an unreadable response.', 502);
  }

  if (!response.ok || !['OK', 'ZERO_RESULTS'].includes(data.status)) {
    const message = userSafeGoogleMessage(data.status, data.error_message);
    throw httpError(message, response.ok ? 502 : response.status);
  }

  return data;
}

function userSafeGoogleMessage(status: string, detail: string) {
  const message = `${status || ''} ${detail || ''}`.trim();
  const suffix = message ? ` Google said: ${message.slice(0, 220)}` : '';
  if (/REQUEST_DENIED|API key|not authorized|referer|referrer/i.test(message)) {
    return `Google Places is not configured correctly. Check the Supabase GOOGLE_MAPS_API_KEY secret and Google API restrictions.${suffix}`;
  }
  if (/OVER_QUERY_LIMIT|quota/i.test(message)) {
    return `Google Places quota has been reached.${suffix}`;
  }
  return `Google Places could not complete the address lookup.${suffix}`;
}

function googleKey() {
  const value = Deno.env.get('GOOGLE_MAPS_API_KEY') || Deno.env.get('WARMRIGHT_GOOGLE_MAPS_API_KEY');
  if (!value) throw httpError('Missing GOOGLE_MAPS_API_KEY secret.', 500);
  return value;
}

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

