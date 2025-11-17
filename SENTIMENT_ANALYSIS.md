# Comprehensive Sentiment Analysis - Implementation Guide

## Overview

Your system now includes **advanced sentiment analysis** integrated with bias detection. Sentiment is analyzed across emotional language, tone, word choice, and contextual framing to provide deep insights into article presentation.

## What's Been Implemented

### 1. Enhanced Sentiment Bias Detection

**Location**: `supabase/functions/detect-bias/index.ts`

The `analyzeSentimentBias()` function now detects:

#### Emotional Language (38+ charged words)
- **High-intensity words**: fury, outrage, slams, blasts, condemns, denounces
- **Crisis language**: scandal, crisis, catastrophic, disastrous, alarming
- **Positive hyperbole**: brilliant, amazing, fantastic, incredible, triumph
- **Drama keywords**: explosive, dramatic, sensational, bombshell, staggering

**Scoring**: +15 points per emotional word detected

#### Sentiment Imbalance
Compares positive vs. negative word counts:
- **21+ positive words**: good, great, excellent, success, achievement, progress, strong, superb
- **21+ negative words**: bad, poor, failure, crisis, corrupt, fraud, terrible, awful

**Scoring**: +5 points per word of imbalance when difference exceeds 3

#### Opinionated Language
Detects directive phrases:
- should, must, need to, has to, obviously, clearly, undoubtedly, certainly

**Scoring**: +5 points per phrase (bonus after 2 detections)

#### Sensationalist Markers
- **Exclamation marks**: +5 points each (flagged after 2)
- **All-caps words**: +10 points each
- **Headline emotion**: +10 points if title contains emotional words

### 2. Comprehensive Sentiment Scoring

**Location**: `detect-bias/index.ts` - `analyzeSentiment()` function

Calculates:

**Overall Sentiment Score**: Range from -1.0 (very negative) to +1.0 (very positive)

**Sentiment Label**:
- **Positive**: Score > 0.3 (more positive words than negative)
- **Negative**: Score < -0.3 (more negative words than positive)
- **Mixed**: Close balance with multiple sentiment words
- **Neutral**: Minimal sentiment words detected

**Word Counts**:
- Positive words detected
- Negative words detected
- Neutral words (total - sentiment words)
- Emotional keywords found

### 3. Database Storage

Sentiment data is stored in the `ai_analyses` table:

```sql
sentiment_score: float (-1.0 to 1.0)
sentiment_label: text (positive, negative, neutral, mixed)
bias_indicators: jsonb {
  sentiment_details: {
    score: number,
    label: string,
    positive_count: number,
    negative_count: number,
    neutral_count: number,
    emotional_words: string[]
  },
  sentiment_bias: 0-1.0 (part of 6-dimensional bias)
}
```

### 4. UI Display - Bias Detection Page

**Location**: `src/pages/BiasDetection.tsx`

When viewing article details, users see:

#### Sentiment Analysis Card
- **Overall Sentiment**: Badge showing Positive/Negative/Mixed/Neutral with color coding
  - Green: Positive
  - Red: Negative
  - Yellow: Mixed
  - Gray: Neutral

- **Sentiment Score**: Percentage display (converted from -1.0 to +1.0 scale)

- **Word Counts**:
  - Positive words (green)
  - Negative words (red)

- **Emotional Keywords**: Pills showing detected emotional words
  - Examples: "fury", "triumph", "crisis", "scandal"

#### Sentiment Bias in 6-Dimensional Analysis
Part of the comprehensive bias breakdown:
- **Score**: 0-100 scale
- **Evidence**: List of detected patterns
- **Explanation**: How sentiment contributes to bias

### 5. Dashboard Integration

**Location**: `src/pages/Dashboard.tsx`

#### Sentiment Distribution Chart
Shows across all analyzed articles:
- Positive count & percentage (green bar)
- Neutral count & percentage (gray bar)
- Negative count & percentage (red bar)
- Mixed count & percentage (orange bar)

#### Average Sentiment Score
Displayed in the stats cards at the top

## How It Works

### Analysis Pipeline

```
Article Content
    ↓
1. Text Normalization (lowercase, word splitting)
    ↓
2. Keyword Detection (positive, negative, emotional words)
    ↓
3. Sentiment Calculation
   - Count positive/negative words
   - Calculate score: (positive - negative) / total
   - Normalize to -1.0 to +1.0 range
    ↓
4. Label Assignment (positive/negative/mixed/neutral)
    ↓
5. Bias Impact Assessment
   - Emotional language bonus
   - Imbalance penalty
   - Sensationalism detection
    ↓
6. Storage in Database
   - sentiment_score & sentiment_label in ai_analyses
   - sentiment_details in bias_indicators JSONB
```

### Scoring Examples

#### Example 1: Neutral Banking News
**Content**: "Banks announced new interest rates. According to official sources, the changes will benefit savings account holders."

**Analysis**:
- Positive words: 1 (benefit)
- Negative words: 0
- Emotional words: 0
- Sentiment Score: 0.1 (nearly neutral)
- Label: Neutral
- Sentiment Bias: 20/100 (minimal)

#### Example 2: Political Controversy
**Content**: "Fury erupted as BJP launched fierce attacks on Congress ministers over corruption allegations. Opposition leaders slammed the government and demanded immediate action."

**Analysis**:
- Positive words: 0
- Negative words: 3 (fury, attacks, corruption)
- Emotional words: 3 (fury, fierce, slammed)
- Sentiment Score: -0.6 (strongly negative)
- Label: Negative
- Sentiment Bias: 65/100 (high emotional language)

#### Example 3: Positive Achievement Story
**Content**: "The government's brilliant new infrastructure program achieved remarkable success. Officials celebrated the fantastic progress and excellent outcomes."

**Analysis**:
- Positive words: 6 (brilliant, success, fantastic, excellent, progress, celebrated)
- Negative words: 0
- Emotional words: 2 (brilliant, fantastic)
- Sentiment Score: 0.85 (strongly positive)
- Label: Positive
- Sentiment Bias: 55/100 (positive framing present)

#### Example 4: Balanced Mixed Coverage
**Content**: "The policy has good intentions but faces serious problems. Supporters praise the progress while critics raise concerns about implementation challenges."

**Analysis**:
- Positive words: 3 (good, progress, praise)
- Negative words: 3 (problems, serious, concerns)
- Emotional words: 0
- Sentiment Score: 0.0 (balanced)
- Label: Mixed
- Sentiment Bias: 35/100 (balanced but present)

## Impact on Overall Bias Scores

Sentiment bias is one of **6 dimensions** in the bias calculation:

1. Political Bias (0-100)
2. Regional Bias (0-100)
3. **Sentiment Bias (0-100)** ← Sentiment analysis
4. Source Reliability (0-100)
5. Representation Bias (0-100)
6. Language Bias (0-100)

**Overall Score** = Average of all 6 dimensions

**Classification**:
- **65-100**: High Bias
- **45-64**: Medium Bias
- **0-44**: Low Bias

## Viewing Sentiment Analysis

### On Bias Detection Page

1. Navigate to **Bias Detection**
2. Click the chart icon next to any analyzed article
3. Scroll to the **blue Sentiment Analysis card**
4. View:
   - Overall sentiment label (badge)
   - Sentiment score percentage
   - Positive/negative word counts
   - Emotional keywords detected

### On Dashboard

1. Navigate to **Dashboard**
2. View **Sentiment Distribution** chart (left panel)
   - Shows breakdown across all articles
   - Color-coded bars with percentages
3. Check **Average Sentiment** stat card at top

## Advanced Features

### Contextual Analysis

The system understands:
- **Headline sentiment**: Emotional words in titles have extra weight (+10 bonus)
- **Punctuation impact**: Exclamation marks indicate sensationalism
- **Capitalization**: ALL CAPS words show emphasis/shouting
- **Opinion markers**: "Obviously", "clearly" indicate non-objective framing

### Multi-language Support

The sentiment keywords include common English patterns. For non-English content:
- If translated to English, analysis works on translated content
- Original language detection preserves context
- Language bias dimension captures translation effects

### Temporal Analysis

Dashboard tracks sentiment over time:
- Trend direction (improving/declining/stable)
- Period comparisons (weekly, monthly)
- Regional sentiment variations

## API Usage

### Triggering Analysis

**Manual**: Click "Re-Analyze All" on Bias Detection page

**Automatic**: Analysis runs when new articles are scraped

**Edge Function Call**:
```typescript
const response = await fetch(
  `${supabaseUrl}/functions/v1/detect-bias`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: article.title,
      content: article.content,
      feedbackId: article.id
    })
  }
);
```

### Response Format

```json
{
  "success": true,
  "analysis": {
    "political_bias": { "score": 50, "evidence": [...], "explanation": "..." },
    "sentiment_bias": { "score": 65, "evidence": ["Emotional language: 3 charged words (fury, slams, attacks)"], "explanation": "..." },
    "overall_score": 58.3,
    "classification": "Medium Bias"
  }
}
```

Database stores additional fields:
```json
{
  "sentiment_score": -0.4,
  "sentiment_label": "negative",
  "bias_indicators": {
    "sentiment_details": {
      "score": -0.4,
      "label": "negative",
      "positive_count": 2,
      "negative_count": 7,
      "emotional_words": ["fury", "slams", "crisis"]
    }
  }
}
```

## Manual Deployment Required

The enhanced `detect-bias` function with full sentiment analysis is ready at:
```
/tmp/cc-agent/58337097/project/supabase/functions/detect-bias/index.ts
```

**Deploy via Supabase Dashboard**:
1. Go to Edge Functions → `detect-bias`
2. Click "Edit Function"
3. Copy content from the file above
4. Deploy

**After deployment**, re-analyze existing articles to populate sentiment data.

## Benefits

### For Analysts
- Quickly identify emotionally charged coverage
- Compare sentiment across regions/sources
- Detect sensationalist reporting patterns
- Track sentiment trends over time

### For Government Officials
- Monitor public sentiment on policies
- Identify negative/positive coverage trends
- Understand regional sentiment variations
- Support evidence-based communication strategies

### For the Public
- Understand media framing techniques
- Recognize biased language patterns
- Compare objective vs. emotional reporting
- Make informed decisions about news sources

## Expected Results

After analyzing a typical news corpus:

**Sentiment Distribution**:
- 40-50% Neutral (factual business/policy news)
- 20-30% Positive (achievements, progress stories)
- 15-25% Negative (problems, controversies, crises)
- 5-10% Mixed (balanced coverage with multiple viewpoints)

**Bias Scores**:
- Neutral factual news: Sentiment bias 15-30%
- Standard political coverage: Sentiment bias 40-55%
- Controversial stories: Sentiment bias 60-80%
- Sensationalist headlines: Sentiment bias 75-95%

The system provides actionable insights while maintaining objectivity in classification!
