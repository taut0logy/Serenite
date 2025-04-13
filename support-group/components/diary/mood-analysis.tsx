import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MoodAnalysisResult } from '@/lib/diary-api';

interface MoodAnalysisProps {
  entry: MoodAnalysisResult | null;
}

export function MoodAnalysis({ entry }: MoodAnalysisProps) {
  if (!entry) {
    return null;
  }

  // Helper function to get color based on mood
  const getMoodColor = (mood: string) => {
    const normalizedMood = mood.toLowerCase();
    
    if (normalizedMood.includes('happy') || normalizedMood.includes('excited') || normalizedMood.includes('joy')) {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    }
    
    if (normalizedMood.includes('sad') || normalizedMood.includes('depressed') || normalizedMood.includes('anxious') || normalizedMood.includes('angry')) {
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    }
    
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
  };

  // Helper function to map mood to sentiment score (for visualization)
  const moodToSentiment = (mood: string): number => {
    const normalizedMood = mood.toLowerCase();
    
    if (normalizedMood.includes('happy') || normalizedMood.includes('excited') || normalizedMood.includes('joy')) {
      return 0.7;
    }
    
    if (normalizedMood.includes('calm') || normalizedMood.includes('content')) {
      return 0.3;
    }
    
    if (normalizedMood.includes('sad') || normalizedMood.includes('depressed') || normalizedMood.includes('anxious')) {
      return -0.7;
    }
    
    if (normalizedMood.includes('angry') || normalizedMood.includes('frustrated')) {
      return -0.5;
    }
    
    return 0; // Neutral
  };

  const sentimentScore = moodToSentiment(entry.mood);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mood Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Detected Mood</h3>
            <Badge 
              variant="outline" 
              className={`text-lg ${getMoodColor(entry.mood)}`}
            >
              {entry.mood}
            </Badge>
            <div className="mt-2">
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${sentimentScore > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ 
                    width: `${Math.abs(sentimentScore) * 100}%`,
                    marginLeft: sentimentScore < 0 ? 0 : '50%',
                    marginRight: sentimentScore > 0 ? 0 : '50%',
                  }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Negative</span>
                <span>Neutral</span>
                <span>Positive</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">Confidence</h3>
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500"
                  style={{ width: `${entry.confidence * 100}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium">
                {Math.round(entry.confidence * 100)}%
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Analysis</h3>
            <p className="text-sm text-muted-foreground">
              {entry.analysis}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 