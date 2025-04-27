import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ChatMessageShadcn = ({ message }) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';
  
  // Function to render markdown content safely
  const renderContent = (content) => {
    return { __html: content };
  };

  if (isSystem) {
    return (
      <div className="flex items-center justify-center my-4">
        <div className="bg-gray-100 text-gray-600 text-sm rounded-full px-4 py-2 max-w-[80%]">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex gap-3 mb-4",
      isUser ? "justify-end" : "justify-start"
    )}>
      {isAssistant && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src="/assistant-avatar.png" alt="AI" />
          <AvatarFallback className="bg-primary/10 text-primary text-sm">AI</AvatarFallback>
        </Avatar>
      )}
      
      <Card className={cn(
        "max-w-[80%] shadow-sm",
        isUser ? "bg-primary text-primary-foreground" : "bg-card"
      )}>
        <CardContent className="p-3 text-sm sm:text-base">
          {message.content.includes("<") ? (
            <div dangerouslySetInnerHTML={renderContent(message.content)} />
          ) : (
            <div className="whitespace-pre-wrap">{message.content}</div>
          )}
        </CardContent>
      </Card>
      
      {isUser && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src="/user-avatar.png" alt="You" />
          <AvatarFallback className="bg-zinc-200 text-zinc-900 text-sm">You</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default ChatMessageShadcn; 