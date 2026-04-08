'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAccount } from '@/lib/supabase';
import { buildGoogleAdsCsv } from '@/lib/export-google-ads-csv';
import GhostButton from '@/components/ui/GhostButton';
import Skeleton from '@/components/ui/Skeleton';
import IntentDonut from '@/components/keyword-engine/IntentDonut';
import KeywordMetrics from '@/components/keyword-engine/KeywordMetrics';
import PriorityMatrix from '@/components/keyword-engine/PriorityMatrix';
import AiInsights from '@/components/keyword-engine/AiInsights';

export default function KeywordEnginePage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.id;

  const [account, setAccount] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [weatherAlerts, setWeatherAlerts] = useState([]);
  const [sourcesAvailable, setSourcesAvailable] = useState({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const acct = await getAccount(accountId);
      setAccount(acct);

      // Collect keywords from all available sources on the account
      // Priority: audit keywords > brand profile keywords > empty
      const auditKws = acct?.audit_data?.keywords || [];
      const brandKws = acct?.brand_profile?.keywords || [];
      // Flatten keyword_groups if present (from Gemini research format)
      const groupKws = (acct?.brand_profile?.keyword_groups || []).flatMap(g =>
        (g.keywords || []).map(k => ({
          keyword: k.keyword || k,
          intent: g.intent || k.intent || 'informational',
          avg_cpc: k.estimated_cpc || k.avg_cpc || 0,
          monthly_searches: k.estimated_monthly_searches || k.monthly_searches || 0,
          volume: k.estimated_monthly_searches || k.volume || 0,
          competition: k.competition || 'medium',
          data_source: k.data_source || 'estimated',
          google_data: k.data_source === 'google',
        }))
      );

      const rawKws = groupKws.length > 0 ? groupKws : (auditKws.length > 0 ? auditKws : brandKws);

      if (rawKws.length > 0) {
        // Enrich with intelligence layer (trends + weather)
        try {
          const res = await fetch('/api/keywords/intelligence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              keywords: rawKws,
              geo: acct?.settings?.geo || 'US',
              lat: acct?.settings?.lat,
              lon: acct?.settings?.lon,
              vertical: acct?.settings?.vertical || acct?.brand_profile?.industry,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            setKeywords(data.keywords || rawKws);
            setWeatherAlerts(data.weather_alerts || []);
            setSourcesAvailable(data.sources_available || {});
          } else {
            setKeywords(rawKws);
          }
        } catch (_) {
          setKeywords(rawKws);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => { loadData(); }, [loadData]);

  function handleExportCsv() {
    if (keywords.length === 0) return;
    const campaignName = account?.name || 'Campaign';
    const csv = buildGoogleAdsCsv(keywords, campaignName);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${campaignName.replace(/\s+/g, '_')}_keywords.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleKeywordAction(action, kw) {
    // Action stubs — wired to real functionality in Phase 6 (campaign creation)
    if (action === 'view_trend') {
      console.log('View trend for:', kw.keyword);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 fade-up">
        <Skeleton variant="text" className="h-8 w-64" />
        <div className="grid grid-cols-12 gap-6">
          <Skeleton variant="card" className="col-span-4 h-48" />
          <Skeleton variant="card" className="col-span-8 h-48" />
        </div>
        <Skeleton variant="card" className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-label-sm text-on-surface-variant flex items-center gap-1 mb-1">
            <span className="material-symbols-outlined text-xs">settings</span>
            Strategy Module
          </div>
          <h1 className="text-2xl font-bold text-on-surface">Keyword Intelligence Engine</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Surface high-intent opportunities with real-time data integration
          </p>
        </div>
        <GhostButton onClick={handleExportCsv} disabled={keywords.length === 0}>
          <span className="material-symbols-outlined text-lg">download</span>
          Export to Google Ads CSV
        </GhostButton>
      </div>

      {/* Empty state */}
      {keywords.length === 0 && (
        <div className="bg-surface-container rounded-xl p-12 text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-5xl mb-4">search</span>
          <h2 className="text-lg font-semibold text-on-surface mb-2">No Keywords Yet</h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-md mx-auto">
            Run keyword research from the Analysis Hub or upload a CSV keyword report to populate the Keyword Engine.
          </p>
          <button
            onClick={() => router.push(`/accounts/${accountId}`)}
            className="px-4 py-2 rounded-xl bg-primary/15 text-primary text-sm font-medium hover:bg-primary/25 transition-colors"
          >
            Go to Analysis Hub
          </button>
        </div>
      )}

      {/* Top row: Donut + Metrics */}
      {keywords.length > 0 && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-4">
              <IntentDonut keywords={keywords} />
            </div>
            <div className="xl:col-span-8">
              <KeywordMetrics keywords={keywords} weatherAlerts={weatherAlerts} />
            </div>
          </div>

          {/* Main content: Priority Matrix + Insights */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8">
              <PriorityMatrix keywords={keywords} onAction={handleKeywordAction} />
            </div>
            <div className="xl:col-span-4">
              <AiInsights
                weatherAlerts={weatherAlerts}
                sourcesAvailable={sourcesAvailable}
                keywords={keywords}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
