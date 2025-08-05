import axios from 'axios';

// Define the base URL for the API
const API_BASE_URL = process.env.NEXT_PUBLIC_DIARY_API_URL || 'http://localhost:8000';

// Configure axios for handling CORS
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Set to true if you need to pass cookies
});

// Type definitions matching the FastAPI models
export interface DiaryEntry {
  content: string;
  date: string;
  user_id: string;
}

export interface StoredDiaryEntry {
  id: string;
  content: string;
  date: string;
  user_id: string;
  mood: string;
  analysis: string;
  confidence: number;
  created_at: string;
}

export interface MoodAnalysisResult {
  mood: string;
  analysis: string;
  confidence: number;
}

export interface SearchParams {
  query: string;
  userId: string;
  limit?: number;
}

// API client
export const diaryApi = {
  // Analyze a diary entry
  analyzeEntry: async (entry: DiaryEntry): Promise<MoodAnalysisResult> => {
    try {
      const response = await api.post('/diary/analyze', entry);
      return response.data;
    } catch (error) {
      console.error('Error analyzing diary entry:', error);
      throw error;
    }
  },

  // Store a diary entry
  storeEntry: async (entry: DiaryEntry): Promise<StoredDiaryEntry> => {
    try {
      const response = await api.post('/diary/store', entry);
      return response.data;
    } catch (error) {
      console.error('Error storing diary entry:', error);
      throw error;
    }
  },

  // Search for entries
  searchEntries: async (params: SearchParams): Promise<StoredDiaryEntry[]> => {
    try {
      const { query, userId, limit = 5 } = params;
      const response = await api.get('/diary/search', {
        params: {
          query,
          user_id: userId,
          limit
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error searching entries:', error);
      throw error;
    }
  }
}; 