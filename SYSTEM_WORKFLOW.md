# System Workflow Visualization

## Complete System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USERS & AUTHENTICATION                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────┐    ┌─────────┐    ┌──────────────┐    ┌────────┐          │
│   │  Admin  │    │ Analyst │    │  Gov Official│    │ Viewer │          │
│   └────┬────┘    └────┬────┘    └──────┬───────┘    └───┬────┘          │
│        │              │                 │                 │               │
│        └──────────────┴─────────────────┴─────────────────┘               │
│                              │                                             │
│                              │ Login (Email + Password)                    │
│                              ▼                                             │
│                    ┌─────────────────┐                                     │
│                    │ Supabase Auth   │                                     │
│                    │ (JWT Tokens)    │                                     │
│                    └─────────────────┘                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                               │
                               │ Authenticated
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          REACT FRONTEND (SPA)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Dashboard   │  │  Feedback    │  │     Bias     │  │      AI      │  │
│  │   (Home)     │  │  Collection  │  │  Detection   │  │   Analysis   │  │
│  │              │  │              │  │              │  │              │  │
│  │ • Stats      │  │ • Articles   │  │ • Results    │  │ • Insights   │  │
│  │ • Charts     │  │ • Scraping   │  │ • Analysis   │  │ • Summaries  │  │
│  │ • Overview   │  │ • CRUD       │  │ • Details    │  │ • Patterns   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Regional    │  │   Reports    │  │    Media     │  │     User     │  │
│  │  Analytics   │  │              │  │   Sources    │  │  Management  │  │
│  │              │  │              │  │              │  │              │  │
│  │ • By Region  │  │ • Generate   │  │ • Configure  │  │ • Roles      │  │
│  │ • Compare    │  │ • Export     │  │ • RSS Feeds  │  │ • Permissions│  │
│  │ • Trends     │  │ • Schedule   │  │ • Test       │  │ • Admin      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                                             │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                │ API Calls (HTTPS)
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE BACKEND                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                    PostgreSQL Database                              │  │
│  │  ┌────────────┐  ┌──────────────┐  ┌─────────────┐  ┌───────────┐ │  │
│  │  │   users    │  │media_sources │  │  feedback   │  │    ai     │ │  │
│  │  │            │  │              │  │   _items    │  │ _analyses │ │  │
│  │  │ • id       │  │ • name       │  │ • title     │  │ • sent.   │ │  │
│  │  │ • email    │  │ • rss_feed   │  │ • content   │  │ • bias    │ │  │
│  │  │ • role     │  │ • language   │  │ • url       │  │ • topics  │ │  │
│  │  └────────────┘  └──────────────┘  └─────────────┘  └───────────┘ │  │
│  │                                                                     │  │
│  │  ┌────────────────────┐  ┌──────────────────────┐                 │  │
│  │  │  scraping_jobs     │  │  bias_validations    │                 │  │
│  │  │                    │  │                      │                 │  │
│  │  │ • status           │  │ • validator_id       │                 │  │
│  │  │ • articles_saved   │  │ • bias_type          │                 │  │
│  │  └────────────────────┘  └──────────────────────┘                 │  │
│  │                                                                     │  │
│  │  Row Level Security (RLS): ✓ Enabled on all tables                │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                   Edge Functions (Deno Runtime)                     │  │
│  │                                                                     │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │  │
│  │  │  scrape-news     │  │  detect-bias     │  │ generate-summary│ │  │
│  │  │                  │  │                  │  │                 │ │  │
│  │  │ 1. Fetch RSS     │  │ 1. Text analysis │  │ 1. Extract key  │ │  │
│  │  │ 2. Parse XML     │  │ 2. 6 dimensions  │  │    points       │ │  │
│  │  │ 3. Get full text │  │ 3. Sentiment     │  │ 2. Generate     │ │  │
│  │  │ 4. Save articles │  │ 4. Store results │  │    summary      │ │  │
│  │  └──────────────────┘  └──────────────────┘  └─────────────────┘ │  │
│  │                                                                     │  │
│  │  ┌─────────────────────┐  ┌──────────────────┐                    │  │
│  │  │ generate-insights   │  │  reanalyze-bias  │                    │  │
│  │  │                     │  │                  │                    │  │
│  │  │ 1. Analyze patterns │  │ 1. Get all items │                    │  │
│  │  │ 2. Find trends      │  │ 2. Batch analyze │                    │  │
│  │  │ 3. Create insights  │  │ 3. Update DB     │                    │  │
│  │  └─────────────────────┘  └──────────────────┘                    │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                │ HTTP Requests
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL DATA SOURCES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Indian       │  │  The Hindu   │  │ Times of     │  │    NDTV      │  │
│  │ Express      │  │              │  │ India        │  │              │  │
│  │              │  │              │  │              │  │              │  │
│  │ RSS Feed ────┼──┼─ RSS Feed ───┼──┼─ RSS Feed ───┼──┼─ RSS Feed    │  │
│  │ HTML Pages   │  │ HTML Pages   │  │ HTML Pages   │  │ HTML Pages   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Deccan       │  │ The News     │  │ Regional     │  │    More      │  │
│  │ Herald       │  │ Minute       │  │ Sources      │  │  Sources     │  │
│  │              │  │              │  │ (Hindi, etc.)│  │              │  │
│  │ RSS Feed     │  │ RSS Feed     │  │ RSS Feeds    │  │ RSS Feeds    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Content Collection Flow (Detailed)

```
USER ACTION: Click "Scrape News from All Sources"
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend: Send POST to /functions/v1/scrape-news       │
│ Body: { jobType: "manual" }                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Edge Function: scrape-news                             │
│                                                         │
│ Step 1: Get Active Sources                             │
│   SELECT * FROM media_sources                          │
│   WHERE active = true AND rss_feed IS NOT NULL         │
│   Result: [10 sources]                                 │
│                                                         │
│ Step 2: For Each Source                                │
│   ┌─────────────────────────────────────────────────┐ │
│   │ 2a. Create Job Record                           │ │
│   │   INSERT INTO scraping_jobs (status='running')  │ │
│   │                                                  │ │
│   │ 2b. Fetch RSS Feed                             │ │
│   │   HTTP GET: source.rss_feed                     │ │
│   │   Result: XML string                            │ │
│   │                                                  │ │
│   │ 2c. Parse XML                                   │ │
│   │   DOMParser.parseFromString(xml, 'text/xml')   │ │
│   │   querySelectorAll('item')                      │ │
│   │   Result: [50 items]                            │ │
│   │                                                  │ │
│   │ 2d. For Each Item (limit 10)                   │ │
│   │   ┌────────────────────────────────────────┐   │ │
│   │   │ Extract:                               │   │ │
│   │   │   - title (from <title>)              │   │ │
│   │   │   - url (from <link>)                 │   │ │
│   │   │   - description (from <description>)  │   │ │
│   │   │   - pubDate (from <pubDate>)          │   │ │
│   │   │                                        │   │ │
│   │   │ Check Content Length:                  │   │ │
│   │   │   IF description.length < 100 THEN:    │   │ │
│   │   │   ┌──────────────────────────────────┐│   │ │
│   │   │   │ Fetch Full Article               ││   │ │
│   │   │   │ HTTP GET: url                    ││   │ │
│   │   │   │ Parse HTML with linkedom         ││   │ │
│   │   │   │ Extract using selectors:         ││   │ │
│   │   │   │   - <article>                    ││   │ │
│   │   │   │   - .article-content             ││   │ │
│   │   │   │   - .post-content                ││   │ │
│   │   │   │   - [itemprop="articleBody"]     ││   │ │
│   │   │   │   - Fallback: all <p> tags       ││   │ │
│   │   │   │ Clean: remove scripts, styles    ││   │ │
│   │   │   │ Limit to 2000 characters         ││   │ │
│   │   │   │ Result: Full article text        ││   │ │
│   │   │   └──────────────────────────────────┘│   │ │
│   │   │                                        │   │ │
│   │   │ Check for Duplicates:                 │   │ │
│   │   │   SELECT id FROM feedback_items       │   │ │
│   │   │   WHERE url = article.url             │   │ │
│   │   │   IF exists: SKIP                     │   │ │
│   │   │                                        │   │ │
│   │   │ Insert Article:                       │   │ │
│   │   │   INSERT INTO feedback_items (        │   │ │
│   │   │     title, content, url,              │   │ │
│   │   │     source_id, language, region,      │   │ │
│   │   │     status='processing'               │   │ │
│   │   │   )                                    │   │ │
│   │   └────────────────────────────────────────┘   │ │
│   │                                                  │ │
│   │ 2e. Update Job Status                           │ │
│   │   UPDATE scraping_jobs                          │ │
│   │   SET status='completed',                       │ │
│   │       articles_found=50,                        │ │
│   │       articles_saved=12                         │ │
│   └─────────────────────────────────────────────────┘ │
│                                                         │
│ Step 3: Return Results                                 │
│   {                                                     │
│     success: true,                                      │
│     message: "Scraped 10 sources",                     │
│     results: [                                          │
│       { sourceName, articlesFound, articlesSaved }     │
│     ]                                                   │
│   }                                                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend: Display Success                              │
│ Notification: "Scraped 10 sources, saved 87 articles" │
│ Reload article list                                    │
└─────────────────────────────────────────────────────────┘
```

---

## Bias Detection Flow (Detailed)

```
USER ACTION: Click "Analyze All" on Bias Detection page
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend: Get Unanalyzed Articles                      │
│ SELECT * FROM feedback_items WHERE status='processing' │
│ Result: [87 articles]                                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend: For Each Article                             │
│ POST to /functions/v1/detect-bias                      │
│ Body: { title, content, feedbackId }                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Edge Function: detect-bias                                              │
│                                                                          │
│ Step 1: Text Preprocessing                                              │
│   fullText = title + " " + content                                      │
│   lowerText = fullText.toLowerCase()                                    │
│   textLength = fullText.length                                          │
│   lengthMultiplier = textLength > 800 ? 1.2 : 1.1 : 1.0                │
│                                                                          │
│ Step 2: Analyze Political Bias                                          │
│   baseScore = 50                                                         │
│   keywords = ['government', 'minister', 'party', 'politics', 'election']│
│   IF any keyword found: score += 10                                     │
│   Apply lengthMultiplier                                                │
│   Result: { score: 60, evidence: [...], explanation: "..." }           │
│                                                                          │
│ Step 3: Analyze Regional Bias                                           │
│   baseScore = 50                                                         │
│   keywords = ['delhi', 'mumbai', 'state', 'city', 'region']            │
│   IF any keyword found: score += 10                                     │
│   Result: { score: 60, evidence: [...] }                               │
│                                                                          │
│ Step 4: Analyze Sentiment Bias ⭐ ENHANCED                              │
│   baseScore = 20                                                         │
│   emotionalWords = ['fury', 'outrage', 'slams', ... (38 words)]        │
│   positiveWords = ['good', 'great', 'success', ... (21 words)]         │
│   negativeWords = ['bad', 'poor', 'failure', ... (21 words)]           │
│                                                                          │
│   Count emotional words:                                                │
│     FOR EACH word IN emotionalWords:                                    │
│       IF text.includes(word): emotionalCount++, score += 15             │
│                                                                          │
│   Count sentiment words:                                                │
│     positiveCount = count matches in positiveWords                      │
│     negativeCount = count matches in negativeWords                      │
│     imbalance = |positiveCount - negativeCount|                         │
│     IF imbalance > 3: score += imbalance * 5                            │
│                                                                          │
│   Check opinionated phrases:                                            │
│     phrases = ['should', 'must', 'obviously', 'clearly', ...]          │
│     IF count > 2: score += count * 5                                    │
│                                                                          │
│   Check sensationalism:                                                 │
│     exclamations = count '!' in text                                    │
│     IF exclamations > 2: score += exclamations * 5                      │
│     allCaps = count words in ALL CAPS                                   │
│     IF allCaps > 0: score += allCaps * 10                               │
│                                                                          │
│   Check headline:                                                       │
│     IF title contains emotional words: score += 10                      │
│                                                                          │
│   Result: { score: 75, evidence: ["Emotional language: fury, slams"]}  │
│                                                                          │
│ Step 5: Analyze Source Reliability                                      │
│   baseScore = 60                                                         │
│   Result: { score: 60, evidence: [...] }                               │
│                                                                          │
│ Step 6: Analyze Representation Bias                                     │
│   baseScore = 50                                                         │
│   Result: { score: 50, evidence: [...] }                               │
│                                                                          │
│ Step 7: Analyze Language Bias                                           │
│   baseScore = 45                                                         │
│   Result: { score: 45, evidence: [...] }                               │
│                                                                          │
│ Step 8: Calculate Overall Score                                         │
│   overallScore = (60 + 60 + 75 + 60 + 50 + 45) / 6 = 58.3             │
│   classification = overallScore >= 65 ? 'High Bias' :                  │
│                    overallScore >= 45 ? 'Medium Bias' : 'Low Bias'     │
│   Result: "Medium Bias"                                                 │
│                                                                          │
│ Step 9: Perform Sentiment Analysis                                      │
│   Count positive/negative/emotional words                               │
│   sentimentScore = (positive - negative) / total                        │
│   Normalize to -1.0 to +1.0                                             │
│   sentimentLabel = score > 0.3 ? 'positive' :                          │
│                    score < -0.3 ? 'negative' :                          │
│                    'neutral' or 'mixed'                                 │
│   Result: { score: -0.4, label: 'negative', emotional_words: [...] }  │
│                                                                          │
│ Step 10: Store in Database                                              │
│   UPDATE ai_analyses SET                                                │
│     sentiment_score = -0.4,                                             │
│     sentiment_label = 'negative',                                       │
│     bias_indicators = {                                                 │
│       political_bias: 0.60,                                             │
│       sentiment_bias: 0.75,                                             │
│       overall_score: 58.3,                                              │
│       overall_classification: 'Medium Bias',                            │
│       sentiment_details: {                                              │
│         score: -0.4,                                                    │
│         label: 'negative',                                              │
│         positive_count: 2,                                              │
│         negative_count: 7,                                              │
│         emotional_words: ['fury', 'slams', 'crisis']                   │
│       },                                                                │
│       detailed_analysis: { ... }                                        │
│     }                                                                   │
│   WHERE feedback_id = feedbackId                                        │
│                                                                          │
│ Step 11: Update Article Status                                          │
│   UPDATE feedback_items SET status='analyzed'                           │
│   WHERE id = feedbackId                                                 │
└────────────────────┬─────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend: Update Progress                              │
│ "Analyzed 1/87 articles..."                            │
│ Repeat for all articles                                │
│ Final: "Analysis complete! View results."              │
└─────────────────────────────────────────────────────────┘
```

---

## UI Display Flow

```
USER ACTION: Click chart icon on article
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ BiasDetailModal Opens                                   │
│                                                         │
│ Step 1: Load Data                                       │
│   feedback = selected article                           │
│   analysis = ai_analyses WHERE feedback_id = article.id│
│                                                         │
│ Step 2: Display Overall Assessment                      │
│   ┌──────────────────────────────────────────────┐    │
│   │ Overall Assessment                           │    │
│   │ Badge: "Medium Bias" (orange)                │    │
│   │ Progress Bar: 58/100                         │    │
│   └──────────────────────────────────────────────┘    │
│                                                         │
│ Step 3: Display Sentiment Analysis ⭐ NEW              │
│   ┌──────────────────────────────────────────────┐    │
│   │ Sentiment Analysis (blue card)               │    │
│   │                                              │    │
│   │ Overall Sentiment: [Negative] (red badge)    │    │
│   │ Sentiment Score: -40%                        │    │
│   │ Positive Words: 2                            │    │
│   │ Negative Words: 7                            │    │
│   │                                              │    │
│   │ Emotional Keywords:                          │    │
│   │ [fury] [slams] [crisis]                      │    │
│   └──────────────────────────────────────────────┘    │
│                                                         │
│ Step 4: Display Dimensional Breakdown                   │
│   For each of 6 dimensions:                            │
│   ┌──────────────────────────────────────────────┐    │
│   │ Political Bias: 60/100                       │    │
│   │ [████████████████████░░░░░░░░░░] (red)      │    │
│   │                                              │    │
│   │ Explanation: ...                             │    │
│   │ Evidence:                                     │    │
│   │ • Political keywords detected                │    │
│   │ • Government, minister, party mentioned      │    │
│   └──────────────────────────────────────────────┘    │
│                                                         │
│   ┌──────────────────────────────────────────────┐    │
│   │ Sentiment Bias: 75/100                       │    │
│   │ [█████████████████████████████░] (yellow)   │    │
│   │                                              │    │
│   │ Explanation: Emotional language detected     │    │
│   │ Evidence:                                     │    │
│   │ • Emotional language: 3 charged words        │    │
│   │ • Strong sentiment imbalance: 7 negative     │    │
│   │ • Opinionated language detected              │    │
│   └──────────────────────────────────────────────┘    │
│                                                         │
│   [... other 4 dimensions ...]                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Data Relationships

```
users (1) ──────────────────┐
                            │
                            │ created_by
                            │
                            ▼
                    ┌───────────────┐
                    │    reports    │
                    └───────────────┘

media_sources (1) ──────────┬───────────────────────┐
                            │                       │
                            │ source_id             │
                            │                       │
                            ▼                       ▼
                    ┌──────────────┐        ┌──────────────┐
                    │  feedback    │        │  scraping    │
                    │  _items      │        │  _jobs       │
                    └───────┬──────┘        └──────────────┘
                            │
                            │ feedback_id
                            │
                            ▼
                    ┌──────────────┐
                    │     ai       │
                    │  _analyses   │──┐
                    └──────┬───────┘  │
                           │          │ analysis_id
                           │          │
        ┌──────────────────┘          ▼
        │                     ┌──────────────┐
        │ topics              │    bias      │
        │ entities            │ _validations │
        │ keywords            └──────────────┘
        │ sentiment_score
        │ sentiment_label
        │ bias_indicators:
        │   - political_bias
        │   - regional_bias
        │   - sentiment_bias
        │   - source_reliability
        │   - representation_bias
        │   - language_bias
        │   - overall_score
        │   - sentiment_details:
        │       * score
        │       * label
        │       * positive_count
        │       * negative_count
        │       * emotional_words[]
        └─────────────────────
```

---

## Technology Stack Detail

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND STACK                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  React 18.3.1                                          │
│    ├─ Component-based UI                               │
│    ├─ Hooks (useState, useEffect, useContext)          │
│    ├─ Virtual DOM                                      │
│    └─ JSX syntax                                       │
│                                                         │
│  TypeScript 5.5.3                                      │
│    ├─ Static type checking                             │
│    ├─ Interfaces & Types                               │
│    ├─ IDE autocompletion                               │
│    └─ Compile-time error detection                     │
│                                                         │
│  Tailwind CSS 3.4.1                                    │
│    ├─ Utility-first classes                            │
│    ├─ Responsive design                                │
│    ├─ Custom color palette                             │
│    └─ JIT compilation                                  │
│                                                         │
│  Vite 5.4.2                                            │
│    ├─ Fast HMR (Hot Module Replacement)                │
│    ├─ ES modules                                       │
│    ├─ Optimized builds                                 │
│    └─ Plugin system                                    │
│                                                         │
│  Lucide React 0.344.0                                  │
│    ├─ 1000+ SVG icons                                  │
│    ├─ Tree-shakeable                                   │
│    └─ Customizable                                     │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    BACKEND STACK                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Supabase                                              │
│    ├─ PostgreSQL 15.x                                  │
│    │   ├─ Relational database                          │
│    │   ├─ JSONB columns                                │
│    │   ├─ Full-text search                             │
│    │   └─ Triggers & functions                         │
│    │                                                    │
│    ├─ Row Level Security (RLS)                         │
│    │   ├─ Table-level policies                         │
│    │   ├─ Role-based access                            │
│    │   └─ User isolation                               │
│    │                                                    │
│    ├─ Auth                                             │
│    │   ├─ JWT tokens                                   │
│    │   ├─ Email/password                               │
│    │   ├─ Session management                           │
│    │   └─ Password reset                               │
│    │                                                    │
│    ├─ Edge Functions                                   │
│    │   ├─ Deno runtime                                 │
│    │   ├─ TypeScript native                            │
│    │   ├─ Global deployment                            │
│    │   └─ Auto-scaling                                 │
│    │                                                    │
│    └─ Storage (optional)                               │
│        ├─ File uploads                                 │
│        ├─ Image optimization                           │
│        └─ CDN delivery                                 │
│                                                         │
│  linkedom 0.18.0                                       │
│    ├─ DOM parsing in Deno                              │
│    ├─ querySelector support                            │
│    ├─ HTML manipulation                                │
│    └─ Memory efficient                                 │
│                                                         │
│  @supabase/supabase-js 2.57.4                         │
│    ├─ Official client library                          │
│    ├─ Type generation                                  │
│    ├─ Real-time subscriptions                          │
│    └─ Auto-reconnection                                │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                 DEVELOPMENT TOOLS                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ESLint 9.9.1 - Code quality & linting                 │
│  PostCSS 8.4.35 - CSS transformations                  │
│  Autoprefixer 10.4.18 - Browser compatibility          │
│  Git - Version control                                 │
│  npm - Package management                              │
│  VS Code - Recommended IDE                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

This comprehensive visualization shows exactly how the entire system works, from user actions to data storage to analysis algorithms!
