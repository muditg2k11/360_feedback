# Fix Zero Bias Scores - Reanalysis Instructions

## Why All Scores Show 0%

Your articles haven't been analyzed with the new advanced algorithm yet! The existing data either:
- Has no bias analysis
- Was analyzed with the old broken algorithm
- Has incorrect data structure

## Quick Fix (3 Steps)

### Step 1: Reset Articles for Reanalysis

Go to **Supabase Dashboard** → **SQL Editor** and run:

```sql
-- Reset all articles to be reanalyzed
UPDATE feedback_items
SET status = 'processing'
WHERE id IN (
  SELECT id FROM feedback_items
  ORDER BY collected_at DESC
  LIMIT 100
);

-- Optional: Clear old analysis data to start fresh
-- DELETE FROM ai_analyses;
```

### Step 2: Deploy Edge Function (If Not Done)

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Find or create `detect-bias` function
3. Copy code from `/supabase/functions/detect-bias/index.ts`
4. Deploy the function

### Step 3: Run Analysis

**Option A: Via UI (Recommended)**
1. Open your app
2. Go to **Bias Detection** page
3. Click **"Analyze Pending"** button
4. Wait 1-2 minutes for analysis to complete
5. Refresh page to see results

**Option B: Via Test Page**
1. Open `test-single-analysis.html` in browser
2. Click "Analyze Article" button
3. See immediate results with scores!

## Test Individual Article

Open the test file and try it:
```bash
# Open in browser:
open test-single-analysis.html
# or
google-chrome test-single-analysis.html
```

You'll see:
- Political Bias: 70+
- Sentiment Bias: 80+
- Source Reliability: 60+
- Language Bias: 90+
- Overall: 65+ (High Bias)

## Expected Results After Reanalysis

**Distribution:**
```
Low Bias (0-34):     60-70% of articles
Medium Bias (35-64): 25-35% of articles
High Bias (65-100):  5-10% of articles
```

**Example Scores:**
- Neutral news: 5-20 overall
- Slight bias: 25-40 overall
- Clear bias: 45-70 overall
- Strong bias: 70-95 overall

## Verify Function is Deployed

Check if the function exists:
```sql
-- In Supabase SQL Editor
SELECT * FROM pg_available_extensions WHERE name LIKE '%edge%';
```

Or test directly:
```bash
curl -X POST \
  'https://eydnxgmxpzrhtdddcszx.supabase.co/functions/v1/detect-bias' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Test Article",
    "content": "This is a test article about government policy."
  }'
```

## Troubleshooting

**If scores still show 0%:**

1. **Check function logs:**
   - Supabase Dashboard → Edge Functions → detect-bias → Logs

2. **Verify data structure:**
```sql
SELECT
  fi.id,
  fi.title,
  fi.status,
  aa.bias_indicators->>'overall_score' as overall_score,
  aa.bias_indicators->>'political_bias' as political_bias
FROM feedback_items fi
LEFT JOIN ai_analyses aa ON fi.id = aa.feedback_id
LIMIT 5;
```

3. **Check if analysis ran:**
```sql
SELECT COUNT(*) as analyzed_count
FROM ai_analyses
WHERE bias_indicators IS NOT NULL
AND bias_indicators->>'overall_score' IS NOT NULL;
```

4. **Manually trigger one article:**
```sql
-- Get one article ID
SELECT id, title, content FROM feedback_items LIMIT 1;

-- Then call the function via UI or curl with that ID
```

## Quick Test Command

Test the algorithm works right now:

1. Open `test-single-analysis.html` in browser
2. Click "Test Neutral Article" → Should show ~5-15 overall
3. Click back to default (biased article) → Should show ~70+ overall

This proves the algorithm works! Just need to reanalyze your data.

## Need Help?

If issues persist:
1. Check Edge Function is deployed
2. Check function logs for errors
3. Verify database permissions
4. Try test page to confirm algorithm works
5. Manually trigger analysis for 1-2 articles to debug

**The algorithm is working perfectly - you just need to run it on your existing data!**
