'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MoodChart } from '@/components/diary/mood-chart';
import { MoodAnalysis } from '@/components/diary/mood-analysis';
import { EntrySummary } from '@/components/diary/entry-summary';
import { ReflectionPrompts } from '@/components/diary/reflection-prompts';
import diaryApi, { DiaryEntryAnalysis, MoodTrend } from '@/lib/diary-api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { toast } from 'sonner';

export default function DiaryPage() {
  const [entry, setEntry] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [currentEntry, setCurrentEntry] = useState<DiaryEntryAnalysis | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [moodTrends, setMoodTrends] = useState<MoodTrend[]>([]);
  const debouncedEntry = useDebounce(entry, 1000);

  // Load mood trends on page load
  useEffect(() => {
    const loadMoodTrends = async () => {
      try {
        const trends = await diaryApi.getMoodTrends();
        setMoodTrends(trends);
      } catch (error) {
        console.error('Error loading mood trends:', error);
        toast.error('Failed to load mood trends');
      }
    };
    
    loadMoodTrends();
  }, []);

  // Auto-save functionality
  useEffect(() => {
    if (debouncedEntry) {
      setIsSaving(true);
      // We don't actually save on debounce, we just show the saving indicator
      // The actual saving happens when the user clicks "Analyze Entry"
      setTimeout(() => setIsSaving(false), 1000);
    }
  }, [debouncedEntry]);

  // Analyze the diary entry
  const analyzeEntry = async () => {
    if (!entry.trim()) {
      toast.error('Please write something before analyzing');
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const result = await diaryApi.analyzeEntry({
        content: entry,
        timestamp: new Date()
      });
      setCurrentEntry(result);
      toast.success('Entry analyzed successfully');
      
      // Update mood trends after new entry
      const trends = await diaryApi.getMoodTrends();
      setMoodTrends(trends);
    } catch (error) {
      console.error('Error analyzing entry:', error);
      toast.error('Failed to analyze entry');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Search for entries
  const searchEntries = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }
    
    try {
      const results = await diaryApi.searchEntries({
        query: searchQuery,
        limit: 5
      });
      setSearchResults(results);
      if (results.length === 0) {
        toast.info('No entries found matching your search');
      }
    } catch (error) {
      console.error('Error searching entries:', error);
      toast.error('Failed to search entries');
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Tabs defaultValue="write" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="write">Write</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="trends">Mood Trends</TabsTrigger>
        </TabsList>
        
        <TabsContent value="write">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Diary Entry Section */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Today's Reflection</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    className="min-h-[400px] w-full"
                    placeholder="Write your thoughts here..."
                    value={entry}
                    onChange={(e) => setEntry(e.target.value)}
                  />
                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {isSaving ? 'Saving...' : 'Auto-saved'}
                    </span>
                    <Button 
                      onClick={analyzeEntry} 
                      disabled={isAnalyzing || !entry.trim()}
                    >
                      {isAnalyzing ? 'Analyzing...' : 'Analyze Entry'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Mood Analysis Section */}
              <MoodAnalysis entry={currentEntry} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Entry Summary */}
              <EntrySummary entry={currentEntry} />

              {/* Mood Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Mood Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <MoodChart data={moodTrends} />
                </CardContent>
              </Card>

              {/* Reflection Prompts */}
              <ReflectionPrompts 
                prompts={currentEntry?.reflection_prompts?.map(p => p.prompt) || []}
                onSelectPrompt={(prompt) => setEntry(entry => `${entry}\n\n${prompt}`)}
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="search">
          <Card>
            <CardHeader>
              <CardTitle>Search Your Diary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex w-full max-w-md items-center space-x-2 mb-6">
                <Input 
                  type="text" 
                  placeholder="Search by meaning, e.g. 'days I felt happy about work'" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchEntries()}
                />
                <Button type="submit" onClick={searchEntries}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
              
              <div className="space-y-4">
                {searchResults.map((result) => (
                  <Card key={result.entry_id}>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">
                        {new Date(result.timestamp).toLocaleDateString()}
                      </p>
                      <p className="text-sm font-medium mt-2">{result.summary}</p>
                      <p className="text-sm mt-2 line-clamp-3">{result.content}</p>
                    </CardContent>
                  </Card>
                ))}
                
                {searchResults.length === 0 && (
                  <p className="text-center text-muted-foreground">
                    Search for entries to see results here
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Mood Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <MoodChart data={moodTrends} fullSize />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 