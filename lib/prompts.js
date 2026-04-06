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

export function budgetProjectionPrompt(businessName, industry, serviceAreas, keywordData, competitorData) {
  return `You are a senior Google Ads strategist preparing a budget analysis for a ${industry} business called "${businessName}" serving ${JSON.stringify(serviceAreas)}.

KEYWORD RESEARCH DATA:
${JSON.stringify(keywordData)}

COMPETITOR DATA:
${JSON.stringify(competitorData)}

Based on this data, generate a comprehensive budget projection report. Be specific with numbers — use the actual keyword CPCs, search volumes, and competitor context provided above.

Return ONLY valid JSON:
{
  "budget_tiers": [
    {
      "level": "conservative",
      "monthly_budget": number,
      "rationale": "string (why this level — what risk/opportunity it reflects)",
      "expected_monthly_clicks": number,
      "expected_monthly_leads": number,
      "expected_cost_per_lead": number,
      "campaigns_funded": ["string (campaign/ad group names that run at this level)"],
      "what_you_get": "string (2-3 sentence client-facing summary of what this budget achieves)"
    },
    { "level": "balanced", ... },
    { "level": "aggressive", ... },
    { "level": "stretch", ... }
  ],
  "lead_scenarios": [
    {
      "leads_per_month": 10,
      "required_budget": number,
      "cost_per_lead": number,
      "feasibility": "achievable | challenging | aspirational",
      "notes": "string (1 sentence context)"
    },
    { "leads_per_month": 20, ... },
    { "leads_per_month": 30, ... },
    { "leads_per_month": 50, ... }
  ],
  "recommended_allocation": [
    {
      "campaign_name": "string",
      "monthly_budget": number,
      "priority": "must_have | should_have | nice_to_have",
      "expected_leads": number,
      "reason": "string (1 sentence why this campaign earns this allocation)"
    }
  ],
  "minimum_viable_budget": number,
  "sweet_spot_budget": number,
  "market_context": "string (1-2 sentences about competitive context that directly affects budget needs)",
  "key_insights": ["string (3-5 specific, actionable insights derived from the data)"],
  "executive_pitch": "string (3-4 sentences written FOR the client — not about them. Explain the opportunity and what the investment will return. Use specific numbers.)"
}

IMPORTANT GUIDELINES:
- Base all numbers on the actual CPC data provided — do not invent generic numbers
- For ${industry}, typical lead conversion rates from clicks: transactional keywords 4-7%, commercial 1-3%
- Factor in the competition level from the competitor data when setting expectations
- "Stretch" tier should show the aggressive growth scenario with highest lead volume
- Lead scenarios at 10/20/30/50 should be grounded in the actual keyword pool size and CPCs
- minimum_viable_budget is the floor below which Google Ads is unlikely to generate meaningful results
- sweet_spot_budget is the inflection point where ROI is maximized before diminishing returns
- executive_pitch should be compelling enough to use in a client presentation verbatim

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

export function adCopyPrompt(keywordGroups, websiteData, industry, serviceAreas) {
  const usps = websiteData?.unique_selling_points || [];
  const brandTerms = websiteData?.brand_terms || [];
  const services = websiteData?.services || [];

  return `You are an elite Google Ads copywriter specializing in ${industry} businesses. You write high-CTR Responsive Search Ads (RSAs) that convert clicks into leads.

KEYWORD AD GROUPS:
${JSON.stringify(keywordGroups)}

BUSINESS INFO:
- Industry: ${industry}
- Service Areas: ${JSON.stringify(serviceAreas)}
- USPs: ${JSON.stringify(usps)}
- Brand Terms: ${JSON.stringify(brandTerms)}
- Services: ${JSON.stringify(services.map(s => s.name || s))}

For EACH keyword ad group, generate Google Ads RSA copy. Follow Google Ads character limits STRICTLY:
- Headlines: exactly 30 characters max (this is a HARD limit — count every character)
- Descriptions: exactly 90 characters max (HARD limit)

Return ONLY valid JSON:
{
  "ad_groups": [
    {
      "ad_group_name": "string (matches keyword group theme)",
      "service": "string",
      "headlines": [
        {
          "text": "string (MAX 30 chars — count carefully!)",
          "pin": "H1 | H2 | H3 | null",
          "type": "service | location | cta | usp | offer | trust"
        }
      ],
      "descriptions": [
        {
          "text": "string (MAX 90 chars)",
          "pin": "D1 | D2 | null"
        }
      ],
      "sitelinks": [
        {
          "text": "string (max 25 chars)",
          "description": "string (sitelink description)"
        }
      ]
    }
  ],
  "total_ad_groups": number,
  "export_notes": "string (1-2 sentences about the copy strategy)"
}

REQUIREMENTS PER AD GROUP:
- 10–15 headlines (30 char max EACH — double-check every one!)
- 4 descriptions (90 char max EACH)
- 2–4 sitelinks
- Pin suggestions: H1 = service/keyword, H2 = location or USP, H3 = CTA
- D1 = main value prop, D2 = supporting detail

COPY GUIDELINES:
- Headline 1 candidates: include the core service keyword (e.g., "24/7 Emergency Plumber")
- Headline 2 candidates: include location ("Denver CO") or USP ("Licensed & Insured")
- Headline 3 candidates: strong CTA ("Call Now for Fast Service", "Free Estimates")
- Use the business USPs: ${usps.slice(0, 3).join(', ') || 'quality service, licensed, trusted'}
- Include "near me" and location-specific variants
- Mix emotional triggers (urgency, trust, savings) with practical info
- Descriptions should sell the click — mention guarantees, response time, online scheduling if available
- Every headline and description should be UNIQUE — no duplicates across the ad group

CHARACTER COUNT IS CRITICAL:
- Count EVERY character including spaces and punctuation
- "24/7 Emergency Plumber" = 22 chars OK
- "Licensed & Insured Since 2005" = 29 chars OK
- "Professional Plumbing Services in Denver CO" = 44 chars TOO LONG

Return ONLY the JSON object.`;
}

export function landingPageAuditPrompt(websiteUrl, services, industry) {
  return `You are a conversion rate optimization (CRO) expert who audits landing pages for ${industry} businesses running Google Ads.

WEBSITE: ${websiteUrl}
INDUSTRY: ${industry}
SERVICES: ${JSON.stringify(services)}

Analyze this website's landing pages for conversion readiness. For each major service page (or the homepage if service pages aren't detectable), evaluate how well the page would convert paid search traffic into leads.

Return ONLY valid JSON:
{
  "overall_score": number (0-100),
  "overall_grade": "A | B | C | D | F",
  "summary": "string (2-3 sentences — what's working, what's hurting conversions)",
  "pages": [
    {
      "page_name": "string (e.g., 'Homepage', 'AC Repair', 'Emergency Plumbing')",
      "url_path": "string (e.g., '/', '/services/ac-repair')",
      "score": number (0-100),
      "scores": {
        "headline_clarity": { "score": number (0-10), "note": "string" },
        "cta_presence": { "score": number (0-10), "note": "string" },
        "trust_signals": { "score": number (0-10), "note": "string" },
        "phone_visibility": { "score": number (0-10), "note": "string" },
        "form_presence": { "score": number (0-10), "note": "string" },
        "mobile_indicators": { "score": number (0-10), "note": "string" },
        "page_speed_signals": { "score": number (0-10), "note": "string" },
        "ad_relevance": { "score": number (0-10), "note": "string" }
      },
      "strengths": ["string"],
      "issues": [
        {
          "issue": "string (specific problem)",
          "impact": "high | medium | low",
          "fix": "string (specific actionable recommendation)"
        }
      ]
    }
  ],
  "priority_fixes": [
    {
      "rank": number,
      "fix": "string (specific, actionable fix)",
      "impact": "high | medium",
      "effort": "easy | moderate | hard",
      "affected_pages": ["string"]
    }
  ],
  "pre_launch_checklist": [
    {
      "item": "string",
      "status": "pass | fail | warning",
      "detail": "string"
    }
  ]
}

SCORING CRITERIA:
- headline_clarity: Does the headline clearly state the service? Does it match likely search queries?
- cta_presence: Are there clear calls-to-action (call now, get quote, schedule)? Above the fold?
- trust_signals: Reviews, ratings, licenses, insurance, guarantees, BBB, years in business?
- phone_visibility: Is the phone number prominent and clickable? Visible without scrolling?
- form_presence: Is there a contact/quote form? Is it short (name, phone, email max)?
- mobile_indicators: Does the site appear mobile-responsive? Tap targets, readable text?
- page_speed_signals: Does the site appear lightweight or bloated with scripts/images?
- ad_relevance: Would someone searching "${industry} near me" feel they landed in the right place?

IMPORTANT:
- Score each category 0-10 where 10 is perfect
- Overall page score = average of all category scores × 10 (so range 0-100)
- Be specific in recommendations — say "Add phone number to the header bar" not "improve phone visibility"
- Priority fixes should be ordered by impact (highest first)
- Pre-launch checklist: things that MUST be fixed before spending money on ads

Return ONLY the JSON object.`;
}

// ─── Agent Prompts ────────────────────────────────────────────────

export function brandIdentityPrompt(url, websiteContent) {
  return `You are a brand strategist. Analyze this website and extract brand identity.

URL: ${url}
CONTENT SAMPLE: ${websiteContent?.slice(0, 2000) || '(not available)'}

Return ONLY valid JSON:
{
  "brand_name": "string",
  "industry": "string",
  "tone_of_voice": "string (e.g., 'professional and trustworthy', 'friendly and approachable')",
  "key_terminology": ["string (industry-specific words they use)"],
  "target_audience": "string (who they serve)",
  "usps": ["string (unique selling points)"],
  "messaging_pillars": ["string (core themes: reliability, speed, price, quality, etc.)"],
  "color_sentiment": "string (inferred from site — e.g., 'blue/professional, orange/energetic')",
  "services": ["string"]
}`;
}

export function accountAuditPrompt(campaigns, adGroups, keywords, ads, metrics) {
  return `You are a senior Google Ads auditor. Analyze this account and identify all issues and opportunities.

CAMPAIGNS: ${JSON.stringify(campaigns?.slice(0, 20))}
AD GROUPS: ${JSON.stringify(adGroups?.slice(0, 30))}
KEYWORDS (sample): ${JSON.stringify(keywords?.slice(0, 50))}
CAMPAIGN METRICS: ${JSON.stringify(metrics)}

Return ONLY valid JSON:
{
  "health_score": number (0-100),
  "issues": [
    {
      "category": "string (structure | keywords | ads | bidding | budget)",
      "severity": "critical | warning | suggestion",
      "issue": "string (specific problem)",
      "recommendation": "string (specific fix)"
    }
  ],
  "wasted_spend_estimate": number (monthly dollars estimated wasting),
  "quick_wins": ["string (things that can be fixed immediately for high impact)"],
  "strengths": ["string (what is working well)"],
  "summary": "string (3-4 sentence overall assessment)"
}`;
}

export function keywordOptimizationPrompt(keywords, searchTerms, metrics, brandProfile) {
  return `You are a Google Ads keyword optimizer. Analyze keyword performance and recommend changes.

KEYWORDS WITH METRICS: ${JSON.stringify(keywords?.slice(0, 100))}
SEARCH TERMS REPORT: ${JSON.stringify(searchTerms?.slice(0, 100))}
BRAND PROFILE: ${JSON.stringify(brandProfile)}

Rules:
- Pause keywords with cost > $30 and 0 conversions in 30 days
- Add high-performing search terms (>5 clicks, cost/click < $15) as exact match keywords
- Flag broad match keywords with high spend for match type review

Return ONLY valid JSON:
{
  "pause": [
    {
      "resource_name": "string",
      "keyword": "string",
      "reason": "string",
      "cost_wasted": number
    }
  ],
  "add": [
    {
      "text": "string",
      "match_type": "EXACT | PHRASE",
      "ad_group_resource": "string",
      "ad_group_name": "string",
      "reason": "string"
    }
  ],
  "summary": "string"
}`;
}

export function bidOptimizationPrompt(keywords, goals) {
  return `You are a Google Ads bid strategist. Recommend bid adjustments based on performance.

KEYWORDS WITH METRICS: ${JSON.stringify(keywords?.slice(0, 100))}
GOALS: ${JSON.stringify(goals || { target_cpa: null, maximize: 'conversions' })}

Rules:
- Increase bids by up to 20% on keywords with conversion rate > 3% and cost below target CPA
- Decrease bids by up to 20% on keywords with 0 conversions and cost > $20
- Never adjust bids more than 20% in a single run

Return ONLY valid JSON:
{
  "adjustments": [
    {
      "resource_name": "string",
      "keyword": "string",
      "current_bid_micros": number,
      "new_bid_micros": number,
      "reason": "string"
    }
  ],
  "summary": "string"
}`;
}

export function budgetOptimizationPrompt(campaigns, metrics) {
  return `You are a Google Ads budget allocator. Recommend budget reallocation across campaigns.

CAMPAIGNS WITH METRICS: ${JSON.stringify(metrics)}
CURRENT BUDGETS: ${JSON.stringify(campaigns?.map(c => ({ name: c.name, budgetAmountMicros: c.budgetAmountMicros, budgetResource: c.budgetResource })))}

Rules:
- Shift budget from campaigns with CPA > 2x average to campaigns performing below average CPA
- Never change any campaign budget by more than 15% in one run
- Only recommend changes if there's a meaningful performance gap

Return ONLY valid JSON:
{
  "reallocations": [
    {
      "campaign_name": "string",
      "budget_resource": "string",
      "current_amount_micros": number,
      "new_amount_micros": number,
      "reason": "string"
    }
  ],
  "summary": "string"
}`;
}

export function adCopyOptimizationPrompt(adGroup, keywords, brandProfile, existingAds) {
  return `You are a Google Ads copywriter. Generate new RSA ad variants for this ad group.

AD GROUP: ${adGroup.name}
KEYWORDS: ${JSON.stringify(keywords?.slice(0, 10)?.map(k => k.keyword))}
BRAND PROFILE: ${JSON.stringify(brandProfile)}
EXISTING ADS: ${JSON.stringify(existingAds?.slice(0, 3))}

Character limits are HARD: headlines max 30 chars, descriptions max 90 chars.

Return ONLY valid JSON:
{
  "headlines": ["string (max 30 chars each — 10 variants)"],
  "descriptions": ["string (max 90 chars each — 4 variants)"],
  "rationale": "string"
}`;
}

export function negativeKeywordPrompt(searchTerms, existingNegatives, brandProfile) {
  return `You are a Google Ads negative keyword specialist. Identify search terms that are wasting budget.

SEARCH TERMS (with spend): ${JSON.stringify(searchTerms?.slice(0, 100))}
EXISTING NEGATIVES: ${JSON.stringify(existingNegatives?.slice(0, 50))}
BUSINESS CONTEXT: ${JSON.stringify(brandProfile)}

Identify irrelevant search terms: jobs/careers, DIY/how-to with no buying intent, wrong industry, free/cheap with no commercial intent, competitor brand names.

Return ONLY valid JSON:
{
  "negatives": [
    {
      "keyword": "string",
      "match_type": "EXACT | PHRASE | BROAD",
      "reason": "string",
      "wasted_spend": number,
      "search_term": "string (the triggering search term)"
    }
  ],
  "summary": "string"
}`;
}
