import axios from 'axios';

// Define the base URL for the API
const API_BASE_URL = process.env.NEXT_PUBLIC_DIARY_API_URL || 'http://localhost:8000';

// Type definitions matching the FastAPI models
export interface DiaryEntry {
  content: string;
  timestamp?: Date;
}

export interface Emotion {
  name: string;
  confidence: number;
}

export interface MoodAnalysis {
  overall_mood: string;
  sentiment_score: number;
  primary_emotions: Emotion[];
  energy_level: string;
  key_themes: string[];
}

export interface EntrySummary {
  summary: string;
  key_points: string[];
  action_items?: string[];
}

export interface ReflectionPrompt {
  prompt: string;
  reason: string;
}

export interface DiaryEntryAnalysis {
  entry_id: string;
  timestamp: Date;
  content: string;
  mood_analysis: MoodAnalysis;
  summary: EntrySummary;
  reflection_prompts: ReflectionPrompt[];
  tags: string[];
}

export interface SearchQuery {
  query: string;
  limit?: number;
}

export interface SearchResult {
  entry_id: string;
  timestamp: Date;
  content: string;
  summary: string;
  relevance_score: number;
}

export interface MoodTrend {
  date: string;
  mood: number;
  primary_emotion: string;
}

// API client
const diaryApi = {
  // Analyze a diary entry
  analyzeEntry: async (entry: DiaryEntry): Promise<DiaryEntryAnalysis> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/analyze-entry`, entry);
      return response.data;
    } catch (error) {
      console.error('Error analyzing diary entry:', error);
      throw error;
    }
  },

  // Search for entries
  searchEntries: async (query: SearchQuery): Promise<SearchResult[]> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/search`, query);
      return response.data;
    } catch (error) {
      console.error('Error searching entries:', error);
      throw error;
    }
  },

  // Get mood trends
  getMoodTrends: async (): Promise<MoodTrend[]> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/mood-trends`);
      return response.data;
    } catch (error) {
      console.error('Error getting mood trends:', error);
      throw error;
    }
  },
};

export default diaryApi; 