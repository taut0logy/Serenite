'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  ArrowUpIcon, 
  MicrophoneIcon, 
  CameraIcon, 
  BookOpenIcon, 
  Bars3Icon, 
  XMarkIcon,
  PaperAirplaneIcon,
  InformationCircleIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import ChatMessage from '../../components/ChatMessage';
import { useRouter } from 'next/navigation';
import EmotionJournal from '../../components/EmotionJournal';
import Link from 'next/link';
import EmotionInsights from '../../components/EmotionInsights';

export default function MentalHealthAssistant() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I\'m your mental health assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agentState, setAgentState] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarContent, setSidebarContent] = useState('journal'); // 'journal', 'insights', 'settings'
  const [faceEmotion, setFaceEmotion] = useState(null);
  const [voiceEmotion, setVoiceEmotion] = useState(null);
  const [includeFaceEmotion, setIncludeFaceEmotion] = useState(false);
  const [includeVoiceEmotion, setIncludeVoiceEmotion] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUploadMode, setAudioUploadMode] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const router = useRouter();
  const recordingTimerRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup the recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const setSidebar = (content) => {
    setSidebarContent(content);
    setSidebarOpen(true);
  };

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    if (!input.trim() && !faceEmotion && !voiceEmotion) return;

    // Add user message to chat
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Prepare request with emotions if available
      const requestBody = {
        message: input,
        agent_state: agentState,
        include_face_emotion: includeFaceEmotion && faceEmotion !== null,
        face_emotion: includeFaceEmotion ? faceEmotion : null,
        include_voice_emotion: includeVoiceEmotion && voiceEmotion !== null,
        voice_emotion: includeVoiceEmotion ? voiceEmotion : null
      };

      // Make API request
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      
      // Update agent state
      setAgentState(data.agent_state);
      
      // Add assistant's response to chat
      const assistantMessages = data.messages
        .filter(msg => msg.role === 'assistant')
        .map(msg => ({ role: 'assistant', content: msg.content }));
      
      if (assistantMessages.length > 0) {
        setMessages(prev => [...prev, ...assistantMessages]);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again later.' 
      }]);
    } finally {
      setInput('');
      setIsLoading(false);
      // Reset emotion data after sending
      if (includeFaceEmotion) setFaceEmotion(null);
      if (includeVoiceEmotion) setVoiceEmotion(null);
      setIncludeFaceEmotion(false);
      setIncludeVoiceEmotion(false);
    }
  };

  const captureImage = async () => {
    fileInputRef.current.click();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:8000/detect-face-emotion', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setFaceEmotion(data);
      setIncludeFaceEmotion(true);
      
      // Notify user
      setMessages(prev => [
        ...prev, 
        { 
          role: 'system', 
          content: `Detected facial emotion: ${data.emotion} (confidence: ${Math.round(data.score * 100)}%)` 
        }
      ]);

      // Add emotion to journal
      addEmotionToJournal(data.emotion, data.score, "Automatically detected from facial expression", "face");
    } catch (error) {
      console.error('Error detecting emotion:', error);
      setMessages(prev => [
        ...prev, 
        { 
          role: 'system', 
          content: 'Failed to detect facial emotion. Please try again.' 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAudioUploadMode = () => {
    setAudioUploadMode(!audioUploadMode);
    if (!audioUploadMode) {
      // Switching to upload mode
      audioInputRef.current.click();
    }
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setAudioFile(file);
    analyzeUploadedVoice(file);
  };

  const analyzeUploadedVoice = async (file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsLoading(true);
      setMessages(prev => [...prev, { role: 'system', content: 'Analyzing uploaded audio...' }]);
      
      const response = await fetch('http://localhost:8000/analyze-voice', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setVoiceEmotion(data);
      setIncludeVoiceEmotion(true);
      
      // Update the message
      setMessages(prev => [
        ...prev.slice(0, -1), 
        { 
          role: 'system', 
          content: `Detected voice emotion: ${data.emotion} (confidence: ${Math.round(data.score * 100)}%)` 
        }
      ]);

      // Add emotion to journal
      addEmotionToJournal(data.emotion, data.score, "Automatically detected from voice", "voice");
    } catch (error) {
      console.error('Error analyzing voice:', error);
      setMessages(prev => [
        ...prev.slice(0, -1), 
        { 
          role: 'system', 
          content: 'Failed to analyze voice recording. Please try again.' 
        }
      ]);
    } finally {
      setIsLoading(false);
      setAudioFile(null);
    }
  };

  const startRecording = async () => {
    if (isRecording) return;
    
    try {
      setIsLoading(true);
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start a timer to track recording time
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      setMessages(prev => [...prev, { role: 'system', content: 'Recording your voice... (press the microphone again to stop)' }]);
    } catch (error) {
      console.error('Error starting recording:', error);
      setMessages(prev => [
        ...prev, 
        { 
          role: 'system', 
          content: 'Failed to start voice recording. This feature may require microphone permissions.' 
        }
      ]);
      setIsRecording(false);
      setIsLoading(false);
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    
    try {
      // Clear the timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      setMessages(prev => [
        ...prev.slice(0, -1), 
        { 
          role: 'system', 
          content: 'Processing your recording...' 
        }
      ]);

      // In a real implementation, we would upload the browser-recorded audio here
      // For this implementation, we'll use the server's record-voice endpoint
      const response = await fetch(`http://localhost:8000/record-voice?duration=${recordingTime > 0 ? recordingTime : 5}`, {
        method: 'POST',
      });

      const data = await response.json();
      setVoiceEmotion(data);
      setIncludeVoiceEmotion(true);
      
      setMessages(prev => [
        ...prev.slice(0, -1), 
        { 
          role: 'system', 
          content: `Detected voice emotion: ${data.emotion} (confidence: ${Math.round(data.score * 100)}%)` 
        }
      ]);

      // Add emotion to journal
      addEmotionToJournal(data.emotion, data.score, "Automatically detected from voice recording", "voice");
    } catch (error) {
      console.error('Error with voice recording:', error);
      setMessages(prev => [
        ...prev.slice(0, -1), 
        { 
          role: 'system', 
          content: 'Failed to process voice recording. You can try uploading an audio file instead.' 
        }
      ]);
    } finally {
      setIsRecording(false);
      setIsLoading(false);
      setRecordingTime(0);
    }
  };

  const handleVoiceButton = () => {
    if (audioUploadMode) {
      toggleAudioUploadMode();
      return;
    }
    
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const addEmotionToJournal = async (emotion, score, note, source) => {
    try {
      const entry = {
        emotion: emotion,
        score: score,
        note: note,
        source: source,
        timestamp: new Date().toISOString()
      };
      
      await fetch('http://localhost:8000/emotion-journal/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });
      
      // No need to show feedback as this happens automatically
    } catch (error) {
      console.error('Error adding to emotion journal:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-xl transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out`}
      >
        <div className="h-full flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Mental Health Tools</h2>
            <button onClick={toggleSidebar} className="text-gray-500 hover:text-gray-700">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          {/* Sidebar navigation */}
          <div className="border-b border-gray-200">
            <div className="px-2 py-2 flex space-x-1">
              <button 
                onClick={() => setSidebarContent('journal')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md ${
                  sidebarContent === 'journal' 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Journal
              </button>
              <button 
                onClick={() => setSidebarContent('insights')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md ${
                  sidebarContent === 'insights' 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Insights
              </button>
              <button 
                onClick={() => setSidebarContent('resources')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md ${
                  sidebarContent === 'resources' 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Resources
              </button>
            </div>
          </div>
          
          {/* Sidebar content */}
          <div className="flex-1 overflow-y-auto">
            {sidebarContent === 'journal' && <EmotionJournal />}
            {sidebarContent === 'insights' && <EmotionInsights />}
            {sidebarContent === 'resources' && (
              <div className="p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Mental Health Resources</h3>
                <p className="text-gray-600 mb-4">
                  Access a comprehensive list of mental health resources including crisis contacts and support organizations.
                </p>
                <Link 
                  href="/mental-health-assistant/resources"
                  className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md text-center hover:bg-blue-700"
                >
                  View All Resources
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <div className="flex items-center">
              <button 
                onClick={toggleSidebar}
                className="mr-4 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Mental Health Assistant</h1>
            </div>
            <div className="flex space-x-2">
              <Link 
                href="/mental-health-assistant/resources"
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <InformationCircleIcon className="h-4 w-4 mr-1" />
                Resources
              </Link>
            </div>
          </div>
        </header>

        {/* Chat window */}
        <div className="flex-1 flex flex-col bg-white shadow-sm rounded-lg my-4 mx-4 overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            <div ref={messagesEndRef} />
            
            {/* Loading indicator */}
            {isLoading && !isRecording && (
              <div className="flex justify-center">
                <div className="animate-pulse flex space-x-2">
                  <div className="h-2 w-2 bg-gray-500 rounded-full"></div>
                  <div className="h-2 w-2 bg-gray-500 rounded-full"></div>
                  <div className="h-2 w-2 bg-gray-500 rounded-full"></div>
                </div>
              </div>
            )}
            
            {/* Recording indicator */}
            {isRecording && (
              <div className="flex justify-center items-center space-x-3">
                <div className="animate-pulse flex h-3 w-3 bg-red-600 rounded-full"></div>
                <span className="text-gray-700">Recording... {recordingTime}s</span>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full p-3 pr-24 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading || isRecording}
                />
                <div className="absolute right-2 top-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={captureImage}
                    className={`p-1 rounded-full hover:bg-gray-100 ${isLoading || isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isLoading || isRecording}
                    title="Analyze facial emotion"
                  >
                    <CameraIcon className="h-5 w-5 text-gray-500" />
                  </button>
                  <button
                    type="button"
                    onClick={toggleAudioUploadMode}
                    className={`p-1 rounded-full hover:bg-gray-100 ${isLoading || isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isLoading || isRecording}
                    title="Upload audio file"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-gray-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handleVoiceButton}
                    className={`p-1 rounded-full ${
                      isRecording 
                        ? 'bg-red-100 hover:bg-red-200' 
                        : 'hover:bg-gray-100'
                    } ${isLoading && !isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isLoading && !isRecording}
                    title={isRecording ? "Stop recording" : "Record voice"}
                  >
                    <MicrophoneIcon className={`h-5 w-5 ${isRecording ? 'text-red-600' : 'text-gray-500'}`} />
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className={`bg-blue-600 p-3 rounded-lg text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  (isLoading || isRecording || (!input.trim() && !faceEmotion && !voiceEmotion)) 
                    ? 'opacity-50 cursor-not-allowed' 
                    : ''
                }`}
                disabled={isLoading || isRecording || (!input.trim() && !faceEmotion && !voiceEmotion)}
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </form>
            
            {/* Emotion indicators */}
            <div className="mt-2 flex flex-wrap gap-2">
              {faceEmotion && (
                <div className="flex items-center bg-blue-50 px-2 py-1 rounded-full">
                  <input
                    id="include-face"
                    type="checkbox"
                    checked={includeFaceEmotion}
                    onChange={() => setIncludeFaceEmotion(!includeFaceEmotion)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="include-face" className="ml-2 text-sm text-gray-700">
                    Face: {faceEmotion.emotion} ({Math.round(faceEmotion.score * 100)}%)
                  </label>
                </div>
              )}
              {voiceEmotion && (
                <div className="flex items-center bg-green-50 px-2 py-1 rounded-full">
                  <input
                    id="include-voice"
                    type="checkbox"
                    checked={includeVoiceEmotion}
                    onChange={() => setIncludeVoiceEmotion(!includeVoiceEmotion)}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label htmlFor="include-voice" className="ml-2 text-sm text-gray-700">
                    Voice: {voiceEmotion.emotion} ({Math.round(voiceEmotion.score * 100)}%)
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleAudioUpload}
      />
    </div>
  );
}
