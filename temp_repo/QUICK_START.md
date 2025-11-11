# 🚀 Quick Start Guide

## Login Credentials

Use any of these to log in:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@gov.in` | `Admin@123` |
| Analyst | `analyst@gov.in` | `Analyst@123` |
| Official | `official@gov.in` | `Official@123` |
| Viewer | `viewer@gov.in` | `Viewer@123` |

## Current Database Status ✅

- ✅ **15 Media Sources** (Times of India, NDTV, Dainik Jagran, etc.)
- ✅ **28 Feedback Items** (Multilingual news articles)
- ✅ **6 AI Analyses** (Sentiment analysis completed)
- ✅ **1 Admin User** (admin@gov.in)

## 5-Minute Tour

### Step 1: Login (30 seconds)
1. Open the application
2. Use admin@gov.in / Admin@123
3. Click "Sign In"

### Step 2: View Dashboard (1 minute)
- See total feedback count
- Check sentiment distribution
- View regional analytics
- Explore trending topics

### Step 3: Browse Media Sources (1 minute)
1. Click "Media Sources" in sidebar
2. Browse 15 active sources
3. Try filtering by language or type
4. Click "Scrape" on any source to collect new articles

### Step 4: Check Feedback (2 minutes)
1. Click "Feedback Collection" in sidebar
2. View 28 real articles in multiple languages
3. Check translations (Hindi, Tamil, Telugu, etc.)
4. Click "Analyze" to run AI sentiment analysis
5. Click "View Details" to see full content

### Step 5: Explore Analytics (30 seconds)
- Click "Regional Analytics" for state-wise data
- Click "Bias Detection" for media bias analysis
- Click "AI Analysis" for detailed sentiment data

## Quick Actions

### Scrape New Articles
1. Media Sources → Click "Scrape All"
2. Wait for confirmation
3. Go to Feedback Collection to see results

### Analyze Feedback
1. Feedback Collection → Find unanalyzed item
2. Click "Analyze" button
3. Check AI Analysis page for results

### Add New Source
1. Media Sources → Click "Add Source"
2. Fill in details (name, type, language, region, URL)
3. Set credibility score
4. Click "Add Source"

### Generate Report
1. Reports → Click "Generate Report"
2. Select type and date range
3. View or export

## Features by Role

### Admin
- ✅ All features
- ✅ User management
- ✅ Delete operations
- ✅ System configuration

### Analyst
- ✅ View all data
- ✅ Run analysis
- ✅ Create reports
- ✅ Add media sources

### Government Official
- ✅ View data
- ✅ View reports
- ✅ Regional analytics
- ⛔ Cannot modify data

### Viewer
- ✅ View data only
- ⛔ Cannot modify anything

## Troubleshooting

### "Loading media sources..." stuck?
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Clear browser cache
3. Check browser console for errors
4. Try logging out and back in

### Data not showing?
1. Verify you're logged in
2. Check internet connection
3. Try different browser
4. Check console logs (F12)

### Scraping failed?
1. Verify media source URL is valid
2. Check source is marked "active"
3. Try single source first
4. Check edge function logs

## Browser Console

Open with F12 or Cmd+Option+I (Mac)

You should see:
```
✅ Supabase initialized with URL: https://...
✅ Fetching media sources from Supabase...
✅ Successfully fetched 15 media sources
✅ Fetching feedback items from Supabase...
✅ Successfully fetched 28 feedback items
```

## Pages Overview

| Page | Purpose | Key Features |
|------|---------|--------------|
| Dashboard | Overview | Stats, charts, trends |
| Media Sources | Source management | Add, scrape, monitor |
| Feedback Collection | View articles | Search, filter, analyze |
| AI Analysis | Analysis results | Sentiment, topics, entities |
| Bias Detection | Media bias | Political, regional bias |
| Regional Analytics | Geographic data | State-wise analysis |
| Reports | Report generation | Daily, weekly, monthly |
| User Management | User control | Admin only |

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Subscriptions
- **AI**: Edge Functions (serverless)
- **Languages**: 15+ Indian languages

## Database Tables

1. `users` - User accounts
2. `media_sources` - News outlets
3. `feedback_items` - Collected articles
4. `ai_analyses` - AI results
5. `performance_metrics` - Aggregated stats
6. `reports` - Generated reports
7. `scraping_jobs` - Job tracking

## Edge Functions (All Active ✅)

1. `scrape-news` - Scrapes articles
2. `analyze-sentiment` - AI analysis
3. `translate-content` - Translation
4. `scheduled-scraper` - Auto scraping
5. `create-admin` - Admin creation
6. `reset-admin-password` - Password reset
7. `authenticate-user` - Custom auth

## Support Languages

Hindi • Tamil • Telugu • Marathi • Bengali • Gujarati • Kannada • Malayalam • Punjabi • Odia • Assamese • English • and more

## Real-Time Updates

- ⚡ Live data refresh
- 🔄 Auto-sync on changes
- 📡 Supabase subscriptions
- 🔔 Instant notifications

## Security

- 🔒 Row Level Security (RLS)
- 🔐 Role-based access control
- 🛡️ Public read, authenticated write
- 🔑 Secure password hashing

## Next Steps

1. ✅ Login with provided credentials
2. ✅ Explore all pages
3. ✅ Try scraping a media source
4. ✅ Analyze some feedback
5. ✅ View regional analytics
6. ✅ Generate a report

---

**System Status**: 🟢 Production Ready
**Last Updated**: October 8, 2025
**Version**: 1.0.0
