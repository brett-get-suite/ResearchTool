import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { keywordData, competitorData, lowHangingFruit, businessName } = await req.json();

    let csv = '';

    // Keywords sheet
    csv += 'KEYWORD RESEARCH REPORT\n';
    csv += `Client: ${businessName}\n`;
    csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;

    csv += 'Ad Group Theme,Keyword,Intent,Est. Monthly Searches,Est. CPC,Competition,Priority\n';

    if (keywordData?.keyword_groups) {
      for (const group of keywordData.keyword_groups) {
        for (const kw of group.keywords) {
          csv += `"${group.theme}","${kw.keyword}","${kw.intent}",${kw.estimated_monthly_searches},${kw.estimated_cpc},"${kw.competition}","${kw.priority}"\n`;
        }
      }
    }

    csv += '\n\nNEGATIVE KEYWORDS\n';
    csv += 'Keyword\n';
    if (keywordData?.negative_keywords) {
      for (const nk of keywordData.negative_keywords) {
        csv += `"${nk}"\n`;
      }
    }

    // Competitor section
    csv += '\n\nCOMPETITOR ANALYSIS\n';
    csv += 'Competitor,Est. Ad Spend,Threat Level,Services Advertised,Notes\n';
    if (competitorData?.competitors) {
      for (const comp of competitorData.competitors) {
        csv += `"${comp.name}","${comp.estimated_ad_spend}","${comp.threat_level}","${(comp.services_advertised || []).join('; ')}","${comp.notes || ''}"\n`;
      }
    }

    // Low hanging fruit section
    csv += '\n\nLOW HANGING FRUIT OPPORTUNITIES\n';
    csv += 'Keyword,Intent,Est. Monthly Searches,Est. CPC,Competition,Opportunity Score,Why\n';
    if (lowHangingFruit?.top_opportunities) {
      for (const opp of lowHangingFruit.top_opportunities) {
        csv += `"${opp.keyword}","${opp.intent}",${opp.estimated_monthly_searches},${opp.estimated_cpc},"${opp.competition}",${opp.opportunity_score},"${opp.why_its_gold}"\n`;
      }
    }

    // Quick win campaigns
    csv += '\n\nQUICK WIN CAMPAIGN RECOMMENDATIONS\n';
    csv += 'Campaign Name,Strategy,Keywords,Est. Daily Budget,Est. Daily Clicks\n';
    if (lowHangingFruit?.quick_win_campaigns) {
      for (const camp of lowHangingFruit.quick_win_campaigns) {
        csv += `"${camp.campaign_name}","${camp.strategy}","${(camp.keywords || []).join('; ')}",${camp.estimated_daily_budget},${camp.expected_daily_clicks}\n`;
      }
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${businessName || 'research'}-ppc-report.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export CSV' },
      { status: 500 }
    );
  }
}
