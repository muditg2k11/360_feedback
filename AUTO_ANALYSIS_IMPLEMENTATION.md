# Automatic Analysis After Scraping - Implementation Guide

## Problem Solved

**Issue**: Articles were stuck in "processing" status after scraping. They required manual analysis by clicking "Analyze All" button.

**Solution**: Automatically analyze articles immediately after scraping, so they go directly to "analyzed" status.

---

## Changes Made

### 1. Enhanced Scraping Function (scrape-news)

**File**: `/supabase/functions/scrape-news/index.ts`

**What Changed**:
- After saving each article, now stores article ID, title, and content
- After all articles are saved, automatically calls `detect-bias` function for each one
- Articles are analyzed in sequence with 100ms delay between each

**Code Flow**:
```typescript
// OLD: Just save and forget
insert article → status: 'processing' → DONE

// NEW: Save and analyze automatically
insert article → status: 'processing'
  → call detect-bias function
  → analysis created
  → status updated to 'analyzed' → DONE
```

**Key Changes**:
```typescript
// Now captures inserted article data
const { data: inserted, error: insertError } = await supabase
  .from('feedback_items')
  .insert({...})
  .select()
  .single();

// Store IDs for analysis
savedArticleIds.push({
  id: inserted.id,
  title: article.title,
  content: article.content
});

// After all saved, analyze each one
for (const articleInfo of savedArticleIds) {
  await fetch(`${supabaseUrl}/functions/v1/detect-bias`, {
    method: 'POST',
    body: JSON.stringify({
      title: articleInfo.title,
      content: articleInfo.content,
      feedbackId: articleInfo.id,
    }),
  });
}
```

---

### 2. Fixed Bias Detection Function (detect-bias)

**File**: `/supabase/functions/detect-bias/index.ts`

**What Changed**:
- Changed from `UPDATE` to `UPSERT` (insert or update)
- Now updates feedback_items status to "analyzed" after analysis
- Handles both new articles and existing re-analysis

**Key Changes**:
```typescript
// OLD: UPDATE only (failed if record didn't exist)
await supabase.from('ai_analyses').update({...}).eq('feedback_id', id)

// NEW: UPSERT (creates if doesn't exist, updates if exists)
await supabase.from('ai_analyses').upsert({
  feedback_id: feedbackId,
  sentiment_score: ...,
  bias_indicators: {...},
}, { onConflict: 'feedback_id' })

// ALSO update feedback status
await supabase.from('feedback_items')
  .update({ status: 'analyzed' })
  .eq('id', feedbackId)
```

---

### 3. New Function: Analyze Pending Articles

**File**: `/supabase/functions/analyze-pending/index.ts`

**Purpose**: Batch analyze all existing "processing" articles (fixes the 72 stuck articles)

**What It Does**:
1. Queries all articles with status="processing"
2. For each article, calls detect-bias function
3. Returns count of analyzed articles

**Usage**:
```bash
# Call from frontend or manually
POST /functions/v1/analyze-pending
```

**Response**:
```json
{
  "success": true,
  "total": 72,
  "analyzed": 72,
  "failed": 0,
  "message": "Analysis complete"
}
```

---

### 4. Updated UI: New Button

**File**: `/src/pages/BiasDetection.tsx`

**What Changed**:
- Added new "Analyze Pending" button (green)
- Existing "Reanalyze All" button (blue) remains
- Shows loading state during analysis

**UI Changes**:
```tsx
// Before: Only "Reanalyze All" button

// After: Two buttons
<button onClick={handleAnalyzePending}>
  Analyze Pending
</button>
<button onClick={handleReanalyze}>
  Reanalyze All
</button>
```

---

## Complete Flow Diagram

### New Scraping + Auto-Analysis Flow

```
User clicks "Scrape News from All Sources"
    ↓
┌────────────────────────────────────────────┐
│ 1. scrape-news function starts            │
│    - Fetch active media sources            │
│    - Create scraping job                   │
└────────────────┬───────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────┐
│ 2. For each source (10 sources)           │
│    - Fetch RSS feed                        │
│    - Parse XML                             │
│    - Extract article URLs                  │
│    - Fetch full content from each URL      │
│    - Found: 50 articles                    │
└────────────────┬───────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────┐
│ 3. Save articles to database               │
│    - Check for duplicates (by URL)         │
│    - Insert new articles                   │
│    - Status: 'processing'                  │
│    - Store article IDs: [id1, id2, ...]    │
│    - Saved: 12 new articles                │
└────────────────┬───────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────┐
│ 4. Auto-analyze saved articles ⭐ NEW      │
│    For each saved article:                 │
│      ├─ Call detect-bias function          │
│      ├─ Pass: title, content, feedbackId   │
│      ├─ Wait for analysis                  │
│      └─ Log: "✓ Analyzed: Article title"   │
│    Progress: 1/12... 2/12... 12/12         │
└────────────────┬───────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────┐
│ 5. detect-bias function (for each)        │
│    - Run 6-dimensional bias analysis       │
│    - Calculate sentiment score             │
│    - UPSERT to ai_analyses table           │
│    - UPDATE feedback_items status          │
│    - Status: 'processing' → 'analyzed'     │
└────────────────┬───────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────┐
│ 6. Return results                          │
│    {                                       │
│      success: true,                        │
│      message: "Scraped 10 sources",        │
│      results: [                            │
│        {                                   │
│          sourceName: "Indian Express",     │
│          articlesFound: 50,                │
│          articlesSaved: 12,                │
│          status: "success"                 │
│        }                                   │
│      ]                                     │
│    }                                       │
└────────────────┬───────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────┐
│ 7. Frontend displays success              │
│    "Scraped 10 sources, saved 12 articles"│
│    All articles now status: 'analyzed'     │
│    Immediately visible in Bias Detection   │
└────────────────────────────────────────────┘
```

---

## Deployment Steps

### Step 1: Deploy Updated scrape-news Function

1. Go to Supabase Dashboard → Edge Functions
2. Find or create function: `scrape-news`
3. Copy contents from: `/project/supabase/functions/scrape-news/index.ts`
4. Deploy
5. Test by scraping one source

### Step 2: Deploy Updated detect-bias Function

1. Go to Supabase Dashboard → Edge Functions
2. Find function: `detect-bias`
3. Copy contents from: `/project/supabase/functions/detect-bias/index.ts`
4. Deploy
5. Verify UPSERT works

### Step 3: Deploy New analyze-pending Function

1. Go to Supabase Dashboard → Edge Functions
2. Create new function: `analyze-pending`
3. Copy contents from: `/project/supabase/functions/analyze-pending/index.ts`
4. Deploy

### Step 4: Deploy Frontend Updates

1. Your frontend already has the new "Analyze Pending" button
2. Deploy updated React app to Vercel/Netlify
3. Or if running locally, just refresh

### Step 5: Fix Existing 72 Processing Articles

**Option A: Using New Button (Recommended)**
1. Go to Bias Detection page
2. Click "Analyze Pending" (green button)
3. Wait ~2 minutes
4. All 72 articles will be analyzed
5. Status updated to "analyzed"

**Option B: Using SQL (Manual)**
```sql
-- Check how many need analysis
SELECT COUNT(*)
FROM feedback_items
WHERE status = 'processing';

-- Then click "Analyze Pending" button in UI
```

---

## Testing Checklist

### Test 1: Scrape New Articles
- [ ] Go to Feedback Collection page
- [ ] Click "Scrape News from All Sources"
- [ ] Wait 60-90 seconds
- [ ] Check console logs (should see "✓ Analyzed: ...")
- [ ] Go to Bias Detection page
- [ ] Verify new articles have status "analyzed"
- [ ] Verify bias scores are shown

### Test 2: Fix Old Processing Articles
- [ ] Go to Bias Detection page
- [ ] Click "Analyze Pending" button
- [ ] Wait for completion message
- [ ] Verify all articles now "analyzed"
- [ ] Check bias scores display correctly

### Test 3: Sentiment Analysis Works
- [ ] Click chart icon on any article
- [ ] Verify sentiment card appears (blue)
- [ ] Check sentiment score shows
- [ ] Check emotional keywords display
- [ ] Verify positive/negative word counts

---

## Performance Considerations

### Scraping Time Estimate

```
10 sources × 10 articles/source = 100 articles
100 articles × 2 seconds/analysis = 200 seconds = ~3.3 minutes
```

**Optimization**:
- Articles analyzed sequentially to avoid overwhelming the system
- 100ms delay between each analysis
- Can increase parallelism if needed

### Parallel Analysis (Future Enhancement)

```typescript
// Current: Sequential
for (const article of articles) {
  await analyzeArticle(article); // One at a time
}

// Future: Parallel (5 at a time)
const chunks = chunkArray(articles, 5);
for (const chunk of chunks) {
  await Promise.all(chunk.map(analyzeArticle));
}
```

---

## Database State After Fix

### Before Fix
```sql
SELECT status, COUNT(*)
FROM feedback_items
GROUP BY status;

-- Result:
-- analyzed:   355
-- processing:  72   ← Stuck!
```

### After Fix
```sql
SELECT status, COUNT(*)
FROM feedback_items
GROUP BY status;

-- Result:
-- analyzed:   427   ← All analyzed!
-- processing:   0   ← None stuck!
```

---

## Troubleshooting

### Issue: Articles Still "Processing" After Scraping

**Check 1**: Is scrape-news deployed?
```bash
# In Supabase Edge Functions logs
Look for: "Analyzing X newly scraped articles..."
```

**Check 2**: Is detect-bias deployed with UPSERT?
```bash
# In detect-bias function logs
Look for: "Upserting analysis for feedback_id: ..."
```

**Check 3**: Check function errors
- Go to Supabase Dashboard → Edge Functions → Logs
- Look for errors in scrape-news or detect-bias

### Issue: "Analyze Pending" Button Not Working

**Check 1**: Is analyze-pending function deployed?
- Supabase Dashboard → Edge Functions → Check if exists

**Check 2**: Check browser console
- Open DevTools → Console
- Click button and look for errors

**Check 3**: Check function logs
- Supabase Dashboard → Functions → analyze-pending → Logs

### Issue: Analysis Takes Too Long

**Current**: Sequential analysis (safe but slow)
**Solution**: If you have 100+ articles, consider:
1. Increase timeout in function
2. Implement batch processing
3. Use background job queue

---

## Monitoring

### Key Metrics to Track

1. **Scraping Success Rate**
   ```sql
   SELECT
     status,
     COUNT(*) as jobs,
     AVG(articles_saved) as avg_saved
   FROM scraping_jobs
   WHERE created_at > NOW() - INTERVAL '7 days'
   GROUP BY status;
   ```

2. **Analysis Coverage**
   ```sql
   SELECT
     COUNT(CASE WHEN status = 'analyzed' THEN 1 END) as analyzed,
     COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
     COUNT(*) as total
   FROM feedback_items;
   ```

3. **Average Sentiment by Source**
   ```sql
   SELECT
     ms.name,
     AVG(aa.sentiment_score) as avg_sentiment,
     COUNT(*) as articles
   FROM feedback_items fi
   JOIN media_sources ms ON fi.source_id = ms.id
   JOIN ai_analyses aa ON fi.id = aa.feedback_id
   GROUP BY ms.name
   ORDER BY avg_sentiment DESC;
   ```

---

## Benefits of Auto-Analysis

✅ **No Manual Work**: Articles analyzed automatically after scraping
✅ **Real-Time Insights**: See bias scores immediately
✅ **No Stuck Articles**: Status always updated correctly
✅ **Better UX**: Users don't need to click "Analyze All"
✅ **Scalable**: Works for 10 or 200 sources
✅ **PIB-Ready**: Meets requirement for automated analysis

---

## Future Enhancements

### 1. Real-Time Notifications (PIB Requirement)
After auto-analysis, if sentiment is negative:
```typescript
if (sentimentScore < -0.3) {
  await sendNotification({
    type: 'sms',
    message: `Negative story detected: ${title}`,
    recipients: assignedOfficers
  });
}
```

### 2. Department Auto-Tagging
During analysis, categorize by ministry:
```typescript
const departments = categorizeDepartment(title, content);
await supabase.from('feedback_items')
  .update({ assigned_departments: departments })
  .eq('id', feedbackId);
```

### 3. Multi-Language Translation
After scraping, translate to English:
```typescript
if (language !== 'English') {
  const translated = await translateText(content, language, 'en');
  await saveTranslation(feedbackId, translated);
}
```

---

## Summary

**What Was Changed**:
1. ✅ scrape-news now auto-analyzes articles after saving
2. ✅ detect-bias uses UPSERT to handle new articles
3. ✅ New analyze-pending function for batch fixing old articles
4. ✅ UI has "Analyze Pending" button

**What This Fixes**:
- ❌ Articles stuck in "processing" status
- ❌ Manual "Analyze All" required
- ❌ No immediate bias detection

**Result**:
- ✅ All articles automatically analyzed after scraping
- ✅ Status goes directly to "analyzed"
- ✅ Bias scores visible immediately
- ✅ Ready for PIB deployment

**Next Steps**:
1. Deploy 3 edge functions
2. Click "Analyze Pending" to fix 72 old articles
3. Test with new scraping
4. All articles will be auto-analyzed going forward!
