'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, Upload, RefreshCw, ThumbsUp, StopCircle, Play, Pause } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import axios from '@/lib/axios';

const VoiceEmotionCapture = ({ isOpen, onClose, onEmotionDetected }) => {
  const [activeTab, setActiveTab] = useState("record");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [detectedEmotion, setDetectedEmotion] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationFrameRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Set up audio visualization
  useEffect(() => {
    if (isOpen && activeTab === "record" && canvasRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        const bufferLength = analyserRef.current.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(bufferLength);
      } catch (err) {
        console.error("Error setting up audio context:", err);
      }
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(err => console.error(err));
      }
    };
  }, [isOpen, activeTab]);
  
  // Clean up audio resources on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);
  
  // Start recording
  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio visualization
      if (audioContextRef.current && analyserRef.current) {
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        visualize();
      }
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        
        // Stop all tracks in the stream
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Start recording
      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Start timer
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Could not access microphone. Please check permissions or try the upload option.");
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Clear timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      // Stop visualization
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };
  
  // Reset recording
  const resetRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    setAudioBlob(null);
    setAudioUrl(null);
    setDetectedEmotion(null);
    setIsPlaying(false);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };
  
  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setAudioBlob(file);
    setAudioUrl(url);
    setDetectedEmotion(null);
    setIsPlaying(false);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };
  
  // Toggle audio playback
  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    
    setIsPlaying(!isPlaying);
  };
  
  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };
  
  // Audio visualization
  const visualize = () => {
    if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      
      ctx.fillStyle = 'rgb(18, 18, 18)';
      ctx.fillRect(0, 0, width, height);
      
      const barWidth = (width / dataArrayRef.current.length) * 2.5;
      let barHeight;
      let x = 0;
      
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        barHeight = dataArrayRef.current[i] / 2;
        
        const r = 100 + (barHeight / 2);
        const g = 50;
        const b = 200;
        
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
    };
    
    draw();
  };
  
  // Analyze emotion from audio
  const analyzeEmotion = async () => {
    if (!audioBlob) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', audioBlob);

      const response = await axios.post('/chat/analyze-voice', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.status !== 200) {
        throw new Error(`Error detecting emotion: ${response.status}`);
      }
      
      const data = await response.json();
      setDetectedEmotion(data);
    } catch (err) {
      console.error("Error analyzing voice emotion:", err);
      setError("Failed to detect emotion. Please try again or use a clearer recording.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Confirm and send emotion data
  const confirmEmotion = () => {
    if (detectedEmotion) {
      onEmotionDetected(detectedEmotion);
      onClose();
    }
  };
  
  // Handle dialog close
  const handleClose = () => {
    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }
    
    // Stop playback
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    // Clean up audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    // Reset state
    setAudioBlob(null);
    setAudioUrl(null);
    setSelectedFile(null);
    setDetectedEmotion(null);
    setIsPlaying(false);
    setError(null);
    
    // Close dialog
    onClose();
  };
  
  // Handle audio end event
  const handleAudioEnd = () => {
    setIsPlaying(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Detect Voice Emotion</DialogTitle>
          <DialogDescription>
            Record your voice or upload an audio file to analyze your emotional tone
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="record" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="record" className="flex items-center">
              <Mic className="h-4 w-4 mr-2" />
              Record
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="record" className="mt-0">
            <div className="flex flex-col items-center">
              {!audioUrl ? (
                <>
                  <div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden mb-4 border">
                    {error ? (
                      <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-muted-foreground">
                        {error}
                      </div>
                    ) : (
                      <>
                        <canvas 
                          ref={canvasRef} 
                          width="600" 
                          height="200" 
                          className="w-full h-full"
                        />
                        
                        {isRecording ? (
                          <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center">
                            <span className="h-2 w-2 rounded-full bg-white mr-2 animate-pulse"></span>
                            Recording {formatTime(recordingTime)}
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-muted-foreground">
                              {!error && "Press the button below to start recording"}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  <Button 
                    onClick={isRecording ? stopRecording : startRecording} 
                    variant={isRecording ? "destructive" : "default"}
                    className="mb-2"
                    disabled={error}
                  >
                    {isRecording ? (
                      <>
                        <StopCircle className="h-4 w-4 mr-2" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4 mr-2" />
                        Start Recording
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-full bg-muted rounded-md overflow-hidden mb-4 border p-4">
                    <div className="flex justify-between items-center mb-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 p-0 rounded-full" 
                        onClick={togglePlayback}
                      >
                        {isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <div className="flex-1 mx-4">
                        <audio 
                          ref={audioRef} 
                          src={audioUrl} 
                          onEnded={handleAudioEnd} 
                          className="hidden"
                        />
                        <Progress value={isPlaying ? 50 : 0} className="h-2" />
                      </div>
                      
                      {detectedEmotion && (
                        <Badge className="bg-primary text-primary-foreground px-3 py-1 text-sm font-medium">
                          {detectedEmotion.emotion} 
                          <span className="ml-1 opacity-80">
                            ({Math.round(detectedEmotion.score * 100)}%)
                          </span>
                        </Badge>
                      )}
                    </div>
                    
                    {detectedEmotion?.insights && (
                      <div className="bg-muted/50 p-3 rounded-md text-sm text-muted-foreground">
                        <p className="text-xs italic">{detectedEmotion.insights.description}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mb-2">
                    <Button 
                      variant="outline" 
                      onClick={resetRecording}
                      disabled={isLoading}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Record Again
                    </Button>
                    
                    {!detectedEmotion ? (
                      <Button 
                        onClick={analyzeEmotion}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>Analyze Emotion</>
                        )}
                      </Button>
                    ) : (
                      <Button 
                        onClick={confirmEmotion}
                        disabled={isLoading}
                      >
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        Confirm
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="upload" className="mt-0">
            <div className="flex flex-col items-center">
              {!audioUrl ? (
                <>
                  <div 
                    className="w-full aspect-video bg-muted rounded-md overflow-hidden mb-4 border flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-10 w-10 mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Click to upload an audio file</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      WAV, MP3 or M4A files
                    </p>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </>
              ) : (
                <>
                  <div className="w-full bg-muted rounded-md overflow-hidden mb-4 border p-4">
                    <div className="flex justify-between items-center mb-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 p-0 rounded-full" 
                        onClick={togglePlayback}
                      >
                        {isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <div className="flex-1 mx-4">
                        <audio 
                          ref={audioRef} 
                          src={audioUrl} 
                          onEnded={handleAudioEnd} 
                          className="hidden"
                        />
                        <Progress value={isPlaying ? 50 : 0} className="h-2" />
                      </div>
                      
                      {detectedEmotion && (
                        <Badge className="bg-primary text-primary-foreground px-3 py-1 text-sm font-medium">
                          {detectedEmotion.emotion} 
                          <span className="ml-1 opacity-80">
                            ({Math.round(detectedEmotion.score * 100)}%)
                          </span>
                        </Badge>
                      )}
                    </div>
                    
                    {detectedEmotion?.insights && (
                      <div className="bg-muted/50 p-3 rounded-md text-sm text-muted-foreground">
                        <p className="text-xs italic">{detectedEmotion.insights.description}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mb-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        if (audioUrl) {
                          URL.revokeObjectURL(audioUrl);
                        }
                        setAudioBlob(null);
                        setAudioUrl(null);
                        setSelectedFile(null);
                        setDetectedEmotion(null);
                        setIsPlaying(false);
                      }}
                      disabled={isLoading}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Choose Another
                    </Button>
                    
                    {!detectedEmotion ? (
                      <Button 
                        onClick={analyzeEmotion}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>Analyze Emotion</>
                        )}
                      </Button>
                    ) : (
                      <Button 
                        onClick={confirmEmotion}
                        disabled={isLoading}
                      >
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        Confirm
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 p-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceEmotionCapture; 