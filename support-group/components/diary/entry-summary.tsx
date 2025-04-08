import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DiaryEntryAnalysis } from '@/lib/diary-api';

interface EntrySummaryProps {
  entry: DiaryEntryAnalysis | null;
}

export function EntrySummary({ entry }: EntrySummaryProps) {
  if (!entry) {
    return null;
  }

  const { summary } = entry;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entry Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {summary.summary}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">Key Points</h3>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            {summary.key_points.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </div>

        {summary.action_items && summary.action_items.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">Action Items</h3>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              {summary.action_items.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 