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
  name: "Box Breathing Technique",
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
    // Simple HEAD request to check if API is responding (OPTIONS can be blocked by CORS)
    await axios.head(`${API_BASE_URL}/generate_exercise`, { 
      timeout: 2000,
      validateStatus: () => true // Accept any status to prevent throwing
    });
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
      // Check if API is available first - but don't wait too long
      let isApiAvailable = false;
      try {
        isApiAvailable = await Promise.race([
          checkApiAvailability(),
          new Promise<boolean>(resolve => setTimeout(() => resolve(false), 2500))
        ]);
      } catch (e) {
        isApiAvailable = false;
      }
      
      if (!isApiAvailable) {
        console.info('Using default exercise due to API unavailability');
        return DEFAULT_EXERCISE;
      }
      
      console.log('Sending request to:', `${API_BASE_URL}/generate_exercise`);
      
      // Use Promise.race to implement a client-side timeout as a backup
      const response = await Promise.race([
        api.post('/generate_exercise', state),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Client timeout')), 8000)
        )
      ]) as { data: BreathingPattern };
      
      // Validate the response data before returning
      if (!response.data || !response.data.steps || !Array.isArray(response.data.steps)) {
        console.warn('Invalid response from API, using default exercise');
        return DEFAULT_EXERCISE;
      }
      
      // Additional validation to ensure all steps have proper actions and durations
      const validActions = ['inhale', 'hold', 'exhale'];
      const isValid = response.data.steps.every(step => 
        validActions.includes(step.action) && 
        typeof step.duration === 'number' && 
        step.duration >= 0
      );
      
      if (!isValid) {
        console.warn('Invalid step data in response, using default exercise');
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