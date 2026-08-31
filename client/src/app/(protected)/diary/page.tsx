"use client";

import { useCallback, useEffect, useState } from "react";
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
import { ReflectionPrompts } from "@/components/diary/reflection-prompts";
import {
    deleteDiaryEntry,
    listDiaryEntries,
    saveDiaryEntry,
    searchDiaryEntries,
} from "@/actions/diary.actions";
import { openEntries, sealEntry } from "@/lib/diary/crypto";
import type { DiaryEntryView, MoodView } from "@/lib/diary/types";
import { useEncryption } from "@/providers/encryption-provider";
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
    // The key that opens the diary. Held only for this session, in this
    // browser; the server has no copy and cannot read an entry back.
    const { masterKey, isUnlocked } = useEncryption();

    const [entry, setEntry] = useState<string>("");
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [currentAnalysis, setCurrentAnalysis] = useState<MoodView | null>(null);
    const [storedEntries, setStoredEntries] = useState<DiaryEntryView[]>([]);
    const [selectedEntryId, setSelectedEntryId] = useState<string | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [unreadable, setUnreadable] = useState(0);

    const debouncedSearch = useDebounce(searchQuery, 400);

    const loadRecentEntries = useCallback(async () => {
        if (!masterKey) return;
        setIsLoading(true);
        const result = await listDiaryEntries(30);
        if (result.success) {
            const { opened, unreadable: skipped } = await openEntries(result.data, masterKey);
            setStoredEntries(opened);
            setUnreadable(skipped);
        } else {
            toast.error(result.error);
        }
        setIsLoading(false);
    }, [masterKey]);

    useEffect(() => {
        loadRecentEntries();
    }, [loadRecentEntries]);

    // Search runs on the server against embeddings and comes back as
    // ciphertext, which is opened here. An empty box means "show me
    // everything" rather than "search for nothing".
    useEffect(() => {
        if (!masterKey) return;
        let cancelled = false;

        (async () => {
            if (debouncedSearch.trim().length === 0) {
                await loadRecentEntries();
                return;
            }
            const result = await searchDiaryEntries(debouncedSearch, 20);
            if (cancelled) return;
            if (result.success) {
                const { opened } = await openEntries(result.data, masterKey);
                setStoredEntries(opened);
            } else {
                toast.error(result.error);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [debouncedSearch, masterKey, loadRecentEntries]);

    const saveEntry = async () => {
        if (!masterKey) {
            toast.error("Unlock your vault before saving");
            return;
        }
        const plainText = stripHtml(entry);
        if (!plainText.trim() && !entry.includes("<img")) {
            toast.error("Cannot save an empty entry");
            return;
        }

        setIsSaving(true);
        try {
            // Sealed here, in the browser. What crosses the wire is ciphertext
            // plus one copy of the text for scoring, which is never stored.
            const sealed = await sealEntry(entry, masterKey);
            const result = await saveDiaryEntry({
                ...sealed,
                plaintext: plainText,
                entryDate: new Date().toISOString(),
                entryId: selectedEntryId,
            });

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            const saved: DiaryEntryView = {
                id: result.data.id,
                content: entry,
                mood: result.data.mood,
                confidence: result.data.confidence,
                entryDate: new Date(result.data.entryDate),
                createdAt: new Date(result.data.createdAt),
            };

            setStoredEntries((prev) =>
                selectedEntryId
                    ? prev.map((e) => (e.id === saved.id ? saved : e))
                    : [saved, ...prev]
            );
            setSelectedEntryId(saved.id);
            setCurrentAnalysis(
                saved.mood ? { mood: saved.mood, confidence: saved.confidence ?? 0 } : null
            );
            toast.success(saved.mood ? "Entry saved" : "Entry saved, but it could not be scored");
        } catch (error) {
            console.error("Error saving entry:", error);
            toast.error("Could not save your entry");
        } finally {
            setIsSaving(false);
        }
    };

    const removeEntry = async (entryId: string) => {
        const result = await deleteDiaryEntry(entryId);
        if (!result.success) {
            toast.error(result.error);
            return;
        }
        setStoredEntries((prev) => prev.filter((e) => e.id !== entryId));
        if (selectedEntryId === entryId) handleCreateNew();
        toast.success("Entry deleted");
    };

    const handleSelectEntry = (selectedEntry: DiaryEntryView) => {
        setSelectedEntryId(selectedEntry.id);
        setEntry(selectedEntry.content);
        setCurrentAnalysis(
            selectedEntry.mood
                ? { mood: selectedEntry.mood, confidence: selectedEntry.confidence ?? 0 }
                : null
        );
    };

    const handleCreateNew = () => {
        setSelectedEntryId(undefined);
        setEntry("");
        setCurrentAnalysis(null);
    };

    // Without the key there is nothing to show: entries on the server are
    // ciphertext, and this is the only place they can be opened.
    if (!isUnlocked) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center px-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Your diary is locked</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Entries are encrypted with a key only this browser holds, so they cannot
                        be shown until you unlock your vault with your password.
                    </CardContent>
                </Card>
            </div>
        );
    }

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
                    onSearchChange={setSearchQuery}
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
                             <Button onClick={saveEntry} disabled={isSaving}>
                                {isSaving ? "Saving..." : "Save Entry"}
                                <Save className="ml-2 h-4 w-4" />
                             </Button>
                        </div>
                    </div>

                    {unreadable > 0 && (
                        <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-muted-foreground">
                            {unreadable} earlier {unreadable === 1 ? "entry" : "entries"} cannot be
                            opened with your current key. That happens after a password reset, and
                            the text cannot be recovered.
                        </p>
                    )}

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
                    isAnalyzing={isSaving}
                />
             </div>
        </div>
    );
}
