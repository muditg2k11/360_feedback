# 360° Government Feedback System - Complete Project Guide

## System Overview

A comprehensive real-time feedback monitoring system for government departments across India. Collects, analyzes, and reports feedback from regional media sources in multiple Indian languages.

## ✅ Working Features

### 1. Authentication System
- **Login Credentials**:
  - Admin: `admin@gov.in` / `Admin@123`
  - Analyst: `analyst@gov.in` / `Analyst@123`
  - Official: `official@gov.in` / `Official@123`
  - Viewer: `viewer@gov.in` / `Viewer@123`

- Supabase authentication with fallback to localStorage
- Role-based access control (Admin, Analyst, Government Official, Viewer)
- Automatic session management

### 2. Database (Supabase)
- **15 Media Sources** actively monitored
- **28 Feedback Items** collected from various sources
- **Real-time updates** using Supabase subscriptions
- **Public read access** - data loads without authentication
- **Secure write access** - only authenticated users can modify data

### 3. Media Sources Management
**Location**: Media Sources page
- View all registered media sources
- Filter by type (newspaper, TV, radio, social media, online)
- Filter by language (Hindi, Tamil, Telugu, Bengali, Marathi, English, etc.)
- Search by name
- Add new media sources
- Scrape individual sources or all sources at once
- View credibility scores and activity status

### 4. Feedback Collection
**Location**: Feedback Collection page
- Real-time feedback items from media sources
- Multilingual content (original + translated)
- Filter by status (pending, processing, analyzed)
- Filter by region
- Search functionality
- AI sentiment analysis
- Automatic translation for non-English content

### 5. Dashboard
- Total feedback count
- Daily analysis statistics
- Average sentiment score
- Bias detection count
- Sentiment distribution (positive, negative, neutral, mixed)
- Regional distribution
- Trending topics
- Language distribution

### 6. AI Analysis
- Sentiment analysis using edge functions
- Bias detection (political and regional)
- Topic extraction
- Entity recognition
- Keyword identification
- Confidence scoring

### 7. Regional Analytics
- State-wise feedback analysis
- Sentiment trends by region
- Top issues per region
- Geographic insights

### 8. Bias Detection
- Political bias indicators
- Regional bias analysis
- Media source credibility tracking

### 9. Reports Generation
- Daily, weekly, monthly, quarterly reports
- Custom date range reports
- Department-specific reports
- Regional reports
- PDF export capability

### 10. User Management (Admin Only)
- View all users
- Manage user roles
- Track user activity
- User registration approval

## 🔧 Technical Stack

### Frontend
- **React** with TypeScript
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Vite** for build tooling

### Backend
- **Supabase** for database and authentication
- **PostgreSQL** database
- **Row Level Security (RLS)** for data protection
- **Supabase Edge Functions** for serverless processing

### Edge Functions
1. **scrape-news**: Scrapes articles from media sources
2. **analyze-sentiment**: AI-powered sentiment analysis
3. **translate-content**: Translates content to English
4. **scheduled-scraper**: Automated periodic scraping
5. **create-admin**: Admin account creation
6. **reset-admin-password**: Password reset functionality
7. **authenticate-user**: Custom authentication logic

## 📊 Database Schema

### Tables
1. **users** - User accounts and profiles
2. **media_sources** - Registered media outlets
3. **feedback_items** - Collected feedback/news articles
4. **ai_analyses** - AI analysis results
5. **performance_metrics** - Aggregated metrics
6. **reports** - Generated reports
7. **scraping_jobs** - Scraping job tracking

## 🚀 How to Use

### First Time Setup
1. Application loads automatically with Supabase configuration
2. Login with any of the provided credentials
3. Navigate using the sidebar menu

### Adding Media Sources
1. Go to "Media Sources" page
2. Click "Add Source" button
3. Fill in:
   - Source name
   - Type (newspaper, TV, radio, etc.)
   - Language
   - Region
   - Website URL
   - Credibility score
4. Click "Add Source"

### Scraping News
1. **Single Source**: Click "Scrape" button on any media source card
2. **All Sources**: Click "Scrape All" button at the top
3. Progress will be shown in real-time
4. New articles appear automatically in Feedback Collection

### Analyzing Feedback
1. Go to "Feedback Collection" page
2. Find items with "pending" or "processing" status
3. Click "Analyze" button
4. AI will:
   - Translate if not in English
   - Perform sentiment analysis
   - Extract topics and entities
   - Detect bias indicators
5. View results in "AI Analysis" page

### Viewing Analytics
- **Dashboard**: Overview of all metrics
- **Regional Analytics**: State-wise analysis
- **Bias Detection**: Media bias tracking
- **AI Analysis**: Detailed analysis results

### Generating Reports
1. Go to "Reports" page
2. Click "Generate Report"
3. Select:
   - Report type (daily, weekly, monthly)
   - Date range
   - Departments
   - Regions
4. View or export report

## 🔒 Security Features

### Row Level Security (RLS)
- **Public Read Access**: Anyone can view data
- **Authenticated Write**: Only logged-in users can write
- **Role-Based Operations**:
  - Admin: Full access
  - Analyst: Read + analyze
  - Official: Read + comment
  - Viewer: Read only

### Authentication
- Secure password hashing
- Session management
- Automatic token refresh
- Fallback authentication for offline mode

## 🌐 Multilingual Support

### Supported Languages
- Hindi
- Tamil
- Telugu
- Marathi
- Bengali
- Gujarati
- Kannada
- Malayalam
- Punjabi
- English
- And more...

### Features
- Original language preservation
- Automatic translation to English
- Language detection
- Native script support

## 📈 Real-Time Features

1. **Live Data Updates**: Supabase subscriptions
2. **Instant Notifications**: New feedback appears automatically
3. **Live Scraping**: Watch articles being collected
4. **Real-Time Analysis**: See sentiment scores update

## 🛠️ Troubleshooting

### If Data Doesn't Load
1. Check browser console for errors
2. Verify Supabase connection (check .env file)
3. Clear browser cache and localStorage
4. Try logging out and logging back in

### If Scraping Fails
1. Check media source URL is valid
2. Verify source is marked as "active"
3. Check browser console for edge function errors
4. Try scraping single source first

### If Analysis Fails
1. Ensure content is not empty
2. Check if feedback item has original content
3. Verify edge functions are active
4. Review browser console logs

## 📝 Development

### Environment Variables
Required in `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Build Commands
- `npm run dev` - Development server (auto-started)
- `npm run build` - Production build
- `npm run preview` - Preview production build

### Adding New Features
1. Create new component in `src/components/`
2. Create new page in `src/pages/`
3. Add route in `src/App.tsx`
4. Update types in `src/types/index.ts`
5. Add service methods in `src/services/`

## 🎯 Key Improvements Made

1. ✅ Public read access for immediate data loading
2. ✅ Faster authentication timeout (1s instead of 3s)
3. ✅ Better error handling and logging
4. ✅ Fallback data service for offline mode
5. ✅ Real-time subscriptions for live updates
6. ✅ Comprehensive RLS policies
7. ✅ All edge functions active and working
8. ✅ Complete multilingual support
9. ✅ Production-ready build

## 📦 Current Data

- **15 active media sources** across India
- **28 feedback items** in multiple languages
- **Regional coverage**: Tamil Nadu, Kerala, Maharashtra, West Bengal, Andhra Pradesh, North India, and more
- **Languages**: Hindi, Tamil, Telugu, Marathi, Bengali, English

## 🎨 UI Features

- Responsive design (mobile, tablet, desktop)
- Dark mode support
- Smooth animations
- Loading states
- Error handling
- Toast notifications
- Modal dialogs
- Real-time indicators

## 🔄 Workflow

1. **Media Sources** → Register outlets
2. **Scraping** → Collect articles/feedback
3. **Translation** → Convert to English if needed
4. **Analysis** → AI sentiment and bias detection
5. **Dashboard** → View aggregated insights
6. **Reports** → Generate comprehensive reports
7. **Action** → Government departments respond

## 📞 Support

For issues or questions:
1. Check browser console logs
2. Review this guide
3. Check database connection status
4. Verify edge functions are running
5. Review Supabase dashboard

---

**Last Updated**: October 8, 2025
**Version**: 1.0.0
**Status**: Production Ready ✅
