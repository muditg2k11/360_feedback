import type { MediaSource, FeedbackItem, AIAnalysis } from '../types';

const STORAGE_KEYS = {
  MEDIA_SOURCES: 'media_sources',
  FEEDBACK_ITEMS: 'feedback_items',
  AI_ANALYSES: 'ai_analyses',
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getFromStorage<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return [];
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to localStorage (${key}):`, error);
  }
}

export const fallbackDataService = {
  async getMediaSources(): Promise<MediaSource[]> {
    return getFromStorage<MediaSource>(STORAGE_KEYS.MEDIA_SOURCES);
  },

  async createMediaSource(source: Omit<MediaSource, 'id' | 'created_at' | 'updated_at'>): Promise<MediaSource> {
    const sources = getFromStorage<MediaSource>(STORAGE_KEYS.MEDIA_SOURCES);
    const now = new Date().toISOString();
    const newSource: MediaSource = {
      ...source,
      id: generateId(),
      created_at: now,
      updated_at: now,
    };
    sources.push(newSource);
    saveToStorage(STORAGE_KEYS.MEDIA_SOURCES, sources);
    return newSource;
  },

  async updateMediaSource(id: string, updates: Partial<MediaSource>): Promise<MediaSource> {
    const sources = getFromStorage<MediaSource>(STORAGE_KEYS.MEDIA_SOURCES);
    const index = sources.findIndex(s => s.id === id);
    if (index === -1) {
      throw new Error('Media source not found');
    }
    const updated: MediaSource = {
      ...sources[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    sources[index] = updated;
    saveToStorage(STORAGE_KEYS.MEDIA_SOURCES, sources);
    return updated;
  },

  async deleteMediaSource(id: string): Promise<void> {
    const sources = getFromStorage<MediaSource>(STORAGE_KEYS.MEDIA_SOURCES);
    const filtered = sources.filter(s => s.id !== id);
    saveToStorage(STORAGE_KEYS.MEDIA_SOURCES, filtered);
  },

  async getFeedbackItems(): Promise<FeedbackItem[]> {
    return getFromStorage<FeedbackItem>(STORAGE_KEYS.FEEDBACK_ITEMS);
  },

  async createFeedbackItem(item: Omit<FeedbackItem, 'id' | 'created_at'>): Promise<FeedbackItem> {
    const items = getFromStorage<FeedbackItem>(STORAGE_KEYS.FEEDBACK_ITEMS);
    const newItem: FeedbackItem = {
      ...item,
      id: generateId(),
      created_at: new Date().toISOString(),
    };
    items.push(newItem);
    saveToStorage(STORAGE_KEYS.FEEDBACK_ITEMS, items);
    return newItem;
  },

  async updateFeedbackItem(id: string, updates: Partial<FeedbackItem>): Promise<FeedbackItem> {
    const items = getFromStorage<FeedbackItem>(STORAGE_KEYS.FEEDBACK_ITEMS);
    const index = items.findIndex(i => i.id === id);
    if (index === -1) {
      throw new Error('Feedback item not found');
    }
    const updated: FeedbackItem = { ...items[index], ...updates };
    items[index] = updated;
    saveToStorage(STORAGE_KEYS.FEEDBACK_ITEMS, items);
    return updated;
  },

  async deleteFeedbackItem(id: string): Promise<void> {
    const items = getFromStorage<FeedbackItem>(STORAGE_KEYS.FEEDBACK_ITEMS);
    const filtered = items.filter(i => i.id !== id);
    saveToStorage(STORAGE_KEYS.FEEDBACK_ITEMS, filtered);
  },
};
