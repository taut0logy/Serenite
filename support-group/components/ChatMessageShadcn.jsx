import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BeatLoader } from "react-spinners";
import { CornerDownLeft, AlertCircle } from "lucide-react";

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

const ChatMessageShadcn = ({ message }) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';

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
    <div className={cn(
      "group flex gap-3 mb-4 px-1 hover:bg-muted/20 rounded-lg -mx-1 py-1 transition-colors duration-200",
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
          </CardContent>
        </Card>
        
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
  );
};

export default ChatMessageShadcn; 