import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DiaryEntryAnalysis } from '@/lib/diary-api';

interface MoodAnalysisProps {
  entry: DiaryEntryAnalysis | null;
}

export function MoodAnalysis({ entry }: MoodAnalysisProps) {
  if (!entry) {
    return null;
  }

  // Get the mood analysis data
  const { mood_analysis } = entry;

  // Helper function to get color based on sentiment
  const getSentimentColor = (score: number) => {
    if (score > 0.3) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    if (score < -0.3) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Emotional Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Overall Mood</h3>
            <Badge 
              variant="outline" 
              className={`text-lg ${getSentimentColor(mood_analysis.sentiment_score)}`}
            >
              {mood_analysis.overall_mood}
            </Badge>
            <div className="mt-2">
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${mood_analysis.sentiment_score > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ 
                    width: `${Math.abs(mood_analysis.sentiment_score) * 100}%`,
                    marginLeft: mood_analysis.sentiment_score < 0 ? 0 : '50%',
                    marginRight: mood_analysis.sentiment_score > 0 ? 0 : '50%',
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
            <h3 className="text-sm font-medium mb-2">Detected Emotions</h3>
            <div className="flex flex-wrap gap-2">
              {mood_analysis.primary_emotions.map((emotion) => (
                <Badge 
                  key={emotion.name} 
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {emotion.name}
                  <span className="text-xs opacity-70">
                    {Math.round(emotion.confidence * 100)}%
                  </span>
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Energy Level</h3>
            <Badge variant="outline">
              {mood_analysis.energy_level}
            </Badge>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">Key Themes</h3>
            <div className="flex flex-wrap gap-2">
              {mood_analysis.key_themes.map((theme) => (
                <Badge key={theme} variant="outline">
                  {theme}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 