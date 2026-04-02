import { isGoogleAdsConfigured } from '@/lib/google-ads';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasApiKey: !!process.env.GEMINI_API_KEY,
    hasGoogleAds: isGoogleAdsConfigured(),
  });
}
