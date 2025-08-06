'use client';

import { useState, useEffect } from 'react';
import { PlusCircleIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import axios from '@/lib/axios';

export default function EmotionJournal() {
  const [entries, setEntries] = useState([]);
  const [patterns, setPatterns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState('happy');
  const [source, setSource] = useState('manual');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  // List of emotions that can be selected manually
  const emotions = [
    'happy', 'sad', 'angry', 'fearful', 
    'disgusted', 'surprised', 'neutral', 
    'anxious', 'stressed', 'calm'
  ];

  // Emotion colors for visual indication
  const emotionColors = {
    happy: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    sad: 'bg-blue-100 border-blue-300 text-blue-800',
    angry: 'bg-red-100 border-red-300 text-red-800',
    fearful: 'bg-purple-100 border-purple-300 text-purple-800',
    disgusted: 'bg-green-100 border-green-300 text-green-800',
    surprised: 'bg-indigo-100 border-indigo-300 text-indigo-800',
    neutral: 'bg-gray-100 border-gray-300 text-gray-800',
    anxious: 'bg-orange-100 border-orange-300 text-orange-800',
    stressed: 'bg-pink-100 border-pink-300 text-pink-800',
    calm: 'bg-teal-100 border-teal-300 text-teal-800'
  };

  // Fetch journal entries
  useEffect(() => {
    fetchJournal();
  }, []);

  const fetchJournal = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/emotion-journal');
      const data = response.data;

      setEntries(data.entries.reverse()); // Show newest first
      setPatterns(data.patterns);
    } catch (error) {
      console.error('Error fetching emotion journal:', error);
      showNotification('Failed to load journal entries', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    
    if (!selectedEmotion) {
      showNotification('Please select an emotion', 'error');
      return;
    }
    
    try {
      setSubmitting(true);
      const entry = {
        emotion: selectedEmotion,
        score: 0.9, // Default score for manual entries
        note: note,
        source: source,
        timestamp: new Date().toISOString()
      };

      const response = await axios.post('/emotion-journal/add', entry);
      if (response.status !== 200) {
        throw new Error('Failed to add entry');
      }

      if (response.data.success) {
        // Reset form
        setNote('');
        setShowForm(false);
        showNotification('Entry added successfully', 'success');
        // Refresh journal
        fetchJournal();
      } else {
        throw new Error('Failed to add entry');
      }
    } catch (error) {
      console.error('Error adding emotion journal entry:', error);
      showNotification('Failed to add entry', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Format timestamp string
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    // Parse the timestamp (handle both string and object formats)
    let date;
    if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      date = new Date(
        timestamp.year, 
        timestamp.month - 1, 
        timestamp.day, 
        timestamp.hour, 
        timestamp.minute
      );
    }
    
    return date.toLocaleString();
  };

  // Get emotion label with first letter capitalized
  const getEmotionLabel = (emotion) => {
    return emotion.charAt(0).toUpperCase() + emotion.slice(1);
  };

  // Get the appropriate color class for an emotion
  const getEmotionColorClass = (emotion) => {
    return emotionColors[emotion.toLowerCase()] || 'bg-gray-100 border-gray-300 text-gray-800';
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Emotion Journal</h2>
          <p className="text-sm text-gray-500">Track your emotional states over time</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusCircleIcon className="h-4 w-4 mr-1" />
            Add Entry
          </button>
        )}
      </div>
      
      {/* Notification */}
      {notification && (
        <div className={`mx-4 mt-2 p-2 rounded-md ${
          notification.type === 'success' ? 'bg-green-50 text-green-800' :
          notification.type === 'error' ? 'bg-red-50 text-red-800' :
          'bg-blue-50 text-blue-800'
        }`}>
          <p className="text-sm font-medium">{notification.message}</p>
        </div>
      )}
      
      {/* Add new entry form */}
      {showForm && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-gray-700">New Journal Entry</h3>
            <button 
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          
          <form onSubmit={handleAddEntry}>
            <div className="space-y-4">
              <div>
                <label htmlFor="emotion" className="block text-sm font-medium text-gray-700">
                  How are you feeling?
                </label>
                <select
                  id="emotion"
                  value={selectedEmotion}
                  onChange={(e) => setSelectedEmotion(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  {emotions.map((emotion) => (
                    <option key={emotion} value={emotion}>
                      {getEmotionLabel(emotion)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="note" className="block text-sm font-medium text-gray-700">
                  Note (optional)
                </label>
                <textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Add a note about how you're feeling..."
                />
              </div>
              
              <div>
                <label htmlFor="source" className="block text-sm font-medium text-gray-700">
                  Source
                </label>
                <select
                  id="source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="manual">Manual Entry</option>
                  <option value="face">Face Analysis</option>
                  <option value="voice">Voice Analysis</option>
                </select>
              </div>
              
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
      
      {/* Pattern analysis */}
      {patterns && (
        <div className="p-4 bg-blue-50 border-b border-gray-200">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Emotion Patterns</h3>
          <div className="text-sm text-blue-700">
            {patterns.most_common && (
              <div className="mb-2">
                <span className="font-medium">Most common emotion:</span>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${getEmotionColorClass(patterns.most_common)}`}>
                  {getEmotionLabel(patterns.most_common)}
                </span>
              </div>
            )}
            
            {patterns.time_patterns && (
              <div>
                <p className="font-medium mb-1">Time patterns:</p>
                <ul className="space-y-1 ml-2">
                  <li className="flex items-center">
                    <span className="w-24 text-xs">Morning:</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      getEmotionColorClass(patterns.time_patterns.morning)
                    }`}>
                      {patterns.time_patterns.morning}
                    </span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-24 text-xs">Afternoon:</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      getEmotionColorClass(patterns.time_patterns.afternoon)
                    }`}>
                      {patterns.time_patterns.afternoon}
                    </span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-24 text-xs">Evening:</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      getEmotionColorClass(patterns.time_patterns.evening)
                    }`}>
                      {patterns.time_patterns.evening}
                    </span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Journal entries */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6.8 2.99 1.95 3.99m8.155-3.99c0 1.6.8 2.99 1.95 3.99m-9.3 0h9.3m-9.3 0c-1.65 1.0-2.65 2.99-2.65 4.99h14c-.0-1.99-1.0-3.99-2.65-4.99zm-1.95-3.99c0-3.09 1.65-5.99 4.5-5.99 2.95 0 4.5 2.9 4.5 5.99m-9.0 0h9.0" />
              </svg>
            </div>
            <p className="text-gray-500">No entries yet</p>
            <p className="text-sm text-gray-400 mt-1">Start tracking your emotional journey</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusCircleIcon className="h-5 w-5 mr-1" />
              Add Your First Entry
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {entries.map((entry, index) => (
              <li key={index} className="hover:bg-gray-50">
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEmotionColorClass(entry.emotion)}`}>
                        {getEmotionLabel(entry.emotion)}
                      </span>
                      <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {entry.source.charAt(0).toUpperCase() + entry.source.slice(1)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </div>
                  
                  {entry.note && (
                    <p className="mt-2 text-sm text-gray-600">{entry.note}</p>
                  )}
                  
                  <div className="mt-1 text-xs text-gray-500">
                    Confidence: {Math.round(entry.score * 100)}%
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 