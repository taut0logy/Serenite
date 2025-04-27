import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BeatLoader } from "react-spinners";
import { CornerDownLeft, AlertCircle, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import FeedbackUI from './FeedbackUI';

// Function to safely render content that might contain HTML
const renderContent = (content) => {
  if (!content) return { __html: "" };
  
  // Convert links to anchor tags
  const linkRegex = /(https?:\/\/[^\s]+)/g;
  const contentWithLinks = content.replace(
    linkRegex, 
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80">$1</a>'
  );
  
  return { __html: contentWithLinks };
};

const ChatMessageShadcn = ({ message, onFeedbackSubmit, messageIndex }) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';
  const [showFeedback, setShowFeedback] = useState(isAssistant);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedContent, setTranslatedContent] = useState("");

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
      const response = await fetch('http://localhost:8000/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: message.content,
          target_language: 'bn'  // 'bn' is the language code for Bengali/Bangla
        }),
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      setTranslatedContent(data.translated_text);
      setShowTranslation(true);
    } catch (error) {
      console.error('Error translating message:', error);
      alert('Failed to translate the message. Please try again.');
    } finally {
      setIsTranslating(false);
    }
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
    <div className="mb-1">
      <div className={cn(
        "group flex gap-3 mb-1 px-1 hover:bg-muted/20 rounded-lg -mx-1 py-1 transition-colors duration-200",
        isUser ? "justify-end" : "justify-start"
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
        
        <div className="flex flex-col max-w-[80%]">
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
              {message.content && message.content.includes("<") ? (
                <div dangerouslySetInnerHTML={renderContent(message.content)} />
              ) : (
                <div className="whitespace-pre-wrap">{message.content}</div>
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
          
          {/* Translation button for assistant messages */}
          {isAssistant && (
            <div className="flex justify-end mt-1 space-x-2">
              {isTranslating ? (
                <div className="text-xs text-muted-foreground flex items-center">
                  <BeatLoader size={4} color="currentColor" />
                  <span className="ml-2">Translating to Bengali...</span>
                </div>
              ) : (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleTranslate} 
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <Languages className="h-3 w-3 mr-1" />
                  {showTranslation && translatedContent ? "Hide Bengali Translation" : "Translate to Bengali"}
                </Button>
              )}
            </div>
          )}
          
          {isUser && (
            <div className="flex justify-end text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-70 transition-opacity">
              <CornerDownLeft className="h-3 w-3 mr-1" />
              <span>Sent</span>
            </div>
          )}
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
      
      {isAssistant && showFeedback && onFeedbackSubmit && (
        <FeedbackUI 
          messageId={messageIndex} 
          onFeedbackSubmit={handleFeedbackSubmitted} 
        />
      )}
    </div>
  );
};

export default ChatMessageShadcn; 