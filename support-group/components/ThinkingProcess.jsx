import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MinusIcon, PlusIcon } from 'lucide-react';

const ThinkingProcess = ({ content }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <Card className="border border-blue-200 bg-blue-50 text-blue-900 mb-4 overflow-hidden">
      <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse"></div>
          <span className="font-medium text-sm text-blue-800">Assistant's Thinking Process</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 w-7 p-0 rounded-full" 
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <MinusIcon className="h-4 w-4 text-blue-600" />
          ) : (
            <PlusIcon className="h-4 w-4 text-blue-600" />
          )}
        </Button>
      </CardHeader>
      
      <CardContent className={`px-3 pb-3 pt-1 text-xs sm:text-sm overflow-hidden transition-all duration-300 ${
        isExpanded ? 'max-h-[500px]' : 'max-h-12'
      }`}>
        <div 
          className="whitespace-pre-line" 
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </CardContent>
    </Card>
  );
};

export default ThinkingProcess; 