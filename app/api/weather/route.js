import { NextResponse } from 'next/server';
import { getWeatherForecast, getDemandSurgeAlerts } from '@/lib/data-sources/weather';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const vertical = searchParams.get('vertical');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon parameters required' }, { status: 400 });
  }

  try {
    if (vertical) {
      const alerts = await getDemandSurgeAlerts(parseFloat(lat), parseFloat(lon), vertical);
      return NextResponse.json({ alerts });
    }

    const forecast = await getWeatherForecast(parseFloat(lat), parseFloat(lon));
    return NextResponse.json({ forecast });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
