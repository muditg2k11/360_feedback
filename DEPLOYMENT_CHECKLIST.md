# Deployment Checklist - Fix Processing Articles

## Quick Summary

**Problem**: 72 articles stuck at "processing" status
**Solution**: Auto-analyze after scraping + batch fix existing articles
**Time Required**: 30 minutes deployment + 2 minutes to fix existing articles

---

## 🚀 Deployment Steps (Do in Order)

### Step 1: Deploy detect-bias Function (5 min)

**Why First**: Other functions depend on this

1. ✅ Open Supabase Dashboard
2. ✅ Go to **Edge Functions**
3. ✅ Click **detect-bias** (or create if doesn't exist)
4. ✅ Copy code from: `/supabase/functions/detect-bias/index.ts`
5. ✅ Click **Deploy**
6. ✅ Wait for success message

**Test**:
```bash
# In Supabase function logs, look for:
"Upserting analysis for feedback_id: ..."
"Updating feedback status to analyzed"
```

---

### Step 2: Deploy scrape-news Function (5 min)

**Why**: Enables auto-analysis after scraping

1. ✅ Go to **Edge Functions**
2. ✅ Click **scrape-news**
3. ✅ Copy code from: `/supabase/functions/scrape-news/index.ts`
4. ✅ Click **Deploy**
5. ✅ Wait for success message

**Test**:
```bash
# After deployment, in function logs look for:
"Analyzing X newly scraped articles..."
"✓ Analyzed: Article title..."
```

---

### Step 3: Deploy analyze-pending Function (5 min)

**Why**: Fixes the 72 existing stuck articles

1. ✅ Go to **Edge Functions**
2. ✅ Click **Create Function**
3. ✅ Name: `analyze-pending`
4. ✅ Copy code from: `/supabase/functions/analyze-pending/index.ts`
5. ✅ Click **Deploy**
6. ✅ Wait for success message

---

### Step 4: Deploy Frontend (5 min)

**If using Vercel**:
```bash
cd /project
npm run build
vercel --prod
```

**If using Netlify**:
```bash
cd /project
npm run build
netlify deploy --prod
```

**If running locally**:
```bash
# Already built, just refresh browser
# No deployment needed
```

---

### Step 5: Fix Existing 72 Articles (2 min) ⭐

**This is the important part!**

1. ✅ Open your application
2. ✅ Log in with admin account
3. ✅ Go to **Bias Detection** page
4. ✅ Click **"Analyze Pending"** button (green button)
5. ✅ Wait for message: "Successfully analyzed 72 articles!"
6. ✅ Refresh page
7. ✅ Verify all articles now show "analyzed" status

**Expected Timeline**:
- 72 articles × 1.5 seconds each = ~108 seconds (~2 minutes)

---

### Step 6: Verify Everything Works (5 min)

**Test 1: Check Existing Articles**
```sql
-- Run in Supabase SQL Editor
SELECT status, COUNT(*)
FROM feedback_items
GROUP BY status;

-- Expected result:
-- analyzed: 427 (all articles)
-- processing: 0 (none stuck!)
```

**Test 2: Scrape New Articles**
1. ✅ Go to **Feedback Collection** page
2. ✅ Click **"Scrape News from All Sources"**
3. ✅ Wait 60-90 seconds
4. ✅ Go to **Bias Detection** page
5. ✅ Verify new articles immediately show as "analyzed"
6. ✅ Click chart icon on any article
7. ✅ Verify sentiment analysis appears

**Test 3: Sentiment Display**
1. ✅ Open any article detail modal
2. ✅ Check for blue "Sentiment Analysis" card
3. ✅ Verify sentiment score displays
4. ✅ Verify emotional keywords show as pills

---

## 📋 Pre-Deployment Checklist

Before starting deployment:

- [ ] Supabase account access
- [ ] Admin credentials for dashboard
- [ ] Backup database (optional but recommended)
  ```bash
  # In Supabase Dashboard → Settings → Database → Backups
  # Take a manual backup before deploying
  ```

---

## 🎯 Success Criteria

After deployment, you should have:

✅ **All 3 functions deployed**:
- detect-bias (updated with UPSERT)
- scrape-news (with auto-analysis)
- analyze-pending (new function)

✅ **All articles analyzed**:
- 0 articles in "processing" status
- All articles show bias scores
- Sentiment analysis visible

✅ **Auto-analysis working**:
- New scraped articles auto-analyzed
- Status goes directly to "analyzed"
- No manual intervention needed

---

## ⚠️ Troubleshooting

### Issue: analyze-pending button doesn't work

**Check**:
1. Is analyze-pending function deployed?
   - Supabase Dashboard → Edge Functions → Look for "analyze-pending"

2. Check browser console for errors
   - Press F12 → Console tab
   - Click button and look for red errors

3. Check function logs
   - Supabase Dashboard → Edge Functions → analyze-pending → Logs

**Fix**:
- Redeploy analyze-pending function
- Clear browser cache
- Try in incognito/private window

---

### Issue: Articles still "processing" after scraping

**Check**:
1. Check scrape-news function logs
   - Look for: "Analyzing X newly scraped articles..."

2. Check detect-bias function logs
   - Look for: "Upserting analysis..."

**Fix**:
- Redeploy scrape-news with latest code
- Verify detect-bias is deployed
- Check Supabase function logs for errors

---

### Issue: Sentiment not showing in article details

**Check**:
1. Is detect-bias deployed with sentiment_details?
2. Does ai_analyses table have sentiment_details column?

**Fix**:
```sql
-- Check if sentiment_details exists in bias_indicators
SELECT
  bias_indicators->'sentiment_details' as sentiment
FROM ai_analyses
LIMIT 1;

-- If null, re-run analysis
-- Click "Analyze Pending" button
```

---

## 📞 Support

If issues persist:

1. **Check Documentation**:
   - AUTO_ANALYSIS_IMPLEMENTATION.md (detailed guide)
   - PROJECT_DOCUMENTATION.md (full technical docs)

2. **Check Logs**:
   - Supabase Dashboard → Edge Functions → [function name] → Logs
   - Browser Console (F12 → Console)

3. **Database Check**:
   ```sql
   -- Count articles by status
   SELECT status, COUNT(*) FROM feedback_items GROUP BY status;

   -- Check for articles without analysis
   SELECT COUNT(*)
   FROM feedback_items fi
   LEFT JOIN ai_analyses aa ON fi.id = aa.feedback_id
   WHERE aa.id IS NULL;
   ```

---

## 🎉 Post-Deployment

Once everything is working:

### What to Do Next

1. **Monitor Daily**:
   - Check that new scraped articles are auto-analyzed
   - Verify no articles stuck in "processing"

2. **Schedule Regular Scraping**:
   - Set up cron job or scheduled function
   - Scrape every 6 hours or daily

3. **Plan Phase 2 Enhancements**:
   - Multi-language support (13 languages)
   - OCR for e-papers
   - Real-time SMS notifications
   - Department categorization
   - YouTube monitoring

See `PIB_REQUIREMENTS_GAP_ANALYSIS.md` for full enhancement roadmap.

---

## ✨ Summary

**What You're Deploying**:
1. Fixed detect-bias (UPSERT + status update)
2. Enhanced scrape-news (auto-analysis)
3. New analyze-pending (batch fix)
4. Updated UI (new button)

**What This Achieves**:
- ✅ No more stuck articles
- ✅ Immediate bias detection
- ✅ Automatic sentiment analysis
- ✅ Better user experience
- ✅ Ready for PIB requirements

**Time Investment**:
- Deployment: 30 minutes
- Fix existing articles: 2 minutes
- Testing: 5 minutes
- **Total**: ~40 minutes

**Result**: Fully automated media monitoring system! 🚀
