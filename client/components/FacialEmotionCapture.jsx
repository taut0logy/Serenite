'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Upload, RefreshCw, ThumbsUp } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import axios from '@/lib/axios';

const FacialEmotionCapture = ({ isOpen, onClose, onEmotionDetected }) => {
  const [activeTab, setActiveTab] = useState("camera");
  const [cameraStream, setCameraStream] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [detectedEmotion, setDetectedEmotion] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Initialize camera when tab is active
  useEffect(() => {
    if (isOpen && activeTab === "camera") {
      startCamera();
    }
    
    return () => {
      // Cleanup camera stream when component unmounts or when dialog closes
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, activeTab]);
  
  // Start camera
  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      setCameraStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Please check permissions or try the upload option.");
    }
  };
  
  // Capture image from camera
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg');
    setCapturedImage(imageDataUrl);
    
    // Stop camera stream
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };
  
  // Reset camera for another capture
  const resetCamera = () => {
    setCapturedImage(null);
    setDetectedEmotion(null);
    startCamera();
  };
  
  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    setCapturedImage(URL.createObjectURL(file));
    setDetectedEmotion(null);
  };
  
  // Analyze emotion from image (camera or file)
  const analyzeEmotion = async () => {
    if (!capturedImage) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      
      // If from file upload, use the file
      if (activeTab === "upload" && selectedFile) {
        formData.append('file', selectedFile);
      }
      // If from camera, convert data URL to blob
      else if (activeTab === "camera" && capturedImage) {
        const blob = await fetch(capturedImage).then(r => r.blob());
        formData.append('file', blob, 'camera-capture.jpg');
      }
      
      const response = await axios.post('/emotion/detect-face-emotion', formData);
      
      if (response.status !== 200) {
        throw new Error(`Error detecting emotion: ${response.status}`);
      }
      
      setDetectedEmotion(response.data);
    } catch (err) {
      console.error("Error analyzing emotion:", err);
      setError("Failed to detect emotion. Please try again or use a clearer image.");
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
    // Stop camera stream
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    
    // Reset state
    setCapturedImage(null);
    setSelectedFile(null);
    setDetectedEmotion(null);
    setError(null);
    
    // Close dialog
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Detect Facial Emotion</DialogTitle>
          <DialogDescription>
            Take a photo or upload an image to analyze your facial expression
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="camera" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="camera" className="flex items-center">
              <Camera className="h-4 w-4 mr-2" />
              Camera
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="camera" className="mt-0">
            <div className="flex flex-col items-center">
              {!capturedImage ? (
                <>
                  <div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden mb-4 border">
                    {error ? (
                      <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-muted-foreground">
                        {error}
                      </div>
                    ) : (
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  
                  <Button 
                    onClick={captureImage} 
                    className="mb-2"
                    disabled={!cameraStream || error}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Capture Photo
                  </Button>
                </>
              ) : (
                <>
                  <div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden mb-4 border">
                    <img 
                      src={capturedImage} 
                      alt="Captured" 
                      className="w-full h-full object-cover"
                    />
                    
                    {detectedEmotion && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-primary text-primary-foreground px-3 py-1 text-sm font-medium">
                          {detectedEmotion.emotion} 
                          <span className="ml-1 opacity-80">
                            ({Math.round(detectedEmotion.score * 100)}%)
                          </span>
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mb-2">
                    <Button 
                      variant="outline" 
                      onClick={resetCamera}
                      disabled={isLoading}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retake
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
              {!capturedImage ? (
                <>
                  <div 
                    className="w-full aspect-video bg-muted rounded-md overflow-hidden mb-4 border flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-10 w-10 mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Click to upload an image</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, PNG or GIF files
                    </p>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </>
              ) : (
                <>
                  <div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden mb-4 border">
                    <img 
                      src={capturedImage} 
                      alt="Selected" 
                      className="w-full h-full object-cover"
                    />
                    
                    {detectedEmotion && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-primary text-primary-foreground px-3 py-1 text-sm font-medium">
                          {detectedEmotion.emotion} 
                          <span className="ml-1 opacity-80">
                            ({Math.round(detectedEmotion.score * 100)}%)
                          </span>
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mb-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setCapturedImage(null);
                        setSelectedFile(null);
                        setDetectedEmotion(null);
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
        
        {/* Hidden canvas for image capture */}
        <canvas ref={canvasRef} className="hidden" />
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FacialEmotionCapture; 