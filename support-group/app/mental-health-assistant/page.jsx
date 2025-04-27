'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Mic, 
  Camera, 
  Menu, 
  X, 
  Upload, 
  Settings,
  BookOpen,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Import Shadcn UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Import custom components
import ChatMessageShadcn from '@/components/ChatMessageShadcn';
import ThinkingProcess from '@/components/ThinkingProcess';
import EmotionJournal from '../../components/EmotionJournal';
import EmotionInsights from '../../components/EmotionInsights';

export default function MentalHealthAssistant() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I\'m your mental health assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agentState, setAgentState] = useState(null);
  const [sidebarContent, setSidebarContent] = useState('journal'); // 'journal', 'insights', 'settings', 'resources'
  const [faceEmotion, setFaceEmotion] = useState(null);
  const [voiceEmotion, setVoiceEmotion] = useState(null);
  const [includeFaceEmotion, setIncludeFaceEmotion] = useState(false);
  const [includeVoiceEmotion, setIncludeVoiceEmotion] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUploadMode, setAudioUploadMode] = useState(false);
  const [showAgentReasoning, setShowAgentReasoning] = useState(true);
  const [emotionConfidence, setEmotionConfidence] = useState(null);
  const [mixedEmotionalSignals, setMixedEmotionalSignals] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const router = useRouter();
  const recordingTimerRef = useRef(null);
  const inputRef = useRef(null);

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

  const handleSubmit = async (e) => {
    e?.preventDefault();
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
      
      // Extract emotion confidence and mixed signals information, if available
      if (data.agent_state && data.agent_state.combined_emotion_profile) {
        const profile = data.agent_state.combined_emotion_profile;
        setEmotionConfidence(profile.confidence);
        setMixedEmotionalSignals(profile.mixed_signals || false);
      }
      
      // Filter to only include assistant and function messages, since we already added the user message
      let formattedMessages = data.messages
        .filter(msg => msg.role === 'assistant' || msg.role === 'function')
        .map(msg => ({
          role: msg.role,
          content: msg.content,
          name: msg.name
        }));
      
      // Deduplicate thinking process messages that might be similar
      const functionMessages = formattedMessages.filter(msg => msg.role === 'function');
      const assistantMessages = formattedMessages.filter(msg => msg.role === 'assistant');
      
      // Only keep the last function message of each type (by name)
      const dedupedFunctionMessages = [];
      const seenFunctionNames = new Set();
      
      // Process function messages in reverse (newest first)
      for (let i = functionMessages.length - 1; i >= 0; i--) {
        const msg = functionMessages[i];
        if (!seenFunctionNames.has(msg.name)) {
          dedupedFunctionMessages.unshift(msg); // Add to front to maintain order
          seenFunctionNames.add(msg.name);
        }
      }
      
      // For assistant messages, only keep the last one if there are multiple
      const dedupedAssistantMessages = assistantMessages.length > 0 
        ? [assistantMessages[assistantMessages.length - 1]] 
        : [];
      
      // Combine deduped messages in the right order
      formattedMessages = [...dedupedFunctionMessages, ...dedupedAssistantMessages];
      
      // Filter out function messages if user has disabled agent reasoning
      const messagesToAdd = showAgentReasoning 
        ? formattedMessages 
        : formattedMessages.filter(msg => msg.role !== 'function');
      
      setMessages(prev => [...prev, ...messagesToAdd]);
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
      // Reset emotion analysis data
      setEmotionConfidence(null);
      setMixedEmotionalSignals(false);
      // Focus the input field
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const captureImage = async () => {
    fileInputRef.current?.click();
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
      audioInputRef.current?.click();
    }
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
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

  // Helper to render the sidebar content
  const renderSidebarContent = () => {
    switch (sidebarContent) {
      case 'journal':
        return <EmotionJournal />;
      case 'insights':
        return <EmotionInsights />;
      case 'settings':
        return (
          <div className="p-4 space-y-6">
            <h3 className="text-lg font-semibold">Assistant Settings</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label htmlFor="show-reasoning" className="text-sm font-medium">
                    Show Thinking Process
                  </label>
                  <p className="text-sm text-muted-foreground">
                    See how the assistant analyzes your messages
                  </p>
                </div>
                <Switch
                  id="show-reasoning"
                  checked={showAgentReasoning}
                  onCheckedChange={setShowAgentReasoning}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">About</h4>
                <p className="text-sm text-muted-foreground">
                  This mental health assistant uses AI to provide support and information.
                  It is not a replacement for professional mental health services.
                </p>
              </div>
            </div>
          </div>
        );
      case 'resources':
        return (
          <div className="p-4 space-y-6">
            <h3 className="text-lg font-semibold">Mental Health Resources</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Access helpful resources for mental health support
            </p>
            
            <div className="space-y-4">
              <div className="rounded-lg border p-3">
                <h4 className="font-medium mb-2">Crisis Support</h4>
                <p className="text-sm mb-2">National Mental Health Helpline (Bangladesh): 01688-709965</p>
                <p className="text-sm">Kaan Pete Roi (Emotional Support): 9612119911</p>
              </div>
              
              <Link href="/mental-health-assistant/resources">
                <Button className="w-full">View All Resources</Button>
              </Link>
            </div>
          </div>
        );
      default:
        return <EmotionJournal />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-3 px-4 sm:px-6">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[380px] p-0">
                <SheetHeader className="px-4 py-3 border-b">
                  <SheetTitle>Mental Health Tools</SheetTitle>
                </SheetHeader>
                
                <div className="border-b border-border">
                  <div className="flex p-1">
                    <Button
                      variant={sidebarContent === 'journal' ? 'secondary' : 'ghost'}
                      className="flex-1 justify-start rounded-sm text-sm"
                      onClick={() => setSidebarContent('journal')}
                    >
                      Journal
                    </Button>
                    <Button
                      variant={sidebarContent === 'insights' ? 'secondary' : 'ghost'}
                      className="flex-1 justify-start rounded-sm text-sm"
                      onClick={() => setSidebarContent('insights')}
                    >
                      Insights
                    </Button>
                    <Button
                      variant={sidebarContent === 'settings' ? 'secondary' : 'ghost'}
                      className="flex-1 justify-start rounded-sm text-sm"
                      onClick={() => setSidebarContent('settings')}
                    >
                      Settings
                    </Button>
                    <Button
                      variant={sidebarContent === 'resources' ? 'secondary' : 'ghost'}
                      className="flex-1 justify-start rounded-sm text-sm"
                      onClick={() => setSidebarContent('resources')}
                    >
                      Resources
                    </Button>
                  </div>
                </div>
                
                <ScrollArea className="flex-1 h-[calc(100vh-7rem)]">
                  {renderSidebarContent()}
                </ScrollArea>
              </SheetContent>
            </Sheet>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Mental Health Assistant</h1>
          </div>
          
          <div className="flex items-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/mental-health-assistant/resources">
                    <Button variant="ghost" size="icon">
                      <Info className="h-5 w-5" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Resources</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-8rem)] px-4 py-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((message, index) => (
              <div key={index}>
                {message.role === 'function' ? (
                  <ThinkingProcess content={message.content} />
                ) : (
                  <ChatMessageShadcn message={message} />
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
            
            {/* Loading indicators */}
            {isLoading && !isRecording && (
              <div className="flex justify-center my-4">
                <div className="flex space-x-2">
                  <div className="h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"></div>
                </div>
              </div>
            )}
            
            {/* Recording indicator */}
            {isRecording && (
              <div className="flex justify-center items-center space-x-2 my-4">
                <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-sm">Recording... {recordingTime}s</span>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
        <div className="max-w-3xl mx-auto">
          {/* Emotion indicators */}
          {(faceEmotion || voiceEmotion) && (
            <div className="flex flex-wrap gap-2 mb-2">
              {faceEmotion && (
                <div className={`inline-flex items-center ${includeFaceEmotion ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'} border rounded-full px-2 py-1`}>
                  <input
                    id="include-face"
                    type="checkbox"
                    checked={includeFaceEmotion}
                    onChange={() => setIncludeFaceEmotion(!includeFaceEmotion)}
                    className="h-3 w-3 mr-2"
                  />
                  <label htmlFor="include-face" className="text-xs flex items-center cursor-pointer">
                    <Camera className="h-3 w-3 mr-1" />
                    <span>Face: {faceEmotion.emotion} ({Math.round(faceEmotion.score * 100)}%)</span>
                  </label>
                </div>
              )}
              {voiceEmotion && (
                <div className={`inline-flex items-center ${includeVoiceEmotion ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'} border rounded-full px-2 py-1`}>
                  <input
                    id="include-voice"
                    type="checkbox"
                    checked={includeVoiceEmotion}
                    onChange={() => setIncludeVoiceEmotion(!includeVoiceEmotion)}
                    className="h-3 w-3 mr-2"
                  />
                  <label htmlFor="include-voice" className="text-xs flex items-center cursor-pointer">
                    <Mic className="h-3 w-3 mr-1" />
                    <span>Voice: {voiceEmotion.emotion} ({Math.round(voiceEmotion.score * 100)}%)</span>
                  </label>
                </div>
              )}
            </div>
          )}
          
          {/* Confidence indicator */}
          {emotionConfidence && (
            <div className={`mb-2 text-xs px-2 py-0.5 rounded-full inline-flex items-center ${
              emotionConfidence === 'high' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' :
              emotionConfidence === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200' : 
              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              <span className="mr-1 text-xs">
                {mixedEmotionalSignals ? 'Mixed emotional signals detected' : 'Emotion confidence:'}
              </span>
              <span className="font-medium text-xs">{emotionConfidence}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading || isRecording}
                className="pr-24"
              />
              
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex space-x-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8" 
                        onClick={captureImage}
                        disabled={isLoading || isRecording}
                      >
                        <Camera className={`h-4 w-4 ${includeFaceEmotion ? 'text-blue-500' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Analyze facial emotion</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8" 
                        onClick={toggleAudioUploadMode}
                        disabled={isLoading || isRecording}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Upload audio</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        type="button" 
                        variant={isRecording ? "destructive" : "ghost"} 
                        size="icon" 
                        className={`h-8 w-8 ${includeVoiceEmotion ? 'text-green-500' : ''}`} 
                        onClick={handleVoiceButton}
                        disabled={isLoading && !isRecording}
                      >
                        <Mic className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isRecording ? "Stop recording" : "Record voice"}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <Button 
              type="submit" 
              size="icon"
              disabled={isLoading || isRecording || (!input.trim() && !faceEmotion && !voiceEmotion)}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
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
