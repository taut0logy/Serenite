import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { cn } from "@/lib/utils";

const ThinkingProcess = ({ content }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract key points from content
  const extractKeyPoints = (fullContent) => {
    if (!fullContent) return '';
    
    // Format or extract content for the collapsed view
    const sanitized = fullContent.replace(/<[^>]*>/g, '');
    const firstSentenceMatch = sanitized.match(/^([^.!?]+[.!?])/);
    
    if (firstSentenceMatch && firstSentenceMatch[0]) {
      return firstSentenceMatch[0].trim();
    } else if (sanitized.length > 60) {
      return `${sanitized.substring(0, 60).trim()}...`;
    } else {
      return sanitized;
    }
  };
  
  return (
    <div className="my-3 mx-2">
      <Card className={cn(
        "border-l-4 border-l-blue-400 dark:border-l-blue-600 border-blue-100/70 dark:border-blue-900/30 bg-gradient-to-r from-blue-50/80 to-sky-50/50 dark:from-blue-950/10 dark:to-sky-950/5",
        "text-blue-800 dark:text-blue-200 shadow-sm transition-all duration-300",
        isExpanded ? "ring-1 ring-blue-200/50 dark:ring-blue-900/30" : ""
      )}>
        <div 
          className="cursor-pointer p-3 flex items-center justify-between group"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-1.5 rounded-md flex items-center justify-center shadow-sm group-hover:from-blue-600 group-hover:to-indigo-700 transition-colors">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <div>
              <span className="font-medium text-xs text-blue-700 dark:text-blue-300 block">
                AI Thinking Process
              </span>
              {!isExpanded && (
                <p className="text-xs text-blue-600/80 dark:text-blue-400/70 mt-0.5 font-normal">
                  {extractKeyPoints(content)}
                </p>
              )}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0 rounded-full bg-blue-100/60 dark:bg-blue-900/20 hover:bg-blue-200/70 dark:hover:bg-blue-800/40 text-blue-600 dark:text-blue-300" 
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <div className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}>
          <div className="px-3 mx-3 border-t border-blue-100 dark:border-blue-900/30">
            <CardContent className="px-0 py-3 text-xs text-blue-800 dark:text-blue-200 leading-relaxed prose-sm max-w-none dark:prose-invert prose-headings:text-blue-700 dark:prose-headings:text-blue-300 prose-headings:font-medium prose-p:mt-1.5 prose-pre:bg-blue-100/60 dark:prose-pre:bg-blue-900/20 prose-pre:text-blue-800 dark:prose-pre:text-blue-200 prose-pre:border-blue-200/40 dark:prose-pre:border-blue-800/20">
              <div 
                className="whitespace-pre-line" 
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </CardContent>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ThinkingProcess; 