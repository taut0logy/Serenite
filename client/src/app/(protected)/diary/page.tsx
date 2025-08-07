"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MoodChart } from "@/components/diary/mood-chart";
// import { MoodAnalysis } from '@/components/diary/mood-analysis';
import { ReflectionPrompts } from "@/components/diary/reflection-prompts";
import {
    diaryApi,
    StoredDiaryEntry,
    MoodAnalysisResult,
} from "@/lib/diary-api";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { format, parse } from "date-fns";

// Function to safely parse date strings in "dd-MM-yyyy" format
function parseDate(dateString: string): Date {
    try {
        console.log("Parsing date:", dateString);
        // Try to parse using date-fns
        const parsedDate = parse(dateString, "dd-MM-yyyy", new Date());
        console.log("Parsed date result:", parsedDate);
        return parsedDate;
    } catch (error) {
        console.error("Failed to parse date:", dateString, error);
        // Return current date if parsing fails
        return new Date();
    }
}

export default function DiaryPage() {
    // Use a hardcoded user ID for now - this can be replaced with actual auth later
    const userId = "1"; // Default user ID for testing

    const [entry, setEntry] = useState<string>("");
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [currentAnalysis, setCurrentAnalysis] =
        useState<MoodAnalysisResult | null>(null);
    const [storedEntry, setStoredEntry] = useState<StoredDiaryEntry | null>(
        null
    );
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [searchResults, setSearchResults] = useState<StoredDiaryEntry[]>([]);
    const [recentEntries, setRecentEntries] = useState<StoredDiaryEntry[]>([]);
    const debouncedEntry = useDebounce(entry, 1000);

    // Load recent entries on page load
    useEffect(() => {
        loadRecentEntries();
    }, []);

    const loadRecentEntries = async () => {
        try {
            const results = await diaryApi.searchEntries({
                query: "recent", // Using a generic term to get recent entries
                userId: userId,
                limit: 10,
            });

            console.log("Recent entries loaded:", results);

            if (results && Array.isArray(results)) {
                setRecentEntries(results);
            } else {
                console.warn(
                    "Received unexpected format for recent entries:",
                    results
                );
                setRecentEntries([]);
            }
        } catch (error) {
            console.error("Error loading recent entries:", error);
            toast.error("Failed to load recent entries");
            setRecentEntries([]);
        }
    };

    // Auto-save functionality (visual indication only)
    useEffect(() => {
        if (debouncedEntry) {
            setIsSaving(true);
            setTimeout(() => setIsSaving(false), 1000);
        }
    }, [debouncedEntry]);

    // Analyze the diary entry
    const analyzeEntry = async () => {
        if (!entry.trim()) {
            toast.error("Please write something before analyzing");
            return;
        }

        setIsAnalyzing(true);
        try {
            const result = await diaryApi.analyzeEntry({
                content: entry,
                date: format(new Date(), "dd-MM-yyyy"),
                user_id: userId,
            });

            setCurrentAnalysis(result);
            toast.success("Entry analyzed successfully");
        } catch (error) {
            console.error("Error analyzing entry:", error);
            toast.error("Failed to analyze entry");
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Save the diary entry
    const saveEntry = async () => {
        if (!entry.trim()) {
            toast.error("Please write something before saving");
            return;
        }

        setIsSaving(true);
        try {
            const result = await diaryApi.storeEntry({
                content: entry,
                date: format(new Date(), "dd-MM-yyyy"),
                user_id: userId,
            });

            setStoredEntry(result);
            setCurrentAnalysis({
                mood: result.mood,
                analysis: result.analysis,
                confidence: result.confidence,
            });

            toast.success("Entry saved successfully");

            // Refresh recent entries
            loadRecentEntries();
        } catch (error) {
            console.error("Error saving entry:", error);
            toast.error("Failed to save entry");
        } finally {
            setIsSaving(false);
        }
    };

    // Search for entries
    const searchEntries = async () => {
        if (!searchQuery.trim()) {
            toast.error("Please enter a search query");
            return;
        }

        try {
            const results = await diaryApi.searchEntries({
                query: searchQuery,
                userId: userId,
                limit: 5,
            });

            setSearchResults(results);
            if (results.length === 0) {
                toast.info("No entries found matching your search");
            }
        } catch (error) {
            console.error("Error searching entries:", error);
            toast.error("Failed to search entries");
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
                                    <CardTitle>
                                        Today&apos;s Reflection
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Textarea
                                        className="min-h-[400px] w-full"
                                        placeholder="Write your thoughts here..."
                                        value={entry}
                                        onChange={(e) =>
                                            setEntry(e.target.value)
                                        }
                                    />
                                    <div className="mt-4 flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">
                                            {isSaving
                                                ? "Saving..."
                                                : "Ready to save"}
                                        </span>
                                        <div className="space-x-2">
                                            <Button
                                                onClick={analyzeEntry}
                                                variant="outline"
                                                disabled={
                                                    isAnalyzing || !entry.trim()
                                                }
                                            >
                                                {isAnalyzing
                                                    ? "Analyzing..."
                                                    : "Analyze Only"}
                                            </Button>
                                            <Button
                                                onClick={saveEntry}
                                                disabled={
                                                    isSaving || !entry.trim()
                                                }
                                            >
                                                {isSaving
                                                    ? "Saving..."
                                                    : "Save Entry"}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Mood Analysis Section */}
                            {currentAnalysis && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Mood Analysis</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div>
                                                <h3 className="font-medium">
                                                    Detected Mood
                                                </h3>
                                                <p className="text-2xl font-bold">
                                                    {currentAnalysis.mood}
                                                </p>
                                                <div className="mt-1 text-sm text-muted-foreground">
                                                    Confidence:{" "}
                                                    {Math.round(
                                                        currentAnalysis.confidence *
                                                            100
                                                    )}
                                                    %
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="font-medium">
                                                    Analysis
                                                </h3>
                                                <p className="text-sm">
                                                    {currentAnalysis.analysis}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Last Saved Entry */}
                            {storedEntry && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Last Saved Entry</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-sm font-medium">
                                            {storedEntry.date}
                                        </div>
                                        <div className="mt-2 text-sm">
                                            <strong>Mood:</strong>{" "}
                                            {storedEntry.mood}
                                        </div>
                                        <div className="mt-4 line-clamp-4 text-sm text-muted-foreground">
                                            {storedEntry.content}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Mood Chart */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Recent Mood Trends</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <MoodChart
                                        data={recentEntries.map((entry) => ({
                                            date: parseDate(entry.date),
                                            mood: entry.mood,
                                            confidence: entry.confidence,
                                        }))}
                                    />
                                </CardContent>
                            </Card>

                            {/* Reflection Prompts */}
                            <ReflectionPrompts
                                prompts={[
                                    "What made me feel this way today?",
                                    "What's one thing I'm grateful for right now?",
                                    "What could I do tomorrow to improve my mood?",
                                    "How does this feeling compare to yesterday?",
                                ]}
                                onSelectPrompt={(prompt) =>
                                    setEntry((entry) => `${entry}\n\n${prompt}`)
                                }
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
                                    placeholder="Search by meaning, e.g. 'days I felt happy'"
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    onKeyDown={(e) =>
                                        e.key === "Enter" && searchEntries()
                                    }
                                />
                                <Button type="submit" onClick={searchEntries}>
                                    <Search className="h-4 w-4 mr-2" />
                                    Search
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {searchResults.map((result) => (
                                    <Card key={result.id}>
                                        <CardContent className="pt-4">
                                            <div className="flex justify-between items-center">
                                                <p className="text-sm text-muted-foreground">
                                                    {result.date}
                                                </p>
                                                <p className="text-sm font-medium bg-primary/10 px-2 py-1 rounded-full">
                                                    {result.mood}
                                                </p>
                                            </div>
                                            <p className="text-sm mt-2">
                                                {result.content}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {result.analysis}
                                            </p>
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
                                <MoodChart
                                    data={recentEntries.map((entry) => ({
                                        date: parseDate(entry.date),
                                        mood: entry.mood,
                                        confidence: entry.confidence,
                                    }))}
                                    fullSize
                                />
                            </div>

                            <div className="mt-6 space-y-4">
                                <h3 className="font-medium">Recent Entries</h3>
                                {recentEntries.slice(0, 5).map((entry) => (
                                    <Card key={entry.id}>
                                        <CardContent className="pt-4">
                                            <div className="flex justify-between items-center">
                                                <p className="text-sm text-muted-foreground">
                                                    {entry.date}
                                                </p>
                                                <p className="text-sm font-medium bg-primary/10 px-2 py-1 rounded-full">
                                                    {entry.mood}
                                                </p>
                                            </div>
                                            <p className="text-sm mt-2 line-clamp-2">
                                                {entry.content}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
