const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const googleBase = 'https://maps.googleapis.com/maps/api/place';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (req.method !== 'POST') throw httpError('Unsupported method.', 405);
    const body = await readJson(req);
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

  const params = new URLSearchParams({
    input,
    key: googleKey(),
    components: 'country:gb',
    types: 'address',
  });

  const data = await googleJson(`${googleBase}/autocomplete/json?${params.toString()}`);
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

  const params = new URLSearchParams({
    place_id: placeId,
    key: googleKey(),
    fields: 'formatted_address,name,address_component,geometry',
  });

  const data = await googleJson(`${googleBase}/details/json?${params.toString()}`);
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

async function googleJson(url: string) {
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
  if (/REQUEST_DENIED|API key|not authorized|referer|referrer/i.test(message)) {
    return 'Google Places is not configured correctly. Check the Supabase GOOGLE_MAPS_API_KEY secret and Google API restrictions.';
  }
  if (/OVER_QUERY_LIMIT|quota/i.test(message)) {
    return 'Google Places quota has been reached.';
  }
  return 'Google Places could not complete the address lookup.';
}

function googleKey() {
  const value = Deno.env.get('GOOGLE_MAPS_API_KEY') || Deno.env.get('WARMRIGHT_GOOGLE_MAPS_API_KEY');
  if (!value) throw httpError('Missing GOOGLE_MAPS_API_KEY secret.', 500);
  return value;
}

async function readJson(req: Request) {
  try { return await req.json(); } catch { return {}; }
}

function cleanText(value: unknown, max: number) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
}

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function httpError(message: string, status: number) {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}
