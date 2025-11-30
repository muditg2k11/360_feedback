# Bias Detection Not Working - Fix Guide

## 🔴 Problem Identified

**Issue**: 103 articles marked as "analyzed" but have NO actual bias analysis

**Database State**:
```
Total articles: 454
- With analysis: 351 ✅
- Without analysis: 103 ❌ (marked "analyzed" but no data)
```

**Root Cause**: The Edge Functions (`detect-bias`, `scrape-news`, `analyze-pending`) exist in your local code but **are NOT deployed to Supabase**. When you scrape articles, they're saved but never analyzed because the functions aren't running.

---

## ✅ Immediate Fix Applied

I've already fixed the database by resetting status:

```sql
-- Reset articles without analysis back to 'processing'
UPDATE feedback_items
SET status = 'processing'
WHERE status = 'analyzed'
  AND id NOT IN (SELECT feedback_id FROM ai_analyses);
```

**Current State**:
- 351 properly analyzed ✅
- 103 ready to be analyzed (status: "processing")

---

## 🚀 CRITICAL: Deploy Edge Functions

### Why Bias Detection Isn't Working

The functions exist in your code files but they need to be **deployed to Supabase** to actually run!

### Step-by-Step Deployment

#### Method 1: Deploy via Supabase Dashboard (Recommended)

**1. Deploy detect-bias Function**

```bash
# Location: /project/supabase/functions/detect-bias/index.ts
```

Steps:
1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Edge Functions** (left sidebar)
4. Click **"New Function"** or find existing `detect-bias`
5. Copy the entire contents of `/supabase/functions/detect-bias/index.ts`
6. Paste into the editor
7. Click **Deploy**
8. Wait for "Deployed successfully" message

**2. Deploy scrape-news Function**

```bash
# Location: /project/supabase/functions/scrape-news/index.ts
```

Steps:
1. In Edge Functions, find `scrape-news`
2. Copy contents of `/supabase/functions/scrape-news/index.ts`
3. Paste and Deploy

**3. Deploy analyze-pending Function**

```bash
# Location: /project/supabase/functions/analyze-pending/index.ts
```

Steps:
1. In Edge Functions, click **"New Function"**
2. Name: `analyze-pending`
3. Copy contents of `/supabase/functions/analyze-pending/index.ts`
4. Paste and Deploy

---

#### Method 2: Deploy via Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all functions
supabase functions deploy detect-bias
supabase functions deploy scrape-news
supabase functions deploy analyze-pending

# Or deploy all at once
supabase functions deploy
```

---

## ✅ After Deployment - Analyze the 103 Articles

Once functions are deployed, you have 2 options:

### Option A: Use UI Button (Easiest)

1. Open your application
2. Go to **Bias Detection** page
3. Click **"Analyze Pending"** button (green button)
4. Wait ~2 minutes (103 articles × 1 second each)
5. See success message: "Successfully analyzed 103 articles!"

### Option B: Call Function Directly

Using curl or Postman:

```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/analyze-pending' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

---

## 🔍 Verify It's Working

### Test 1: Check Function Logs

1. Go to Supabase Dashboard → Edge Functions
2. Click on `detect-bias`
3. Go to **Logs** tab
4. You should see:
```
Upserting analysis for feedback_id: abc-123
Updating feedback status to analyzed
✓ Analysis completed
```

### Test 2: Check Database

```sql
-- Should show 454 analyzed, 0 processing
SELECT status, COUNT(*)
FROM feedback_items
GROUP BY status;

-- Should show 454 analyses
SELECT COUNT(*) FROM ai_analyses;

-- Should show 0 (no articles without analysis)
SELECT COUNT(*)
FROM feedback_items fi
LEFT JOIN ai_analyses aa ON fi.id = aa.feedback_id
WHERE aa.id IS NULL;
```

### Test 3: Test in UI

1. Go to **Bias Detection** page
2. Should see 454 articles with bias scores
3. Click on any article
4. Should see:
   - Sentiment score (blue card)
   - 6 bias dimensions with scores
   - Emotional keywords as pills
   - Overall classification

---

## 🎯 Expected Results After Fix

### Before (Current State)
```
Articles in database: 454
- Properly analyzed: 351
- Missing analysis: 103
- Status "processing": 103
```

### After (Target State)
```
Articles in database: 454
- Properly analyzed: 454 ✅
- Missing analysis: 0 ✅
- Status "analyzed": 454 ✅
```

### UI Changes
```
Before:
- Bias Detection shows 351 articles
- 103 articles invisible (no analysis)
- No bias scores for 103 articles

After:
- Bias Detection shows all 454 articles
- All articles have bias scores
- All articles have sentiment analysis
- Charts and stats include all data
```

---

## 🔄 Test Scraping After Fix

To verify auto-analysis works:

1. Go to **Feedback Collection** page
2. Click **"Scrape News from All Sources"**
3. Wait 60-90 seconds
4. Check console logs - should see:
   ```
   Analyzing 5 newly scraped articles...
   ✓ Analyzed: Article title 1...
   ✓ Analyzed: Article title 2...
   ```
5. Go to **Bias Detection**
6. New articles should appear with bias scores immediately

---

## ⚠️ Common Issues

### Issue 1: "Analyze Pending" button does nothing

**Cause**: `analyze-pending` function not deployed

**Fix**:
1. Check Supabase Dashboard → Edge Functions
2. Verify `analyze-pending` is listed
3. If not, deploy it (see deployment steps above)

### Issue 2: Articles still no bias scores after clicking button

**Cause**: `detect-bias` function not deployed or has errors

**Fix**:
1. Check Edge Functions logs for errors
2. Redeploy `detect-bias` function
3. Check that database unique constraint on `feedback_id` exists:
   ```sql
   -- Should exist:
   CREATE UNIQUE INDEX ai_analyses_feedback_id_key
   ON ai_analyses(feedback_id);
   ```

### Issue 3: New scraped articles not auto-analyzed

**Cause**: `scrape-news` function not deployed with latest code

**Fix**:
1. Redeploy `scrape-news` with updated code
2. Verify logs show "Analyzing X newly scraped articles..."

---

## 📊 Monitoring Dashboard

### Key Queries to Monitor Health

```sql
-- 1. Analysis coverage
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'analyzed' THEN 1 END) as analyzed,
  COUNT(CASE WHEN status = 'processing' THEN 1 END) as pending,
  ROUND(100.0 * COUNT(CASE WHEN status = 'analyzed' THEN 1 END) / COUNT(*), 2) as coverage_percent
FROM feedback_items;

-- 2. Articles without analysis (should be 0)
SELECT COUNT(*)
FROM feedback_items fi
LEFT JOIN ai_analyses aa ON fi.id = aa.feedback_id
WHERE aa.id IS NULL;

-- 3. Average sentiment by source
SELECT
  ms.name,
  COUNT(*) as articles,
  ROUND(AVG(aa.sentiment_score)::numeric, 3) as avg_sentiment,
  ROUND(AVG((aa.bias_indicators->>'overall_score')::float)::numeric, 1) as avg_bias
FROM feedback_items fi
JOIN media_sources ms ON fi.source_id = ms.id
JOIN ai_analyses aa ON fi.id = aa.feedback_id
GROUP BY ms.name
ORDER BY articles DESC;

-- 4. Recent scraping jobs
SELECT
  ms.name,
  sj.status,
  sj.articles_found,
  sj.articles_saved,
  sj.started_at,
  sj.completed_at
FROM scraping_jobs sj
JOIN media_sources ms ON sj.source_id = ms.id
ORDER BY sj.started_at DESC
LIMIT 10;
```

---

## 🎯 Success Checklist

After following this guide, verify:

- [ ] All 3 Edge Functions deployed to Supabase
- [ ] `detect-bias` logs show successful upserts
- [ ] All 454 articles have status "analyzed"
- [ ] All 454 articles have records in `ai_analyses` table
- [ ] UI shows bias scores for all articles
- [ ] Sentiment cards display correctly
- [ ] New scraped articles auto-analyze
- [ ] "Analyze Pending" button works for future issues

---

## 📝 Summary

**The Problem**: Functions exist in code but not deployed to Supabase

**The Solution**:
1. ✅ Reset 103 articles to "processing" (already done)
2. 🔴 Deploy 3 Edge Functions to Supabase (YOU NEED TO DO THIS)
3. ✅ Click "Analyze Pending" to analyze the 103 articles
4. ✅ Verify all 454 articles have bias analysis

**Time Required**:
- Deploy functions: 10 minutes
- Analyze 103 articles: 2 minutes
- Verify: 2 minutes
- **Total: ~15 minutes**

**After this fix**: Your bias detection will work automatically for all new and existing articles! 🎉
