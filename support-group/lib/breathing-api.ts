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
  // withCredentials must be false for cross-origin requests without cookies
  withCredentials: false,
  // Reduced timeout to prevent long waiting periods
  timeout: 8000,
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
  name: "Basic Box Breathing Technique",
  description: "A simple 4-4-4-4 box breathing technique to calm your nervous system and improve focus.",
  steps: [
    {action: "inhale", duration: 4, instruction: "Breathe in slowly through your nose, filling your lungs completely"},
    {action: "hold", duration: 4, instruction: "Hold your breath and feel the energy in your body"},
    {action: "exhale", duration: 4, instruction: "Exhale slowly through your mouth, releasing all tension"},
    {action: "hold", duration: 4, instruction: "Keep your lungs empty and pause before the next breath"}
  ],
  duration_minutes: 5,
  benefits: ["Reduces anxiety", "Increases focus", "Balances energy", "Promotes relaxation", "Improves mental clarity"],
  suitable_for: ["Everyone", "Beginners", "People experiencing stress", "Before meditation", "During work breaks"]
};

// Utility to check if API is available
const checkApiAvailability = async (): Promise<boolean> => {
  try {
    // Simple OPTIONS request to check if API is responding
    await axios.options(API_BASE_URL, { timeout: 2000 });
    return true;
  } catch (error) {
    console.warn('Breathing API not available, using offline mode');
    return false;
  }
};

// API client
export const breathingApi = {
  // Generate a breathing exercise
  generateExercise: async (state: EmotionalState): Promise<BreathingPattern> => {
    try {
      // Check if API is available first
      const isApiAvailable = await checkApiAvailability();
      if (!isApiAvailable) {
        console.info('Using default exercise due to API unavailability');
        return DEFAULT_EXERCISE;
      }
      
      console.log('Sending request to:', `${API_BASE_URL}/generate_exercise`);
      
      const response = await api.post('/generate_exercise', state);
      
      // Validate the response data before returning
      if (!response.data || !response.data.steps || !Array.isArray(response.data.steps)) {
        console.warn('Invalid response from API, using default exercise');
        return DEFAULT_EXERCISE;
      }
      
      return response.data;
    } catch (error) {
      console.error('Error generating breathing exercise:', error);
      console.warn('Falling back to default exercise');
      return DEFAULT_EXERCISE;
    }
  },
}; 