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
import { Editor } from "@/components/diary/editor";
import { DiarySidebar } from "@/components/diary/diary-sidebar";
import { DiaryInsights } from "@/components/diary/diary-insights";
import { PanelLeftClose, PanelLeftOpen, Save } from "lucide-react";

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

// Helper to strip HTML for analysis
function stripHtml(html: string) {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

export default function DiaryPage() {
    const userId = "1"; // Default user ID for testing

    const [entry, setEntry] = useState<string>("");
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [currentAnalysis, setCurrentAnalysis] =
        useState<MoodAnalysisResult | null>(null);
    const [storedEntries, setStoredEntries] = useState<StoredDiaryEntry[]>([]);
    const [selectedEntryId, setSelectedEntryId] = useState<string | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const debouncedEntry = useDebounce(entry, 1500); // Debounce for auto-save

    // Load recent entries on page load
    useEffect(() => {
        loadRecentEntries();
    }, []);

    // Auto-save effect
    useEffect(() => {
        // Only auto-save if content exists and changed (rudimentary check via debounce)
        // In a real app we'd check if it's dirty.
        if (debouncedEntry && !selectedEntryId) {
             // Optional: Implement better auto-save logic
        }
    }, [debouncedEntry, selectedEntryId]);

    const loadRecentEntries = async () => {
        try {
            const results = await diaryApi.searchEntries({
                query: "", // Empty query returns all entries
                userId: userId,
                limit: 20,
            });
            if (results && Array.isArray(results)) {
                setStoredEntries(results);
            }
        } catch (error) {
            console.error("Error loading entries:", error);
            toast.error("Failed to load entries");
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        
        try {
            const results = await diaryApi.searchEntries({
                query, // Pass actual query, even if empty
                userId,
                limit: 20,
            });
            setStoredEntries(results);
        } catch (error) {
            console.error("Error searching:", error);
        }
    };

     const analyzeEntry = async () => {
        const plainText = stripHtml(entry);
        if (!plainText.trim()) {
            toast.error("Please write something before analyzing");
            return;
        }

        setIsAnalyzing(true);
        try {
            const result = await diaryApi.analyzeEntry({
                content: plainText,
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

    const saveEntry = async () => {
        const plainText = stripHtml(entry);
        if (!plainText.trim() && !entry.includes("<img")) {
             toast.error("Cannot save empty entry");
             return;
        }

        setIsSaving(true);
        try {
            const result = await diaryApi.storeEntry({
                content: entry, // Save HTML content
                date: format(new Date(), "dd-MM-yyyy"),
                user_id: userId,
            });
            
            // If we just saved a new entry, add it to the list and select it
            if (!selectedEntryId) {
                 setStoredEntries([result, ...storedEntries]);
                 setSelectedEntryId(result.id);
            } else {
                 // Update existing in list
                 setStoredEntries(storedEntries.map(e => e.id === result.id ? result : e));
            }

            // Also analyze it if storing
            const analysisResult = await diaryApi.analyzeEntry({
                 content: plainText,
                 date: format(new Date(), "dd-MM-yyyy"),
                 user_id: userId,
            });
            setCurrentAnalysis(analysisResult);

            toast.success("Entry saved successfully");
        } catch (error) {
            console.error("Error saving entry:", error);
            toast.error("Failed to save entry");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSelectEntry = (selectedEntry: StoredDiaryEntry) => {
        console.log("Selected entry:", selectedEntry.id, "has_img:", selectedEntry.content?.includes("<img"), "content_len:", selectedEntry.content?.length);
        setSelectedEntryId(selectedEntry.id);
        setEntry(selectedEntry.content);
        setCurrentAnalysis({
            mood: selectedEntry.mood,
            analysis: selectedEntry.analysis,
            confidence: selectedEntry.confidence,
        });
    };

    const handleCreateNew = () => {
        setSelectedEntryId(undefined);
        setEntry("");
        setCurrentAnalysis(null);
    };

    return (
        <div className="h-[calc(100vh-4rem)] w-full bg-background flex overflow-hidden">
            {/* Sidebar - Collapsible */}
            <div 
                className={`flex-shrink-0 transition-all duration-300 ease-in-out border-r bg-card/50 backdrop-blur-sm ${
                    sidebarOpen ? "w-80" : "w-0 opacity-0 overflow-hidden"
                }`}
            >
                <DiarySidebar
                    entries={storedEntries}
                    selectedId={selectedEntryId}
                    onSelect={handleSelectEntry}
                    onCreateNew={handleCreateNew}
                    searchQuery={searchQuery}
                    onSearchChange={handleSearch}
                />
            </div>

            {/* Main Editor Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-background/50 relative">
                 {/* Toggle Sidebar Button */}
                 <div className="absolute left-4 top-4 z-10">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
                    </Button>
                </div>

                <div className="flex-1 p-6 lg:p-10 flex flex-col max-w-4xl mx-auto w-full h-full">
                    <div className="flex justify-between items-center mb-6 pl-10">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                {selectedEntryId ? "Edit Entry" : "New Entry"}
                            </h1>
                             <p className="text-muted-foreground text-sm">
                                {format(new Date(), "EEEE, MMMM do, yyyy")}
                             </p>
                        </div>
                        <div className="flex gap-2">
                             <Button
                                onClick={analyzeEntry}
                                variant="secondary"
                                disabled={isAnalyzing}
                             >
                                {isAnalyzing ? "Analyzing..." : "Analyze Mood"}
                             </Button>
                             <Button onClick={saveEntry} disabled={isSaving}>
                                {isSaving ? "Saving..." : "Save Entry"}
                                <Save className="ml-2 h-4 w-4" />
                             </Button>
                        </div>
                    </div>

                    <div className="flex-1 bg-card rounded-xl shadow-sm border overflow-hidden">
                        <Editor 
                            content={entry} 
                            onChange={setEntry} 
                            isSaving={isSaving}
                        />
                    </div>
                </div>
            </div>

             {/* Right Sidebar - Insights */}
             <div className="w-80 border-l bg-card/30 backdrop-blur-sm hidden xl:block p-4">
                <DiaryInsights 
                    currentAnalysis={currentAnalysis}
                    recentEntries={storedEntries}
                    isAnalyzing={isAnalyzing}
                />
             </div>
        </div>
    );
}
