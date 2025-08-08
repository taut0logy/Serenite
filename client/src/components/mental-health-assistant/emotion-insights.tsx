'use client';

import { useState, useEffect } from 'react';
import axios from '@/lib/axios';

interface EmotionInsightsData {
  description?: string;
  mental_health_implications?: string | string[];
  coping_strategies?: string | string[];
  professional_support?: string;
  self_care?: string | string[];
}

export default function EmotionInsights() {
  const [selectedEmotionType, setSelectedEmotionType] = useState<string>('face');
  const [selectedEmotion, setSelectedEmotion] = useState<string>('happy');
  const [insights, setInsights] = useState<EmotionInsightsData | string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Emotion options by type
  const emotionOptions = {
    face: ['happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised', 'neutral'],
    voice: ['happy', 'sad', 'angry', 'fearful', 'neutral', 'calm', 'surprised']
  };

  // Fetch insights when emotion type or emotion changes
  useEffect(() => {
    fetchInsights(selectedEmotionType, selectedEmotion);
  }, [selectedEmotionType, selectedEmotion]);

  const fetchInsights = async (emotionType, emotion) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`/emotion/insights/${emotionType}/${emotion}`);

      if (response.status !== 200) {
        throw new Error(`Failed to fetch insights: ${response.status}`);
      }

      const data = response.data;
      setInsights(data);
    } catch (error) {
      console.error('Error fetching emotion insights:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Function to format insights data for display
  const formatInsights = (insights) => {
    if (!insights) return null;

    // Handle string response
    if (typeof insights === 'string') {
      return <p className="text-gray-700">{insights}</p>;
    }

    // Handle object response with various fields
    return (
      <div>
        {insights.description && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
            <p className="text-gray-600">{insights.description}</p>
          </div>
        )}
        
        {insights.mental_health_implications && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-1">Mental Health Implications</h4>
            {Array.isArray(insights.mental_health_implications) ? (
              <ul className="list-disc pl-5 text-gray-600 space-y-1">
                {insights.mental_health_implications.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">{insights.mental_health_implications}</p>
            )}
          </div>
        )}
        
        {insights.coping_strategies && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-1">Coping Strategies</h4>
            {Array.isArray(insights.coping_strategies) ? (
              <ul className="list-disc pl-5 text-gray-600 space-y-1">
                {insights.coping_strategies.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">{insights.coping_strategies}</p>
            )}
          </div>
        )}
        
        {insights.professional_support && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-1">Professional Support</h4>
            <p className="text-gray-600">{insights.professional_support}</p>
          </div>
        )}
        
        {insights.self_care && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Self-Care Recommendations</h4>
            {Array.isArray(insights.self_care) ? (
              <ul className="list-disc pl-5 text-gray-600 space-y-1">
                {insights.self_care.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">{insights.self_care}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-2">Emotion Insights</h3>
      <p className="text-sm text-gray-500 mb-4">
        Learn about different emotions and their implications for mental health
      </p>
      
      {/* Emotion type selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Emotion Source
        </label>
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 rounded-md ${
              selectedEmotionType === 'face' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-800'
            }`}
            onClick={() => setSelectedEmotionType('face')}
          >
            Facial Expression
          </button>
          <button
            className={`px-3 py-1 rounded-md ${
              selectedEmotionType === 'voice' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-800'
            }`}
            onClick={() => setSelectedEmotionType('voice')}
          >
            Voice Tone
          </button>
        </div>
      </div>
      
      {/* Emotion selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select Emotion
        </label>
        <select
          value={selectedEmotion}
          onChange={(e) => setSelectedEmotion(e.target.value)}
          className="block w-full px-3 py-2 bg-white border border-gray-300 dark:bg-gray-800 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          title="Select emotion to analyze"
        >
          {emotionOptions[selectedEmotionType].map((emotion) => (
            <option key={emotion} value={emotion}>
              {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
            </option>
          ))}
        </select>
      </div>
      
      {/* Insights display */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h4 className="font-medium mb-3 flex items-center">
          <span className="capitalize">{selectedEmotionType}</span> Emotion: 
          <span className="ml-2 capitalize font-bold text-blue-600">{selectedEmotion}</span>
        </h4>
        
        {loading ? (
          <div className="py-4 text-center">
            <div className="animate-pulse inline-block h-6 w-6 rounded-full bg-blue-400 dark:bg-blue-600 opacity-75"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-200 text-sm">Loading insights...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-800 p-3 rounded-md">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
            <p className="text-red-600 dark:text-red-300 text-xs mt-1">
              Please make sure the server is running and supports this emotion type.
            </p>
          </div>
        ) : (
          <div className="text-sm *:text-gray-700 dark:text-gray-300">
            {formatInsights(insights)}
          </div>
        )}
      </div>
    </div>
  );
} 