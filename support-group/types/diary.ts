export interface DiaryEntry {
  id: string;
  content: string;
  timestamp: Date;
  mood: string;
  summary: string;
  emotions: string[];
}

export interface MoodAnalysis {
  mood: string;
  emotions: string[];
  sentiment: number;
  keyThemes: string[];
}

export interface EntrySummary {
  summary: string;
  keyPoints: string[];
  actionItems?: string[];
}

export interface MoodTrend {
  date: string;
  mood: number;
  emotions: string[];
} 