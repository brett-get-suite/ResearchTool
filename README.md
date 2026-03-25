# PPC Recon — Google Ads Research Tool

AI-powered keyword research, competitor auditing, and low-hanging fruit discovery for HVAC, plumbing, and trade contractor clients.

## What It Does

1. **Website Analysis** — Crawls client website via Gemini AI to detect services, USPs, and service areas
2. **Keyword Research** — Generates keyword lists with intent classification, CPC estimates, and search volume across all service areas
3. **Competitor Audit** — Identifies competitors, their ad strategies, and gaps in coverage
4. **Low-Hanging Fruit** — Finds high-value keywords with low competition (especially "online estimate" patterns)
5. **CSV Export** — One-click download of the full research report

## Tech Stack

- **Next.js 14** (App Router) — deployed on Vercel
- **Gemini 2.0 Flash** — powers all research via Google AI
- **Tailwind CSS** — styling

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd ads-research-tool
npm install
```

### 2. Get a Gemini API key

Go to [aistudio.google.com](https://aistudio.google.com) → Get API Key. A free key works fine for a few runs per day.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

You can enter your API key in the UI, or create a `.env.local` file:

```
GEMINI_API_KEY=your_key_here
```

### 4. Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → Import Project → Select the repo
3. Optionally add `GEMINI_API_KEY` as an environment variable in Vercel settings
4. Deploy — done

## How to Use

1. Enter a Gemini API key (or set it in Vercel env vars)
2. Enter the client's website URL and select their industry
3. Add service areas (cities, zip codes, regions)
4. Click **Analyze Website** — Gemini crawls the site and detects services
5. Review and select which services to research
6. Click **Run Full Research Pipeline** — runs keyword research, competitor audit, and opportunity analysis
7. Browse results across tabs: Keywords, Competitors, Low-Hanging Fruit, Budget
8. Click **Export CSV** to download the full report

## Important Notes

- **CPC estimates are AI-generated**, not pulled from Google Ads Keyword Planner API. They're directionally accurate for planning but should be validated against actual Keyword Planner data before setting budgets.
- **Future enhancement**: Integrate the Google Ads API (Keyword Planner) for real-time CPC and volume data. This requires a Google Ads developer token and OAuth setup.
- The tool is optimized for trade contractors (HVAC, plumbing, etc.) but works for any local service business.

## Project Structure

```
├── app/
│   ├── layout.js          # Root layout
│   ├── page.js            # Main UI (multi-step research flow)
│   ├── globals.css         # Tailwind + custom styles
│   └── api/
│       ├── analyze-website/route.js   # Gemini website crawl
│       ├── keyword-research/route.js  # Keyword generation
│       ├── competitor-audit/route.js  # Competitor + opportunity analysis
│       └── export-csv/route.js        # CSV report export
├── lib/
│   ├── gemini.js           # Gemini API client helper
│   └── prompts.js          # All AI prompt templates
├── tailwind.config.js
├── next.config.js
└── package.json
```

## Customization

All AI prompts live in `lib/prompts.js`. You can tune:
- Industry-specific keyword patterns
- CPC estimation ranges
- Intent classification rules
- Negative keyword lists
- Low-hanging fruit scoring criteria
