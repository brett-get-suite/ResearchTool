/**
 * Prompt templates for each phase of the research pipeline.
 * These are the core intelligence layer — tuned for HVAC/plumbing trade contractors.
 */

export function websiteAnalysisPrompt(websiteUrl, industry) {
  return `You are an expert Google Ads strategist specializing in ${industry} businesses.

Analyze this website: ${websiteUrl}

Extract the following and return ONLY valid JSON (no markdown, no explanation):
{
  "business_name": "string",
  "industry": "string", 
  "services": [
    {
      "name": "string (e.g., 'Water Heater Repair')",
      "category": "string (e.g., 'Plumbing', 'HVAC', 'Electrical')",
      "is_primary": boolean,
      "estimated_value": "low | medium | high (based on typical job value)"
    }
  ],
  "service_areas_detected": ["string (any cities, regions, or states mentioned)"],
  "unique_selling_points": ["string"],
  "brand_terms": ["string (brand name variations people might search)"],
  "website_quality": "basic | professional | premium",
  "has_online_scheduling": boolean,
  "has_reviews_displayed": boolean,
  "emergency_services": boolean
}

Focus on identifying EVERY distinct service they offer. For ${industry}, think about:
- Emergency vs. scheduled services
- Installation vs. repair vs. maintenance
- Specific equipment types (tankless water heaters, heat pumps, etc.)
- Specialty services (sewer camera inspection, duct cleaning, etc.)

Return ONLY the JSON object.`;
}

export function keywordResearchPrompt(services, serviceAreas, industry) {
  return `You are a senior PPC strategist with 15 years of experience managing Google Ads for ${industry} businesses.

SERVICES: ${JSON.stringify(services)}
SERVICE AREAS: ${JSON.stringify(serviceAreas)}
INDUSTRY: ${industry}

Generate a comprehensive keyword research report. For each service + location combination, generate keywords across these intent categories:

1. TRANSACTIONAL (highest value — someone ready to buy/book):
   - "[service] near me", "[service] [city]", "emergency [service]", "hire [service provider]"
   - "online [industry] estimate", "book [service] online", "same day [service]"

2. COMMERCIAL (comparing/evaluating — high value):
   - "best [service provider] [city]", "[service] cost", "[service] prices [city]"
   - "[service] reviews", "affordable [service]", "[service] quote"

3. INFORMATIONAL (research phase — lower value but volume):
   - "how much does [service] cost", "signs I need [service]", "[service] vs [alternative]"

Return ONLY valid JSON:
{
  "keyword_groups": [
    {
      "theme": "string (ad group theme name)",
      "service": "string",
      "keywords": [
        {
          "keyword": "string",
          "intent": "transactional | commercial | informational",
          "estimated_monthly_searches": number,
          "estimated_cpc": number,
          "competition": "low | medium | high",
          "priority": "high | medium | low",
          "rationale": "string (1 sentence why this keyword matters)"
        }
      ]
    }
  ],
  "negative_keywords": ["string (keywords to exclude — DIY, free, jobs, salary, etc.)"],
  "total_keywords": number,
  "estimated_monthly_budget_range": {
    "conservative": number,
    "balanced": number,
    "aggressive": number
  },
  "budget_assumptions": "string"
}

IMPORTANT GUIDELINES:
- Prioritize "online estimate" keywords — these are gold for ${industry}
- Include "[city]" and "near me" variants for each service area
- CPC estimates should reflect real ${industry} Google Ads costs (typically $15-$80 for emergency services, $5-$25 for general, $3-$12 for informational)
- Flag any keywords with unusually low competition as "low hanging fruit"
- Generate at least 50 keywords across all groups
- Group keywords into logical ad group themes (max 15-20 keywords per group)

Return ONLY the JSON object.`;
}

export function competitorAuditPrompt(businessName, services, serviceAreas, industry) {
  return `You are a competitive intelligence analyst specializing in Google Ads for ${industry} companies.

BUSINESS: ${businessName}
SERVICES: ${JSON.stringify(services)}
SERVICE AREAS: ${JSON.stringify(serviceAreas)}
INDUSTRY: ${industry}

Analyze the competitive landscape for this ${industry} business in their service areas.

Based on your knowledge of the ${industry} advertising landscape, identify likely competitors and analyze the competitive dynamics.

Return ONLY valid JSON:
{
  "competitors": [
    {
      "name": "string",
      "website": "string (if known)",
      "estimated_ad_spend": "low | medium | high | very_high",
      "services_advertised": ["string"],
      "ad_copy_themes": ["string (what angles they use in ads)"],
      "threat_level": "low | medium | high",
      "notes": "string"
    }
  ],
  "market_analysis": {
    "competition_level": "low | medium | high | very_high",
    "avg_cpc_range": { "low": number, "high": number },
    "peak_seasons": ["string (e.g., 'Summer for AC repair')"],
    "opportunity_gaps": ["string (services/keywords competitors are missing)"]
  },
  "competitor_keywords_to_negate": ["string (competitor brand terms to add as negatives)"],
  "recommended_differentiation": ["string (how to stand out in ads)"],
  "low_hanging_fruit": [
    {
      "keyword": "string",
      "why": "string (why this is an opportunity)",
      "estimated_cpc": number,
      "estimated_monthly_searches": number,
      "competition": "low | medium"
    }
  ]
}

IMPORTANT:
- For ${industry} in ${JSON.stringify(serviceAreas)}, think about local competitors (not national brands)
- "Online estimate" and "online quote" keywords are specifically called out as low-hanging fruit targets
- Consider seasonal patterns (AC in summer, heating in winter, plumbing year-round)
- Flag any keywords where competitors are NOT actively bidding as opportunities

Return ONLY the JSON object.`;
}

export function lowHangingFruitPrompt(keywordData, competitorData, industry, serviceAreas) {
  return `You are an elite PPC strategist known for finding high-ROI keyword opportunities that competitors miss.

INDUSTRY: ${industry}
SERVICE AREAS: ${JSON.stringify(serviceAreas)}
KEYWORD RESEARCH DATA: ${JSON.stringify(keywordData)}
COMPETITOR DATA: ${JSON.stringify(competitorData)}

Analyze all the data and identify the TOP low-hanging fruit opportunities. These are keywords that:
1. Have decent search volume but LOW competition/CPC
2. Show strong commercial or transactional intent
3. Competitors are NOT actively bidding on
4. Specifically: "online estimate" and "online quote" style keywords

Return ONLY valid JSON:
{
  "top_opportunities": [
    {
      "keyword": "string",
      "intent": "transactional | commercial",
      "estimated_monthly_searches": number,
      "estimated_cpc": number,
      "competition": "low | medium",
      "opportunity_score": number (1-100, higher = better opportunity),
      "why_its_gold": "string (compelling 1-2 sentence explanation)",
      "recommended_ad_group": "string",
      "recommended_match_type": "exact | phrase",
      "estimated_conversion_rate": "string (e.g., '3-5%')"
    }
  ],
  "quick_win_campaigns": [
    {
      "campaign_name": "string",
      "strategy": "string (1-2 sentences)",
      "keywords": ["string"],
      "estimated_daily_budget": number,
      "expected_daily_clicks": number,
      "expected_monthly_leads": "string (range)"
    }
  ],
  "executive_summary": "string (3-4 sentence summary for the boss — what's the biggest opportunity and why)"
}

Focus especially on:
- "online ${industry.toLowerCase()} estimate [city]" patterns
- "online ${industry.toLowerCase()} quote" patterns  
- Specific service + location combos with low CPC
- Emergency service keywords in off-peak seasons
- Long-tail keywords with clear buyer intent

Return ONLY the JSON object.`;
}
