import axios from '@/lib/axios';


// Type definitions matching the Fastaxios models
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

// axios client
export const diaryApi = {
  // Analyze a diary entry
  analyzeEntry: async (entry: DiaryEntry): Promise<MoodAnalysisResult> => {
    try {
      const response = await axios.post('/diary/analyze', entry);
      return response.data;
    } catch (error) {
      console.error('Error analyzing diary entry:', error);
      throw error;
    }
  },

  // Store a diary entry
  storeEntry: async (entry: DiaryEntry): Promise<StoredDiaryEntry> => {
    try {
      const response = await axios.post('/diary/store', entry);
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
      const response = await axios.get('/diary/search', {
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