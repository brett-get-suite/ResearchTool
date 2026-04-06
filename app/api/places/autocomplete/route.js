import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (apiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}&types=(cities)&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK') {
        return NextResponse.json(
          data.predictions.slice(0, 5).map(p => ({
            label: p.description,
            placeId: p.place_id,
            lat: null,
            lng: null,
          }))
        );
      }
    } catch (e) {
      // fall through to Nominatim
    }
  }

  // Nominatim fallback
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&featuretype=city&addressdetails=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'ppc-recon/1.0' } });
    const data = await res.json();
    return NextResponse.json(
      data.map(item => ({
        label: [item.address?.city || item.address?.town || item.name, item.address?.state].filter(Boolean).join(', '),
        placeId: item.place_id,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }))
    );
  } catch (e) {
    return NextResponse.json([]);
  }
}
