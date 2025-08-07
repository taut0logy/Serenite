import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BeatLoader } from "react-spinners";
import { CornerDownLeft, AlertCircle, Languages, Maximize, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import FeedbackUI from './FeedbackUI';
import axios from '@/lib/axios';

// Function to extract YouTube video ID from a URL
const extractYouTubeId = (url) => {
  if (!url) return null;
  
  // Match standard YouTube URLs
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  
  return (match && match[2].length === 11) ? match[2] : null;
};

// Function to safely render content that might contain HTML and embedded videos
const renderContent = (content) => {
  if (!content) return { __html: "" };
  
  // First, check for YouTube links
  const youtubeRegex = /(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
  let processedContent = content;
  let youtubeMatches = [];
  let match;
  
  // Find all YouTube links and store them
  while ((match = youtubeRegex.exec(content)) !== null) {
    youtubeMatches.push({
      fullUrl: match[0],
      videoId: match[4]
    });
  }
  
  // First, replace YouTube links with placeholders to avoid conflicting with other link processing
  youtubeMatches.forEach((match, index) => {
    processedContent = processedContent.replace(
      match.fullUrl, 
      `__YOUTUBE_EMBED_${index}__`
    );
  });
  
  // Then process regular links
  const linkRegex = /(https?:\/\/[^\s]+)/g;
  processedContent = processedContent.replace(
    linkRegex, 
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80 inline-flex items-center gap-1">$1 <span class="inline-block"><ExternalLink size={12} /></span></a>'
  );
  
  // Finally, replace the YouTube placeholders with actual embed code
  youtubeMatches.forEach((match, index) => {
    const embedCode = `
      <div class="youtube-embed-container my-3">
        <div class="youtube-embed-ratio">
          <iframe 
            width="100%" 
            height="100%" 
            src="https://www.youtube.com/embed/${match.videoId}" 
            title="YouTube video player" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen
            class="rounded-md shadow-md border border-muted"
          ></iframe>
        </div>
      </div>
    `;
    processedContent = processedContent.replace(`__YOUTUBE_EMBED_${index}__`, embedCode);
  });
  
  return { __html: processedContent };
};

const ChatMessageShadcn = ({ message, onFeedbackSubmit, messageIndex }) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';
  const [showFeedback, setShowFeedback] = useState(isAssistant);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedContent, setTranslatedContent] = useState("");
  const [fullscreenContent, setFullscreenContent] = useState(false);

  // Check if message contains YouTube URLs
  const hasYouTubeVideo = isAssistant && message.content && 
    /(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/.test(message.content);

  // Hide feedback UI after user sends a new message
  const handleFeedbackSubmitted = async (feedbackData) => {
    if (onFeedbackSubmit) {
      // Add message content and index to the feedback data
      const enhancedFeedback = {
        ...feedbackData,
        messageIndex,
        messageContent: message.content
      };
      await onFeedbackSubmit(enhancedFeedback);
    }
    // Feedback has been submitted, no need to toggle visibility since FeedbackUI handles its own state
  };

  // Handle translation request
  const handleTranslate = async () => {
    // If we already have a translation, just toggle visibility
    if (translatedContent) {
      setShowTranslation(!showTranslation);
      return;
    }

    setIsTranslating(true);
    try {
      const response = await axios.post('/chat/translate', {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          text: message.content,
          text: message.content,
          target_language: 'bn'  // 'bn' is the language code for Bengali/Bangla
        },
      });

      if (response.status !== 200) {
        throw new Error('Translation failed');
      }

      const data = await response.data;
      setTranslatedContent(data.translated_text);
      setShowTranslation(true);
    } catch (error) {
      console.error('Error translating message:', error);
      alert('Failed to translate the message. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const toggleFullscreen = () => {
    setFullscreenContent(!fullscreenContent);
  };

  if (isSystem) {
    return (
      <div className="flex items-center justify-center my-3">
        <div className="flex items-center gap-2 bg-muted/50 text-muted-foreground text-xs rounded-full px-4 py-1.5 max-w-[85%] border border-muted/30">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{message.content}</span>
        </div>
      </div>
    );
  }

  const userImagePath = "/images/avatars/user-avatar.png";
  const assistantImagePath = "/images/avatars/assistant-avatar.png";

  return (
    <div className={cn("mb-3", fullscreenContent ? "fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-6" : "")}>
      <div className={cn(
        "group flex gap-3 mb-1 px-1 hover:bg-muted/20 rounded-lg -mx-1 py-1 transition-colors duration-200",
        isUser ? "justify-end" : "justify-start",
        fullscreenContent ? "max-w-4xl w-full mx-auto" : ""
      )}>
        {isAssistant && (
          <Avatar className="h-8 w-8 mt-1 border flex-shrink-0 shadow-sm">
            <AvatarImage 
              src={assistantImagePath} 
              alt="Assistant" 
              className="object-cover"
            />
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs">
              AI
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className={cn("flex flex-col", fullscreenContent ? "max-w-full w-full" : "max-w-[80%]")}>
          <div className={cn(
            "px-1 pb-0.5 text-xs font-medium opacity-0 group-hover:opacity-70 transition-opacity",
            isUser ? "text-right" : "text-left"
          )}>
            {isUser ? "You" : "Mental Health Assistant"}
          </div>
          
          <Card className={cn(
            "shadow-sm overflow-hidden",
            isUser 
              ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground border-primary/10" 
              : "bg-card border-card/80"
          )}>
            <CardContent className={cn(
              "p-3 text-sm leading-relaxed",
              isUser ? "" : "prose-sm prose max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border"
            )}>
              {message.content && (
                <div 
                  className={cn(
                    "message-content",
                    hasYouTubeVideo && "has-video",
                    fullscreenContent && "max-h-[80vh] overflow-y-auto custom-scrollbar px-2"
                  )} 
                  dangerouslySetInnerHTML={renderContent(message.content)} 
                />
              )}
              
              {/* Show translated content if available and if showTranslation is true */}
              {isAssistant && showTranslation && translatedContent && (
                <div className="mt-3 pt-3 border-t border-muted">
                  <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center">
                    <Languages className="h-3 w-3 mr-1 text-blue-500" />
                    Bengali Translation:
                  </p>
                  <div className="whitespace-pre-wrap text-blue-700 dark:text-blue-300">{translatedContent}</div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Message actions row */}
          <div className="flex justify-end mt-1 space-x-2">
            {/* Translation button for assistant messages */}
            {isAssistant && (
              <>
                {isTranslating ? (
                  <div className="text-xs text-muted-foreground flex items-center">
                    <BeatLoader size={4} color="currentColor" />
                    <span className="ml-2">Translating...</span>
                  </div>
                ) : (
                  <>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleTranslate} 
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    >
                      <Languages className="h-3 w-3 mr-1" />
                      {showTranslation && translatedContent ? "Hide Translation" : "Translate"}
                    </Button>
                    
                    {/* Only show fullscreen button if message has substantial content */}
                    {message.content && message.content.length > 50 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={toggleFullscreen} 
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      >
                        <Maximize className="h-3 w-3 mr-1" />
                        {fullscreenContent ? "Exit Fullscreen" : "Expand"}
                      </Button>
                    )}
                  </>
                )}
              </>
            )}
            
            {isUser && (
              <div className="flex justify-end text-xs text-muted-foreground opacity-0 group-hover:opacity-70 transition-opacity">
                <CornerDownLeft className="h-3 w-3 mr-1" />
                <span>Sent</span>
              </div>
            )}
          </div>
        </div>
        
        {isUser && (
          <Avatar className="h-8 w-8 mt-1 border flex-shrink-0 shadow-sm">
            <AvatarImage 
              src={userImagePath} 
              alt="You" 
              className="object-cover"
            />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white text-xs">
              You
            </AvatarFallback>
          </Avatar>
        )}
      </div>
      
      {/* Close button for fullscreen mode */}
      {fullscreenContent && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 h-8 w-8 p-0 rounded-full"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      
      {isAssistant && showFeedback && onFeedbackSubmit && !fullscreenContent && (
        <FeedbackUI 
          messageId={messageIndex} 
          onFeedbackSubmit={handleFeedbackSubmitted} 
        />
      )}
      
      {/* Add styles for YouTube embeds */}
      <style jsx global>{`
        .youtube-embed-container {
          position: relative;
          width: 100%;
          margin: 0.75rem 0;
        }
        
        .youtube-embed-ratio {
          position: relative;
          width: 100%;
          padding-bottom: 56.25%; /* 16:9 Aspect Ratio */
        }
        
        .youtube-embed-ratio iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 0.5rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(155, 155, 155, 0.5);
          border-radius: 20px;
        }
        
        .has-video a {
          word-break: break-all;
        }
      `}</style>
    </div>
  );
};

export default ChatMessageShadcn; 