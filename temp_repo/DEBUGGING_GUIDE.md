# 🔍 Debugging Guide - Loading Issues

## Problem: "Loading media sources..." stuck on screen

### Quick Fixes Applied

1. **Added 5-second timeout** - Pages will automatically stop loading after 5 seconds
2. **Comprehensive logging** - Check browser console for detailed debug info
3. **Error handling** - Empty arrays returned on error instead of hanging

### How to Debug

#### Step 1: Open Browser Console
- **Windows/Linux**: Press `F12` or `Ctrl+Shift+I`
- **Mac**: Press `Cmd+Option+I`
- Click the "Console" tab

#### Step 2: Check Console Logs
You should see logs like:
```
✅ Supabase initialized with URL: https://0ec90b57d6e95fcbda19832f.supabase.co
[MediaSources] Starting to load media sources...
Fetching media sources from Supabase...
Successfully fetched 15 media sources
[MediaSources] Received sources: 15
[MediaSources] State updated with sources
[MediaSources] Setting isLoading to false
```

#### Step 3: If You See Errors

**Error: "Failed to fetch"**
- Check internet connection
- Verify Supabase URL is correct
- Check CORS issues

**Error: "Timeout"**
- Supabase might be slow
- Page will auto-complete after 5 seconds
- Data should still load

**Error: "RLS policy violation"**
- This should NOT happen (we fixed this)
- If it does, the fallback will activate

### Test Connection Manually

Open `TEST_CONNECTION.html` in your browser:
1. It will automatically test the Supabase connection
2. Click buttons to fetch media sources and feedback
3. See raw JSON data from database

### Expected Console Output

```
[AuthContext] Checking user session...
Supabase initialized with URL: https://...
[MediaSources] Starting to load media sources...
Fetching media sources from Supabase...
Successfully fetched 15 media sources
[MediaSources] Received sources: 15
[MediaSources] State updated with sources
[MediaSources] Setting isLoading to false
```

### If Still Stuck After 5 Seconds

The page should automatically stop showing "Loading..." after 5 seconds, even if data fetch fails.

**What to check:**
1. Is the timeout being triggered? (Look for timeout warning in console)
2. Is JavaScript running? (Any console errors?)
3. Is React mounting? (Should see component logs)

### Force Reload

1. **Hard Refresh**:
   - Windows/Linux: `Ctrl+Shift+R`
   - Mac: `Cmd+Shift+R`

2. **Clear Cache**:
   - Chrome: `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Select "Cached images and files"
   - Click "Clear data"

3. **Incognito/Private Mode**:
   - Try loading in a new incognito window
   - This bypasses all cache

### Browser-Specific Issues

**Chrome**
- Check Extensions: Some ad blockers interfere
- Try disabling extensions temporarily

**Firefox**
- Check Enhanced Tracking Protection
- Try standard mode instead of strict

**Safari**
- Check Prevent Cross-Site Tracking setting
- May need to allow Supabase domain

### Network Tab Inspection

1. Open DevTools (`F12`)
2. Go to "Network" tab
3. Reload page
4. Look for requests to `supabase.co`
5. Check if they return 200 OK or error status

### Testing Locally

```bash
# Build the project
npm run build

# Preview built version
npm run preview

# Check console output
```

### Manual Supabase Query

Open browser console on the app page and run:

```javascript
// Test direct Supabase query
const { createClient } = window['@supabase/supabase-js'];
const supabase = createClient(
  'https://0ec90b57d6e95fcbda19832f.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw'
);

// Fetch data
const { data, error } = await supabase.from('media_sources').select('*');
console.log('Data:', data);
console.log('Error:', error);
```

### Common Solutions

| Problem | Solution |
|---------|----------|
| Stuck loading | Wait 5 seconds (auto-timeout) |
| No data showing | Check console for errors |
| Network error | Check internet connection |
| CORS error | Try different browser |
| Blank page | Hard refresh (Ctrl+Shift+R) |
| Cache issues | Clear browser cache |

### Logs to Look For

**Good Logs:**
```
✓ Supabase initialized
✓ Successfully fetched X media sources
✓ Setting isLoading to false
```

**Warning Logs:**
```
⚠ Loading timeout - forcing completion
⚠ Using fallback storage
⚠ Supabase unavailable
```

**Error Logs:**
```
✗ Error fetching media sources
✗ Failed to fetch feedback items
✗ Connection failed
```

### Fallback Mode

If Supabase fails:
- App uses localStorage fallback
- Will be empty initially
- Add data manually via UI
- Data persists in browser only

### Environment Variables Check

Verify in browser console:
```javascript
// Should print the Supabase URL
console.log(import.meta.env.VITE_SUPABASE_URL);

// Check if defined
console.log(import.meta.env.VITE_SUPABASE_ANON_KEY ? '✓ Key present' : '✗ Key missing');
```

### React DevTools

Install React DevTools extension:
1. Check component state
2. Verify `isLoading` changes to `false`
3. Check `mediaSources` array has data

### Last Resort

If nothing works:
1. Delete `node_modules` and reinstall
2. Check if Supabase project is active
3. Verify database is not paused
4. Check Supabase dashboard for issues
5. Try on different device/network

### Get Help

When reporting issues, include:
1. Browser console logs (full output)
2. Network tab screenshots
3. Browser and OS version
4. Steps to reproduce
5. Screenshot of the stuck screen

---

**Remember**: The 5-second timeout means you should NEVER be stuck loading forever. If you are, JavaScript might not be running at all.
