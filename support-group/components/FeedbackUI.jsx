import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown, Send } from 'lucide-react';
import { cn } from "@/lib/utils";

const FeedbackUI = ({ messageId, onFeedbackSubmit }) => {
  const [feedbackState, setFeedbackState] = useState('initial'); // 'initial', 'positive', 'negative', 'completed'
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (isPositive) => {
    setIsSubmitting(true);
    
    // If positive feedback, submit immediately
    if (isPositive) {
      await onFeedbackSubmit({
        messageId,
        helpful: true,
        improvement: null
      });
      setFeedbackState('completed');
      setIsSubmitting(false);
      return;
    }
    
    // For negative feedback, show the text input
    setFeedbackState('negative');
    setIsSubmitting(false);
  };

  const submitNegativeFeedback = async () => {
    setIsSubmitting(true);
    await onFeedbackSubmit({
      messageId,
      helpful: false,
      improvement: feedbackText.trim() || "No specific feedback provided"
    });
    setFeedbackState('completed');
    setIsSubmitting(false);
  };

  if (feedbackState === 'completed') {
    return (
      <div className="flex justify-center mt-1 mb-3">
        <p className="text-xs text-muted-foreground">
          Thank you for your feedback!
        </p>
      </div>
    );
  }

  return (
    <div className="mt-1 mb-3">
      {feedbackState === 'initial' && (
        <div className="flex flex-col items-center">
          <p className="text-xs text-muted-foreground mb-1.5">
            Was this response helpful?
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 rounded-full bg-background/80 border-muted-foreground/30 hover:bg-green-50 hover:text-green-600 hover:border-green-200 dark:hover:bg-green-900/20 dark:hover:text-green-400",
                isSubmitting ? "opacity-50 pointer-events-none" : ""
              )}
              onClick={() => handleFeedback(true)}
              disabled={isSubmitting}
            >
              <ThumbsUp className="h-3.5 w-3.5 mr-1" />
              <span className="text-xs">Helpful</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 rounded-full bg-background/80 border-muted-foreground/30 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400",
                isSubmitting ? "opacity-50 pointer-events-none" : ""
              )}
              onClick={() => handleFeedback(false)}
              disabled={isSubmitting}
            >
              <ThumbsDown className="h-3.5 w-3.5 mr-1" />
              <span className="text-xs">Not helpful</span>
            </Button>
          </div>
        </div>
      )}

      {feedbackState === 'negative' && (
        <div className="flex flex-col items-center w-full max-w-md mx-auto">
          <p className="text-xs text-muted-foreground mb-1.5 text-center">
            Could you briefly share what could be improved?
          </p>
          <div className="flex gap-2 w-full">
            <Textarea
              placeholder="Your feedback helps us improve..."
              className="text-xs min-h-[60px] resize-none"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
            />
            <Button
              className="h-full aspect-square p-2"
              onClick={submitNegativeFeedback}
              disabled={isSubmitting}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackUI; 