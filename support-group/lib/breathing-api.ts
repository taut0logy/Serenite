import axios from 'axios';

// Define the base URL for the API
const API_BASE_URL = process.env.NEXT_PUBLIC_BREATHING_API_URL || 'http://localhost:8000';

// Configure axios for handling CORS
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false,
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
  name: "Calm Relief",
  description: "A gentle, slow breathing exercise to reduce stress and alleviate headaches.",
  steps: [
    {
      action: "inhale",
      duration: 4,
      instruction: "Breathe in slowly through your nose, feeling the air fill your lungs"
    },
    {
      action: "hold",
      duration: 2,
      instruction: "Hold your breath, allowing your body to relax"
    },
    {
      action: "exhale",
      duration: 6,
      instruction: "Exhale slowly through your mouth, releasing tension and stress"
    },
    {
      action: "hold",
      duration: 2,
      instruction: "Hold before breathing in again, feeling calm and centered"
    }
  ],
  duration_minutes: 5,
  benefits: [
    "Reduces stress and anxiety",
    "Alleviates physical tension and headaches",
    "Promotes relaxation and calmness"
  ],
  suitable_for: [
    "People experiencing stress and anxiety",
    "Those who need a quick relaxation break",
    "Individuals prone to headaches and physical tension"
  ]
};

// Utility to check if API is available
const checkApiAvailability = async (): Promise<boolean> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/breathing/generate`, {
      timeout: 2000,
      validateStatus: () => true
    });
    return response.status !== 404;
  } catch (error) {
    console.warn('Breathing API not available:', error);
    return false;
  }
};

// API client
export const breathingApi = {
  // Generate a breathing exercise
  generateExercise: async (state: EmotionalState): Promise<BreathingPattern> => {
    try {
      console.log('Sending request to:', `${API_BASE_URL}/breathing/generate`);
      console.log('Request payload:', state);

      const response = await api.post('/breathing/generate', state);
      console.log('API Response:', response.data);

      // Validate the response data
      if (!response.data || !response.data.steps || !Array.isArray(response.data.steps)) {
        console.warn('Invalid response from API, using default exercise');
        return DEFAULT_EXERCISE;
      }

      // Additional validation to ensure all steps have proper actions and durations
      const validActions = ['inhale', 'hold', 'exhale'] as const;
      const isValid = response.data.steps.every((step: BreathingStep) => 
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
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
      }
      return DEFAULT_EXERCISE;
    }
  },
}; 