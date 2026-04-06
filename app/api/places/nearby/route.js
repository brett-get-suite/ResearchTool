import { NextResponse } from 'next/server';

// Convert miles to degrees (approximate)
const milesToDeg = (miles) => miles / 69;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat'));
  const lng = parseFloat(searchParams.get('lng'));
  const radius = parseFloat(searchParams.get('radius') || '30');

  if (isNaN(lat) || isNaN(lng)) return NextResponse.json([]);

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const radiusMeters = radius * 1609;

  if (apiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&type=locality&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK') {
        return NextResponse.json(
          data.results.slice(0, 8).map(p => ({
            label: p.name,
            lat: p.geometry.location.lat,
            lng: p.geometry.location.lng,
          }))
        );
      }
    } catch (e) {
      // fall through
    }
  }

  // Nominatim fallback: bounding box search for populated places
  try {
    const deg = milesToDeg(radius);
    const viewbox = `${lng - deg},${lat + deg},${lng + deg},${lat - deg}`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=8&featuretype=city&viewbox=${viewbox}&bounded=1&addressdetails=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'ppc-recon/1.0' } });
    const data = await res.json();
    return NextResponse.json(
      data.map(item => ({
        label: item.address?.city || item.address?.town || item.name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      })).filter(item => item.label)
    );
  } catch (e) {
    return NextResponse.json([]);
  }
}
