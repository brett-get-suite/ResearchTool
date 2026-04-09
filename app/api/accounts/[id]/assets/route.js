import { NextResponse } from 'next/server';
import { getAccountClient } from '@/lib/google-ads-auth';
import { fetchAssetPerformance } from '@/lib/google-ads-query';

// In-memory cache with size cap (best-effort on serverless — won't survive cold starts)
const cache = new Map();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
const MAX_CACHE_SIZE = 50;

export async function GET(request, { params }) {
  try {
    const accountId = params.id;

    // Check cache
    const cached = cache.get(accountId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    const client = await getAccountClient(accountId);
    const assets = await fetchAssetPerformance(client);

    // Deduplicate by asset ID + field type (same asset can appear in multiple ad groups)
    const seen = new Map();
    for (const asset of assets) {
      const key = `${asset.id}-${asset.fieldType}`;
      const existing = seen.get(key);
      // Keep the one with the better performance label
      if (!existing || labelRank(asset.performanceLabel) > labelRank(existing.performanceLabel)) {
        seen.set(key, asset);
      }
    }

    const deduped = Array.from(seen.values());

    // Cache the result (evict oldest if at capacity)
    if (cache.size >= MAX_CACHE_SIZE) {
      const oldest = cache.keys().next().value;
      cache.delete(oldest);
    }
    cache.set(accountId, { data: deduped, timestamp: Date.now() });

    return NextResponse.json(deduped);
  } catch (err) {
    console.error('Assets GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
  }
}

function labelRank(label) {
  switch (label) {
    case 'BEST': return 6;
    case 'GOOD': return 5;
    case 'LOW': return 4;
    case 'LEARNING': return 3;
    case 'PENDING': return 2;
    case 'NOT_APPLICABLE': return 1;
    default: return 0;
  }
}
