// Types for the breathing exercise API
export interface EmotionalState {
  description: string;
  stress_level: number;
  physical_symptoms?: string;
  time_available: number;
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

// API implementation
class BreathingApi {
  private baseUrl: string;

  constructor() {
    // Use environment variable or default to localhost
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }

  async generateExercise(state: EmotionalState): Promise<BreathingPattern> {
    try {
      const response = await fetch(`${this.baseUrl}/breathing/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(state),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error generating breathing exercise:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const breathingApi = new BreathingApi();
