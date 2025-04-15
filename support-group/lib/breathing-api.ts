import axios from 'axios';

// Define the base URL for the API
const API_BASE_URL = process.env.NEXT_PUBLIC_BREATHING_API_URL || 'http://localhost:8001';

// Configure axios for handling CORS
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // withCredentials should be false for cross-origin requests without cookies
  withCredentials: false,
  // Add timeout to prevent hanging requests
  timeout: 10000,
});

// Type definitions matching the FastAPI models
export interface EmotionalState {
  description: string;
  stress_level: number;
  physical_symptoms?: string;
  time_available?: number;
}

export interface BreathingStep {
  action: 'inhale' | 'hold' | 'exhale';
  duration: number;
  instruction: string;
}

export interface BreathingPattern {
  name: string;
  description: string;
  steps: BreathingStep[];
  duration_minutes: number;
  benefits: string[];
  suitable_for: string[];
}

// Default breathing exercise to use when API fails
const DEFAULT_EXERCISE: BreathingPattern = {
  name: "Basic Calming Breath",
  description: "A simple breathing technique to restore calm and balance.",
  steps: [
    {action: "inhale", duration: 4, instruction: "Breathe in through your nose"},
    {action: "hold", duration: 2, instruction: "Hold your breath briefly"},
    {action: "exhale", duration: 6, instruction: "Exhale slowly through your mouth"},
    {action: "hold", duration: 0, instruction: "Continue to the next breath"}
  ],
  duration_minutes: 5,
  benefits: ["Reduces anxiety", "Increases focus", "Promotes relaxation"],
  suitable_for: ["Everyone", "Beginners", "People experiencing stress"]
};

// API client
export const breathingApi = {
  // Generate a breathing exercise
  generateExercise: async (state: EmotionalState): Promise<BreathingPattern> => {
    try {
      console.log('Sending request to:', `${API_BASE_URL}/generate_exercise`);
      console.log('With data:', state);
      
      const response = await api.post('/generate_exercise', state);
      return response.data;
    } catch (error) {
      console.error('Error generating breathing exercise:', error);
      
      // Return default exercise instead of throwing, to make app more resilient
      console.warn('Falling back to default exercise');
      return DEFAULT_EXERCISE;
    }
  },
}; 