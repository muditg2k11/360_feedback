# 360° Media Feedback Analysis System - User Guide

## Login Credentials

**Admin Account:**
- Email: `admin@gov.in`
- Password: `admin123`

## What This System Does

This is a comprehensive Government Media Monitoring Platform that provides:

### 1. 360° Feedback Collection
- Scrapes news articles from 15+ media sources (newspapers, TV, radio, social media, online news)
- Covers all Indian states and regions
- Supports multiple languages (Hindi, English, Bengali, Tamil, Telugu, Malayalam, etc.)
- Automatic translation to English for unified analysis

### 2. AI-Powered Sentiment Analysis
- Analyzes sentiment of each article (positive, negative, neutral, mixed)
- Extracts keywords, topics, and entities
- Provides confidence scores for analysis accuracy
- Tracks sentiment trends over time

### 3. Bias Detection
- Identifies political bias in media coverage
- Detects regional bias in reporting
- Evaluates source credibility/reliability
- Alerts when bias levels are high

### 4. Real-Time Dashboard
- Shows total feedback collected
- Displays today's analysis count
- Average sentiment tracking
- High bias alerts
- Regional sentiment distribution
- Trending topics across media

### 5. Regional Analytics
- Sentiment analysis by Indian state
- Regional feedback distribution
- State-wise trending topics
- Geographic visualization of media coverage

### 6. Comprehensive Reporting
- Generate monthly, quarterly, or annual reports
- Key insights and recommendations
- Department and region-wise filtering
- Exportable reports for stakeholders

### 7. Media Source Management
- Add/edit/remove media sources
- Track source credibility
- Manual or scheduled scraping
- Multi-language source support

## How to Use

### Step 1: Login
1. Open the application
2. Use the admin credentials above
3. You'll be redirected to the Dashboard

### Step 2: View Dashboard
- See overview statistics
- Check sentiment trends
- View regional distribution
- Identify trending topics

### Step 3: Manage Media Sources
1. Navigate to "Media Sources"
2. View existing 15 media sources
3. Add new sources with "Add New Source" button
4. Click "Scrape Now" to collect articles from any source

### Step 4: Collect Feedback
1. Go to "Feedback Collection"
2. View all collected articles (5 items currently)
3. Click on any item to see details
4. View AI analysis, sentiment, topics, and bias indicators

### Step 5: Check Bias Detection
1. Navigate to "Bias Detection"
2. See items flagged for high bias
3. Review political, regional, and source bias scores
4. Take action on biased content

### Step 6: Regional Analytics
1. Go to "Regional Analytics"
2. View sentiment by state
3. See which regions have most coverage
4. Identify regional trending topics

### Step 7: Generate Reports
1. Navigate to "Reports"
2. Create new report with custom date range
3. Select departments and regions
4. Generate insights and recommendations
5. Export for stakeholders

### Step 8: User Management (Admin Only)
1. Go to "User Management"
2. View all users
3. Add new users with specific roles:
   - Admin (full access)
   - Analyst (can analyze and report)
   - Government Official (can view and report)
   - Viewer (read-only access)

## Current Data

The system currently has:
- **15 Media Sources** across India
- **5 Feedback Items** (news articles collected)
- **4 AI Analyses** (sentiment and bias detection completed)

## Key Features Working

✅ Database connected and operational
✅ User authentication with role-based access
✅ Media source management
✅ News scraping (manual and scheduled)
✅ AI sentiment analysis
✅ Bias detection
✅ Regional analytics
✅ Dashboard with real-time stats
✅ Report generation
✅ Multi-language support
✅ Translation services

## Notes

- The system uses **fallback mode** when database is temporarily unavailable (stores data in browser)
- Edge functions are deployed and active for scraping, sentiment analysis, and translation
- Real-time updates via database subscriptions
- All data is persistent and secured with Row Level Security (RLS)

## Support

For issues or questions:
1. Check browser console for errors
2. Verify database connection in .env file
3. Ensure all edge functions are deployed
4. Contact system administrator

---

**Start by logging in with admin@gov.in / admin123 and exploring the Dashboard!**
