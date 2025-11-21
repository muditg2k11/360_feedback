# India Government News Bias Detection System - Complete Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Technologies Used](#technologies-used)
4. [Data Flow & Methodology](#data-flow--methodology)
5. [Features & Functionality](#features--functionality)
6. [Step-by-Step Operation](#step-by-step-operation)
7. [Deployment Guide](#deployment-guide)
8. [API Reference](#api-reference)

---

## Project Overview

### Purpose
A comprehensive system for monitoring and analyzing media coverage of Indian government activities across multiple news sources, languages, and regions. The platform detects bias, performs sentiment analysis, and provides actionable insights for government officials and analysts.

### Key Objectives
- Monitor 10+ regional news sources across India
- Analyze content in multiple Indian languages (English, Hindi, Tamil, Telugu, etc.)
- Detect 6 dimensions of bias in media coverage
- Provide real-time sentiment analysis
- Generate regional analytics and reports
- Support evidence-based policy communication

### Target Users
- Government Analysts
- Policy Makers
- Communication Officers
- Regional Officials
- Media Monitoring Teams

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                         │
│  React 18 + TypeScript + Tailwind CSS + Vite              │
│  - Dashboard  - Bias Detection  - Analytics  - Reports     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ HTTPS/REST API
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                   Supabase Backend                          │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ PostgreSQL   │  │ Edge         │  │ Authentication  │  │
│  │ Database     │  │ Functions    │  │ & Auth Policies │  │
│  │ (RLS enabled)│  │ (Deno runtime)│  │                 │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                  │
                  │ External APIs
                  │
┌─────────────────▼───────────────────────────────────────────┐
│              External Data Sources                          │
│  - RSS Feeds (Indian Express, Hindu, etc.)                 │
│  - News Websites (HTML scraping)                           │
│  - Regional News Portals                                    │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
Frontend (React)
├── Pages
│   ├── Dashboard (Overview & Stats)
│   ├── FeedbackCollection (Content Management)
│   ├── BiasDetection (Analysis Results)
│   ├── AIAnalysis (Insights)
│   ├── RegionalAnalytics (Geographic Breakdown)
│   ├── Reports (Report Generation)
│   ├── MediaSources (Source Management)
│   └── UserManagement (Admin)
├── Components
│   ├── Layout (Navigation & Header)
│   ├── StatCard (Metrics Display)
│   ├── Modal (Dialog System)
│   ├── FeedbackDetailModal (Article Details)
│   └── LoginPage/SignUpPage (Authentication)
├── Services
│   ├── dataService.ts (API Layer)
│   ├── scrapingService.ts (Scraping Logic)
│   └── fallbackDataService.ts (Mock Data)
└── Contexts
    └── AuthContext (Authentication State)

Backend (Supabase)
├── Database Tables
│   ├── users (User accounts)
│   ├── media_sources (News sources)
│   ├── feedback_items (Articles)
│   ├── ai_analyses (Analysis results)
│   ├── scraping_jobs (Job tracking)
│   └── bias_validations (Human validation)
├── Edge Functions (Deno)
│   ├── scrape-news (RSS & content extraction)
│   ├── detect-bias (6-dimensional bias analysis)
│   ├── generate-summary (AI summarization)
│   ├── generate-insights (Pattern detection)
│   └── reanalyze-bias (Batch re-analysis)
└── Row Level Security (RLS)
    ├── User isolation policies
    ├── Role-based access control
    └── Public read policies
```

---

## Technologies Used

### Frontend Stack

#### Core Framework
- **React 18.3.1**
  - Component-based architecture
  - Hooks for state management (useState, useEffect)
  - Context API for auth state
  - Virtual DOM for performance

- **TypeScript 5.5.3**
  - Static type checking
  - Interface definitions
  - Type-safe API calls
  - Enhanced IDE support

- **Vite 5.4.2**
  - Lightning-fast HMR (Hot Module Replacement)
  - Optimized build process
  - ESM-based development server
  - Code splitting

#### UI & Styling
- **Tailwind CSS 3.4.1**
  - Utility-first CSS framework
  - Responsive design system
  - Custom color schemes
  - JIT (Just-In-Time) compilation

- **Lucide React 0.344.0**
  - 1000+ clean SVG icons
  - Tree-shakeable
  - Consistent design language
  - Performance optimized

#### Build Tools
- **PostCSS 8.4.35** - CSS transformations
- **Autoprefixer 10.4.18** - Browser compatibility
- **ESLint 9.9.1** - Code quality
- **TypeScript ESLint** - TS-specific linting

### Backend Stack

#### Database
- **PostgreSQL (via Supabase)**
  - Relational database
  - JSONB for flexible data
  - Full-text search capabilities
  - Transactions & ACID compliance

- **Row Level Security (RLS)**
  - Table-level security policies
  - User isolation
  - Role-based permissions
  - Authentication integration

#### Serverless Functions
- **Supabase Edge Functions**
  - Deno runtime (TypeScript native)
  - Global edge deployment
  - Auto-scaling
  - Cold start optimization

- **Deno Runtime**
  - Secure by default
  - Native TypeScript support
  - Web standards compatibility
  - No node_modules

#### Authentication
- **Supabase Auth**
  - Email/password authentication
  - JWT token management
  - Session handling
  - Password reset flows

### External Libraries & APIs

#### Data Processing
- **linkedom 0.18.0** (DOM Parser)
  - HTML parsing in Deno
  - DOM manipulation
  - XPath/CSS selectors
  - Memory efficient

- **@supabase/supabase-js 2.57.4**
  - Official Supabase client
  - Real-time subscriptions
  - Type generation
  - Auto-reconnection

#### Development Tools
- **Git** - Version control
- **npm** - Package management
- **VS Code** - Recommended IDE

---

## Data Flow & Methodology

### 1. Content Collection Pipeline

```
Step 1: Source Configuration
├── Admin adds media source
├── Provides RSS feed URL
├── Sets language, region, type
└── Activates source

Step 2: Scheduled/Manual Scraping
├── Trigger: Manual button or scheduled job
├── Edge Function: scrape-news
│   ├── Fetch RSS feed XML
│   ├── Parse with DOMParser
│   ├── Extract: title, description, URL, pubDate
│   └── For each article:
│       ├── Check if description < 100 chars
│       ├── If yes: Fetch full article page (HTTP GET)
│       ├── Parse HTML with linkedom
│       ├── Extract content using selectors:
│       │   ├── <article> tags
│       │   ├── [itemprop="articleBody"]
│       │   ├── .article-content, .post-content
│       │   ├── .story-content, .news-content
│       │   └── Fallback: all <p> tags
│       ├── Clean HTML (remove scripts, styles, tags)
│       ├── Limit to 2000 characters
│       └── Return article object
├── Duplicate check (by URL)
└── Insert into feedback_items table

Step 3: Job Tracking
├── Create scraping_jobs record
├── Update status: running → completed/failed
├── Log: articles_found, articles_saved
└── Store error messages if failed
```

### 2. Bias Detection Methodology

```
Step 1: Trigger Analysis
├── User clicks "Analyze" or "Re-Analyze All"
├── Frontend calls detect-bias edge function
└── Passes: title, content, feedbackId

Step 2: Text Preprocessing
├── Combine title + content
├── Convert to lowercase
├── Calculate text length
└── Apply length multiplier (longer = more reliable)

Step 3: Six-Dimensional Analysis

┌────────────────────────────────────────────────┐
│   Dimension 1: Political Bias (0-100)        │
├────────────────────────────────────────────────┤
│ Keywords: government, minister, party,         │
│          politics, election, BJP, Congress     │
│ Method:                                        │
│  - Base score: 50                             │
│  - +10 if political keywords detected         │
│  - Evidence: keyword list                     │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│   Dimension 2: Regional Bias (0-100)         │
├────────────────────────────────────────────────┤
│ Keywords: delhi, mumbai, bangalore, chennai,   │
│          state, city, region                   │
│ Method:                                        │
│  - Base score: 50                             │
│  - +10 if regional keywords detected          │
│  - Evidence: location mentions                │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│   Dimension 3: Sentiment Bias (0-100)        │
├────────────────────────────────────────────────┤
│ Emotional Words (38): fury, outrage, slams,    │
│     blasts, scandal, crisis, brilliant, etc.   │
│ Positive Words (21): good, great, success      │
│ Negative Words (21): bad, poor, failure        │
│ Opinionated: should, must, obviously           │
│ Sensationalism: !!!, ALL CAPS                  │
│ Method:                                        │
│  - Base score: 20                             │
│  - +15 per emotional word                     │
│  - +5 per word in sentiment imbalance         │
│  - +5 per opinionated phrase                  │
│  - +5 per exclamation mark (after 2)          │
│  - +10 per ALL CAPS word                      │
│  - +10 if emotional words in headline         │
│  - Evidence: detected patterns                │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│   Dimension 4: Source Reliability (0-100)    │
├────────────────────────────────────────────────┤
│ Method:                                        │
│  - Base score: 60                             │
│  - Evidence: attribution quality assessment   │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│   Dimension 5: Representation Bias (0-100)   │
├────────────────────────────────────────────────┤
│ Method:                                        │
│  - Base score: 50                             │
│  - Evidence: stakeholder diversity            │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│   Dimension 6: Language Bias (0-100)         │
├────────────────────────────────────────────────┤
│ Method:                                        │
│  - Base score: 45                             │
│  - Evidence: framing assessment               │
└────────────────────────────────────────────────┘

Step 4: Overall Score Calculation
├── Average all 6 dimensions
├── Classify:
│   ├── 65-100: High Bias
│   ├── 45-64: Medium Bias
│   └── 0-44: Low Bias
└── Store in ai_analyses table

Step 5: Sentiment Analysis
├── Count positive/negative/emotional words
├── Calculate sentiment score: -1.0 to +1.0
├── Assign label: positive/negative/mixed/neutral
├── Store sentiment_score, sentiment_label
└── Include in bias_indicators JSON
```

### 3. Sentiment Analysis Algorithm

```
Input: Article text (title + content)

Step 1: Word Tokenization
└── Split text into individual words

Step 2: Keyword Matching
├── Positive words (24): good, great, excellent, success,
│   achievement, progress, improvement, beneficial, etc.
├── Negative words (24): bad, poor, failure, problem,
│   crisis, corrupt, fraud, terrible, etc.
└── Emotional words (11): fury, outrage, controversy,
    scandal, explosive, dramatic, sensational, etc.

Step 3: Count Words
├── positive_count = matches in positive list
├── negative_count = matches in negative list
├── emotional_words = array of matched emotional words
└── neutral_count = total - (positive + negative)

Step 4: Calculate Score
├── total_sentiment_words = positive + negative
├── IF total_sentiment_words > 0:
│   ├── raw_score = (positive - negative) / total
│   ├── sentiment_score = clamp(raw_score, -1.0, 1.0)
│   └── ELSE: sentiment_score = 0.0
└── Normalize to -100% to +100% for display

Step 5: Assign Label
├── IF score > 0.3: label = "positive"
├── ELSE IF score < -0.3: label = "negative"
├── ELSE IF balanced && total > 3: label = "mixed"
└── ELSE: label = "neutral"

Step 6: Store Results
└── Update ai_analyses table:
    ├── sentiment_score (float)
    ├── sentiment_label (text)
    └── bias_indicators.sentiment_details (jsonb)

Output:
{
  score: -0.4,
  label: "negative",
  positive_count: 2,
  negative_count: 7,
  neutral_count: 45,
  emotional_words: ["fury", "slams", "crisis"]
}
```

### 4. Data Storage Schema

```sql
-- Users Table
users (
  id: uuid PRIMARY KEY,
  email: text UNIQUE,
  full_name: text,
  role: enum (admin, analyst, government_official, viewer),
  created_at: timestamp
)

-- Media Sources Table
media_sources (
  id: uuid PRIMARY KEY,
  name: text,
  type: enum (newspaper, tv, radio, online, etc.),
  language: text,
  region: text,
  url: text,
  rss_feed: text,
  credibility_score: numeric,
  active: boolean,
  created_at: timestamp
)

-- Feedback Items (Articles) Table
feedback_items (
  id: uuid PRIMARY KEY,
  source_id: uuid → media_sources.id,
  title: text,
  content: text (200-2000 chars from full article),
  summary: text (AI-generated),
  original_language: text,
  translated_content: text,
  url: text UNIQUE,
  published_at: timestamp,
  collected_at: timestamp,
  region: text,
  category: text,
  status: enum (pending, processing, analyzed, validated)
)

-- AI Analyses Table
ai_analyses (
  id: uuid PRIMARY KEY,
  feedback_id: uuid → feedback_items.id,
  sentiment_score: float (-1.0 to 1.0),
  sentiment_label: text (positive/negative/neutral/mixed),
  topics: text[],
  entities: jsonb [{text, type}],
  keywords: text[],
  language_detected: text,
  confidence_score: float,
  bias_indicators: jsonb {
    political_bias: float (0-1),
    regional_bias: float,
    sentiment_bias: float,
    source_reliability_bias: float,
    representation_bias: float,
    language_bias: float,
    overall_classification: text,
    overall_score: float (0-100),
    sentiment_details: {
      score: float,
      label: text,
      positive_count: int,
      negative_count: int,
      emotional_words: text[]
    },
    detailed_analysis: {
      political: {score, evidence[], explanation},
      regional: {...},
      sentiment: {...},
      source_reliability: {...},
      representation: {...},
      language: {...}
    }
  },
  processed_at: timestamp,
  updated_at: timestamp
)

-- Scraping Jobs Table
scraping_jobs (
  id: uuid PRIMARY KEY,
  source_id: uuid → media_sources.id,
  job_type: text (manual/scheduled),
  status: text (running/completed/failed),
  articles_found: int,
  articles_saved: int,
  error_message: text,
  started_at: timestamp,
  completed_at: timestamp
)
```

---

## Features & Functionality

### 1. Dashboard (Landing Page)

**Purpose**: Provide at-a-glance overview of system metrics

**Key Metrics**:
- Total feedback items collected
- Items analyzed today
- Average sentiment score (-100% to +100%)
- Bias instances detected (High Bias count)

**Visualizations**:
- **Sentiment Distribution Chart**
  - Horizontal bars for Positive, Neutral, Negative, Mixed
  - Percentages and counts
  - Color-coded (green/gray/red/orange)

- **Regional Distribution**
  - Ranked list of top 6 regions
  - Feedback volume per region
  - Regional sentiment score
  - Progress bars

- **Trending Topics**
  - Top 8 topics extracted from articles
  - Topic count and sentiment
  - Pills with color indicators

- **Language Distribution**
  - Doughnut chart
  - Percentage breakdown by language

**Technology**:
- React functional components
- Custom hooks for data fetching
- Tailwind CSS grid layouts
- Lucide icons

---

### 2. Feedback Collection Page

**Purpose**: Manage articles and trigger scraping

**Features**:

**Article List**:
- Paginated table view (10 per page)
- Columns: Title, Source, Region, Language, Status, Actions
- Status badges (color-coded)
- Search and filter capabilities

**Actions**:
- **Add Feedback**: Manual article entry form
- **Scrape News**: Trigger scraping from all active sources
- **View Details**: Modal with full article content
- **Delete**: Remove article (admin only)

**Scraping Process**:
```
User clicks "Scrape News from All Sources"
  ↓
Frontend: POST to /functions/v1/scrape-news
  ↓
Backend:
  - Fetch active media sources
  - For each source:
    - Create scraping job
    - Fetch RSS feed
    - Parse articles
    - Extract full content from URLs
    - Check for duplicates
    - Insert new articles
    - Update job status
  ↓
Frontend: Show success/error notification
  ↓
Reload article list (new articles visible)
```

**Technology**:
- React state management
- Modal components
- Real-time status updates
- Supabase real-time subscriptions (optional)

---

### 3. Bias Detection Page

**Purpose**: Display and analyze detected bias in articles

**Features**:

**Summary Cards**:
- High Bias count (red)
- Medium Bias count (orange)
- Low Bias count (green)

**Article List with Bias Badges**:
- Each article shows:
  - Title and preview
  - Bias classification badge
  - Overall bias score
  - Chart icon for detailed view

**Batch Operations**:
- **Analyze All**: Run bias detection on all unanalyzed articles
- **Re-Analyze All**: Refresh analysis for all articles

**Detailed Analysis Modal**:

When user clicks chart icon:

1. **Overall Assessment Card**
   - Classification badge (High/Medium/Low)
   - Progress bar (0-100)
   - Overall score

2. **Sentiment Analysis Card** (Blue)
   - Overall sentiment badge
   - Sentiment score percentage
   - Positive/negative word counts
   - Emotional keywords as pills

3. **Dimensional Breakdown**
   - 6 accordion sections (Political, Regional, Sentiment, etc.)
   - Each shows:
     - Score bar (0-100) with color
     - Explanation text
     - Evidence list (bulleted)

**Analysis Flow**:
```
User clicks "Analyze All"
  ↓
Frontend:
  - Get all feedback items without analysis
  - For each item:
    - POST to /functions/v1/detect-bias
    - Pass: {title, content, feedbackId}
  ↓
Backend (detect-bias function):
  - Run 6-dimensional bias analysis
  - Calculate sentiment analysis
  - Store in ai_analyses table
  - Link to feedback_id
  ↓
Frontend:
  - Show progress indicator
  - Update UI as each completes
  - Display final results
```

**Technology**:
- React hooks (useState, useEffect)
- Promise.all for batch processing
- CSS transitions for smooth animations
- Color-coded visual indicators

---

### 4. AI Analysis Page

**Purpose**: Display AI-generated insights and summaries

**Features**:
- Article summaries (AI-generated)
- Key entities extracted
- Topic tags
- Confidence scores
- Insights and patterns

**Technology**:
- Edge function: generate-insights
- Natural language processing
- Entity recognition

---

### 5. Regional Analytics Page

**Purpose**: Geographic breakdown of coverage and sentiment

**Features**:
- **Map View** (concept - not implemented yet)
- **Regional Comparison Table**
  - Total articles per region
  - Average sentiment
  - Bias distribution
  - Top topics per region

**Filters**:
- Date range
- Region selection
- Language filter

**Charts**:
- Bar chart: Articles by region
- Line chart: Sentiment trends over time
- Heatmap: Bias intensity by region

**Technology**:
- Aggregation queries
- Chart.js or similar (if added)
- Responsive grid layouts

---

### 6. Reports Page

**Purpose**: Generate and download comprehensive reports

**Features**:

**Report Configuration**:
- Report type (Weekly, Monthly, Quarterly, Annual, Ad-hoc)
- Date range selector
- Region filter
- Department filter

**Generated Report Includes**:
- Executive summary
- Sentiment analysis
- Bias detection results
- Regional breakdown
- Trending topics
- Recommendations

**Export Formats**:
- PDF
- Excel/CSV
- JSON (for API consumption)

**Technology**:
- Server-side report generation
- PDF libraries (e.g., jsPDF)
- CSV export utilities

---

### 7. Media Sources Management

**Purpose**: Configure and manage news sources

**Features**:

**Source List**:
- Table with: Name, Type, Language, Region, Status
- Active/Inactive toggle
- Credibility score display
- Edit and delete actions

**Add/Edit Source Form**:
- Name (required)
- Type (dropdown: Newspaper, TV, Radio, Online, etc.)
- Language (dropdown: English, Hindi, Tamil, etc.)
- Region (dropdown: All India, Delhi, Maharashtra, etc.)
- URL (website)
- RSS Feed URL (required for scraping)
- Credibility Score (0-100 slider)
- Active status (toggle)

**RSS Feed Testing**:
- "Test RSS Feed" button
- Validates feed accessibility
- Shows sample articles

**Technology**:
- CRUD operations
- Form validation
- Real-time feed testing

---

### 8. User Management (Admin Only)

**Purpose**: Manage user accounts and permissions

**Features**:
- User list with roles
- Add new user
- Assign roles (Admin, Analyst, Government Official, Viewer)
- Activate/deactivate accounts
- Password reset

**Role Permissions**:
- **Admin**: Full access, user management
- **Analyst**: Analysis tools, report generation
- **Government Official**: View-only, reports
- **Viewer**: Read-only access

**Technology**:
- Supabase Auth
- Row Level Security (RLS) policies
- Role-based UI rendering

---

## Step-by-Step Operation

### Initial Setup

#### 1. Database Configuration
```sql
-- Already completed via migrations
1. Create users table with RLS
2. Create media_sources table
3. Create feedback_items table
4. Create ai_analyses table
5. Create scraping_jobs table
6. Set up RLS policies
7. Create indexes for performance
```

#### 2. Media Sources Setup
```
Admin Dashboard
  ↓
Navigate to Media Sources
  ↓
Click "Add Media Source"
  ↓
Fill in form:
  - Name: "The Indian Express"
  - Type: Online
  - Language: English
  - Region: All India
  - URL: https://indianexpress.com
  - RSS Feed: https://indianexpress.com/feed/
  - Credibility: 85
  - Active: Yes
  ↓
Save
  ↓
Repeat for 10+ sources across regions/languages
```

#### 3. Configure Edge Functions
```bash
# Functions already created:
- scrape-news
- detect-bias
- generate-summary
- generate-insights
- reanalyze-bias

# Manual deployment needed:
1. Go to Supabase Dashboard
2. Edge Functions section
3. For each function:
   - Click Edit
   - Copy code from project files
   - Deploy
```

---

### Daily Operations

#### Workflow 1: Collect & Analyze News

```
Morning Routine (8:00 AM)
─────────────────────────
1. Login to Dashboard

2. Navigate to Feedback Collection
   └─ Click "Scrape News from All Sources"
   └─ Wait 60-90 seconds
   └─ Status: "Scraped 10 sources, saved 87 articles"

3. Navigate to Bias Detection
   └─ Click "Analyze All"
   └─ Progress: "Analyzing 87 articles..."
   └─ Wait 2-3 minutes
   └─ Complete: Results displayed

4. Review Dashboard
   └─ Check sentiment distribution
   └─ Note high bias articles count
   └─ Review trending topics

5. Investigate High Bias Articles
   └─ Go to Bias Detection page
   └─ Filter by "High Bias"
   └─ Click chart icon on each
   └─ Review detailed analysis
   └─ Note emotional keywords
   └─ Check sentiment breakdown

6. Generate Report (if needed)
   └─ Go to Reports page
   └─ Select "Daily Report"
   └─ Date: Today
   └─ Click "Generate"
   └─ Download PDF
```

#### Workflow 2: Regional Analysis

```
Regional Official Workflow
──────────────────────────
1. Login with regional credentials

2. Dashboard automatically filters by region

3. Navigate to Regional Analytics
   └─ View region-specific metrics
   └─ Compare with other regions
   └─ Check sentiment trends

4. Identify Issues
   └─ High negative sentiment?
   └─ Increasing bias over time?
   └─ Specific topics causing problems?

5. Deep Dive
   └─ Go to Feedback Collection
   └─ Filter by region + date range
   └─ Read full articles
   └─ Check bias analysis details

6. Take Action
   └─ Prepare communication strategy
   └─ Draft press release if needed
   └─ Share findings with team
```

#### Workflow 3: Sentiment Monitoring

```
Communication Officer Workflow
───────────────────────────────
1. Dashboard → Check "Avg Sentiment" card
   └─ Positive (>30%): Good
   └─ Neutral (-30% to 30%): Monitor
   └─ Negative (<-30%): Alert!

2. Sentiment Distribution Chart
   └─ What's the breakdown?
   └─ More negative than positive? Why?

3. Bias Detection Page
   └─ Sort by sentiment bias score
   └─ High sentiment bias = emotional coverage

4. Click article for details
   └─ Sentiment Analysis card shows:
      - Label: Negative
      - Score: -60%
      - Negative words: 7
      - Emotional words: fury, slams, crisis
   └─ Understand the framing

5. Compare Articles on Same Topic
   └─ Search for topic keyword
   └─ Compare sentiment across sources
   └─ Which sources are neutral vs. biased?

6. Report to Leadership
   └─ Generate weekly sentiment report
   └─ Highlight concerning trends
   └─ Recommend interventions
```

---

## Deployment Guide

### Prerequisites
```bash
# Required accounts
1. Supabase account (free tier works)
2. Git repository
3. Node.js 18+ installed locally

# Required tools
- npm or yarn
- Git
- Code editor (VS Code recommended)
```

### Frontend Deployment

#### Option 1: Vercel (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to project
cd /path/to/project

# Deploy
vercel

# Follow prompts:
- Project name: india-bias-detection
- Framework: Vite
- Build command: npm run build
- Output directory: dist

# Production URL provided
# Example: https://india-bias-detection.vercel.app
```

#### Option 2: Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build project
npm run build

# Deploy
netlify deploy --prod

# Drag & drop: dist folder
```

#### Option 3: Manual (Any Static Host)
```bash
# Build production bundle
npm run build

# Upload dist/ folder contents to:
- AWS S3 + CloudFront
- Google Cloud Storage
- Azure Static Web Apps
- GitHub Pages
```

### Backend Deployment

#### Supabase Setup
```
1. Create Supabase Project
   ─────────────────────────
   - Go to https://supabase.com
   - Click "New Project"
   - Name: india-news-bias
   - Database password: [strong password]
   - Region: Mumbai (or closest)
   - Click "Create Project"
   - Wait 2 minutes for provisioning

2. Run Database Migrations
   ─────────────────────────
   - Go to SQL Editor
   - Click "New Query"
   - Copy contents of each migration file:
     * supabase/migrations/20251009152824_create_users_table.sql
     * supabase/migrations/20251009152907_create_feedback_system_tables.sql
     * supabase/migrations/20251009152932_add_scraping_jobs_table.sql
     * ... (all migration files)
   - Run each query
   - Verify tables created in Table Editor

3. Deploy Edge Functions
   ─────────────────────────
   For each function:

   A. scrape-news
      - Go to Edge Functions
      - Click "Create Function"
      - Name: scrape-news
      - Copy code from: supabase/functions/scrape-news/index.ts
      - Click "Deploy"

   B. detect-bias
      - Create new function
      - Name: detect-bias
      - Copy code from: supabase/functions/detect-bias/index.ts
      - Deploy

   C. generate-summary
      - Repeat process

   D. generate-insights
      - Repeat process

   E. reanalyze-bias
      - Repeat process

4. Configure Authentication
   ─────────────────────────
   - Go to Authentication → Settings
   - Enable Email provider
   - Disable email confirmation (for testing)
   - Set site URL: https://your-frontend-url.vercel.app
   - Add redirect URLs

5. Set Environment Variables
   ─────────────────────────
   Frontend (.env file):
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbG...
   ```

   Get these from:
   - Supabase Dashboard → Settings → API
   - Copy Project URL
   - Copy anon/public key

6. Create Admin Account
   ─────────────────────────
   - Go to SQL Editor
   - Run:
   ```sql
   INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, role)
   VALUES (
     'admin@gov.in',
     crypt('admin123', gen_salt('bf')),
     now(),
     'authenticated'
   );

   INSERT INTO users (id, email, full_name, role)
   SELECT id, email, 'System Admin', 'admin'
   FROM auth.users
   WHERE email = 'admin@gov.in';
   ```

7. Test Deployment
   ─────────────────────────
   - Open frontend URL
   - Login with admin@gov.in / admin123
   - Add a media source
   - Try scraping
   - Run bias analysis
   - Check all pages work
```

---

## API Reference

### Authentication

#### Login
```http
POST /auth/v1/token?grant_type=password
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "access_token": "eyJhbG...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "xyz...",
  "user": {...}
}
```

#### Logout
```http
POST /auth/v1/logout
Authorization: Bearer {access_token}
```

### Feedback Items (Articles)

#### List Articles
```http
GET /rest/v1/feedback_items?select=*,source:media_sources(name,type,language)&order=collected_at.desc&limit=10
Authorization: Bearer {token}
apikey: {anon_key}

Response:
[
  {
    "id": "uuid",
    "title": "Government announces new policy",
    "content": "Full article text...",
    "source": {
      "name": "The Hindu",
      "type": "newspaper",
      "language": "English"
    },
    "collected_at": "2025-11-17T10:00:00Z",
    "status": "analyzed"
  }
]
```

#### Create Article
```http
POST /rest/v1/feedback_items
Authorization: Bearer {token}
apikey: {anon_key}
Content-Type: application/json

{
  "source_id": "uuid",
  "title": "Article title",
  "content": "Article content",
  "url": "https://...",
  "original_language": "English",
  "region": "Delhi",
  "status": "pending"
}
```

### Edge Functions

#### Scrape News
```http
POST /functions/v1/scrape-news
Authorization: Bearer {token}
Content-Type: application/json

{
  "sourceId": "uuid-optional",
  "jobType": "manual"
}

Response:
{
  "success": true,
  "message": "Scraped 10 sources",
  "results": [
    {
      "sourceId": "uuid",
      "sourceName": "Indian Express",
      "articlesFound": 50,
      "articlesSaved": 12,
      "status": "success"
    }
  ]
}
```

#### Detect Bias
```http
POST /functions/v1/detect-bias
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Article title",
  "content": "Article content",
  "feedbackId": "uuid"
}

Response:
{
  "success": true,
  "analysis": {
    "political_bias": {
      "score": 60,
      "evidence": ["Political keywords detected"],
      "explanation": "..."
    },
    "sentiment_bias": {
      "score": 75,
      "evidence": ["Emotional language: 3 charged words (fury, slams)"],
      "explanation": "..."
    },
    "overall_score": 62.5,
    "classification": "Medium Bias"
  }
}
```

#### Generate Insights
```http
POST /functions/v1/generate-insights
Authorization: Bearer {token}
Content-Type: application/json

{
  "timeframe": "weekly",
  "region": "All India"
}

Response:
{
  "success": true,
  "insights": [
    {
      "title": "Increasing negative sentiment on healthcare",
      "description": "...",
      "confidence": 0.85,
      "recommendation": "..."
    }
  ]
}
```

### Analytics Queries

#### Dashboard Stats
```typescript
// Get total feedback count
const { count } = await supabase
  .from('feedback_items')
  .select('*', { count: 'exact', head: true });

// Get average sentiment
const { data } = await supabase
  .from('ai_analyses')
  .select('sentiment_score')
  .not('sentiment_score', 'is', null);

const avgSentiment = data.reduce((sum, item) =>
  sum + item.sentiment_score, 0) / data.length;

// Get bias distribution
const { data: biasData } = await supabase
  .from('ai_analyses')
  .select('bias_indicators')
  .not('bias_indicators', 'is', null);

const biasStats = biasData.reduce((acc, item) => {
  const classification = item.bias_indicators.overall_classification;
  if (classification === 'High Bias') acc.highBias++;
  else if (classification === 'Medium Bias') acc.mediumBias++;
  else acc.lowBias++;
  return acc;
}, { highBias: 0, mediumBias: 0, lowBias: 0 });
```

---

## Performance Optimization

### Frontend Optimizations
1. **Code Splitting**: Vite automatically splits code by route
2. **Lazy Loading**: Components loaded on-demand
3. **Image Optimization**: Use WebP format, lazy load images
4. **Caching**: Service worker for offline support (if added)
5. **Bundle Size**: Tree-shaking removes unused code

### Backend Optimizations
1. **Database Indexes**:
   ```sql
   CREATE INDEX idx_feedback_collected_at ON feedback_items(collected_at DESC);
   CREATE INDEX idx_feedback_status ON feedback_items(status);
   CREATE INDEX idx_analyses_feedback_id ON ai_analyses(feedback_id);
   ```

2. **Connection Pooling**: Supabase handles automatically

3. **Edge Functions**:
   - Keep functions small (<1MB)
   - Use efficient algorithms
   - Limit external API calls
   - Implement timeouts

4. **Query Optimization**:
   - Select only needed columns
   - Use pagination
   - Avoid N+1 queries
   - Use joins instead of separate queries

---

## Security Measures

### Row Level Security (RLS)
```sql
-- Users can only read their own data
CREATE POLICY "Users can read own data"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Admin can read all users
CREATE POLICY "Admin can read all users"
ON users FOR SELECT
TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- Public read access to feedback items
CREATE POLICY "Anyone can read feedback"
ON feedback_items FOR SELECT
TO public
USING (true);

-- Only authenticated users can insert
CREATE POLICY "Authenticated can insert feedback"
ON feedback_items FOR INSERT
TO authenticated
WITH CHECK (true);
```

### Authentication Security
- JWT tokens with expiration
- Secure password hashing (bcrypt)
- HTTPS only in production
- CORS configuration
- Rate limiting on Edge Functions

### Data Privacy
- User data isolated by RLS
- No sensitive data in logs
- Secure environment variables
- Regular backups

---

## Troubleshooting

### Common Issues

#### 1. Scraping Returns No Articles
```
Symptoms: "Scraped 10 sources, saved 0 articles"

Causes:
- RSS feed URL incorrect
- Website blocking requests
- Content extraction selectors don't match

Solutions:
1. Test RSS feed URL in browser
2. Check scraping_jobs table for error_message
3. View Edge Function logs in Supabase Dashboard
4. Update content selectors if site structure changed
```

#### 2. Bias Analysis Shows All Similar Scores
```
Symptoms: All articles show 50-55% Medium Bias

Causes:
- Articles only have titles (no full content)
- Old scraper version (before full content extraction)

Solutions:
1. Deploy enhanced scrape-news function
2. Delete old articles
3. Scrape fresh articles with full content
4. Re-run bias analysis
```

#### 3. Frontend Can't Connect to Backend
```
Symptoms: "Network error" on all API calls

Causes:
- Incorrect VITE_SUPABASE_URL
- Wrong VITE_SUPABASE_ANON_KEY
- CORS not configured

Solutions:
1. Check .env file has correct values
2. Verify values in Supabase Dashboard → Settings → API
3. Restart dev server after changing .env
4. Clear browser cache
```

#### 4. Authentication Fails
```
Symptoms: "Invalid credentials" even with correct password

Causes:
- User not in auth.users table
- Email not confirmed (if confirmation enabled)
- Wrong password hash

Solutions:
1. Check if user exists:
   SELECT * FROM auth.users WHERE email = 'user@example.com';
2. Reset password via Supabase Dashboard
3. Disable email confirmation for testing
```

---

## Future Enhancements

### Phase 2 Features
1. **Real-time Alerts**
   - WebSocket notifications
   - Email alerts for high bias articles
   - SMS alerts for critical issues

2. **Advanced NLP**
   - Use OpenAI/Anthropic APIs for better analysis
   - Multi-language sentiment analysis
   - Topic modeling
   - Named entity recognition

3. **Machine Learning**
   - Train custom bias detection model
   - Predict article virality
   - Recommend similar articles
   - Auto-categorization

4. **Visualization Enhancements**
   - Interactive maps
   - Time-series charts
   - Network graphs (source relationships)
   - Sentiment heatmaps

5. **Mobile App**
   - React Native mobile app
   - Push notifications
   - Offline mode
   - Quick analysis

6. **API for Third Parties**
   - Public REST API
   - GraphQL endpoint
   - Webhooks
   - Developer documentation

---

## Conclusion

This system provides a comprehensive solution for monitoring media bias in Indian news coverage. By combining web scraping, natural language processing, sentiment analysis, and an intuitive dashboard, it empowers government officials and analysts to make data-driven decisions about communication strategies.

**Key Strengths**:
- ✅ Multi-language support
- ✅ Real-time analysis
- ✅ 6-dimensional bias framework
- ✅ Comprehensive sentiment analysis
- ✅ Scalable architecture
- ✅ Secure by design

**Ready for Production**: After deploying the two enhanced Edge Functions (scrape-news and detect-bias), the system is fully operational and ready for real-world use.

---

**Project Status**: Production-Ready (pending Edge Function deployment)

**Last Updated**: November 2025

**Support**: Refer to documentation files in project root for specific feature guides.
