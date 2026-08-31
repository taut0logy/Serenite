"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
    BarChart3,
    Check,
    Loader2,
    Lock,
    Menu,
    Save,
    Trash2,
} from "lucide-react";

import { useDebounce } from "@/hooks/use-debounce";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEncryption } from "@/providers/encryption-provider";
import {
    deleteDiaryEntry,
    listDiaryEntries,
    saveDiaryEntry,
    searchDiaryEntries,
} from "@/actions/diary.actions";
import { openEntries, sealEntry } from "@/lib/diary/crypto";
import type { DiaryEntryView, MoodView } from "@/lib/diary/types";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Editor } from "@/components/diary/editor";
import { DiarySidebar } from "@/components/diary/diary-sidebar";
import { DiaryInsights } from "@/components/diary/diary-insights";

/** Rich text in, plain text out, for scoring and for the word count. */
function stripHtml(html: string): string {
    if (typeof document === "undefined") return html.replace(/<[^>]*>/g, " ");
    const el = document.createElement("div");
    el.innerHTML = html;
    return el.textContent || el.innerText || "";
}

function isEmptyEntry(html: string): boolean {
    return !stripHtml(html).trim() && !html.includes("<img");
}

function countWords(html: string): number {
    const text = stripHtml(html).trim();
    return text ? text.split(/\s+/).length : 0;
}

/** What a click is waiting on, when it has to wait for a confirmation first. */
type PendingAction =
    | { kind: "delete"; entry: DiaryEntryView }
    | { kind: "discard"; then: () => void };

export default function DiaryPage() {
    // The key that opens the diary. Held only for this session, in this
    // browser; the server has no copy and cannot read an entry back.
    const { masterKey, isUnlocked } = useEncryption();
    const isMobile = useIsMobile();

    const [entry, setEntry] = useState("");
    const [savedContent, setSavedContent] = useState("");
    const [selectedEntryId, setSelectedEntryId] = useState<string | undefined>(undefined);
    const [selectedEntryDate, setSelectedEntryDate] = useState<Date | null>(null);

    const [storedEntries, setStoredEntries] = useState<DiaryEntryView[]>([]);
    const [currentAnalysis, setCurrentAnalysis] = useState<MoodView | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [unreadable, setUnreadable] = useState(0);

    const [searchQuery, setSearchQuery] = useState("");
    const [navOpen, setNavOpen] = useState(false);
    const [insightsOpen, setInsightsOpen] = useState(false);
    const [pending, setPending] = useState<PendingAction | null>(null);

    const debouncedSearch = useDebounce(searchQuery, 400);

    // Compared against the last saved text rather than tracked with a flag: a
    // flag drifts out of step with what is actually on screen, and this is the
    // thing that guards against losing writing.
    const isDirty = entry !== savedContent && !isEmptyEntry(entry);
    const wordCount = useMemo(() => countWords(entry), [entry]);

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
                setIsSearching(false);
                await loadRecentEntries();
                return;
            }
            setIsSearching(true);
            const result = await searchDiaryEntries(debouncedSearch, 20);
            if (cancelled) return;
            if (result.success) {
                const { opened } = await openEntries(result.data, masterKey);
                setStoredEntries(opened);
            } else {
                toast.error(result.error);
            }
            setIsSearching(false);
        })();

        return () => {
            cancelled = true;
        };
    }, [debouncedSearch, masterKey, loadRecentEntries]);

    // Browser-level guard. Covers refresh and tab close, which no in-app
    // confirmation can intercept.
    useEffect(() => {
        if (!isDirty) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, [isDirty]);

    const saveEntry = useCallback(async () => {
        if (!masterKey) {
            toast.error("Unlock your vault before saving");
            return;
        }
        if (isEmptyEntry(entry)) {
            toast.error("Nothing to save yet");
            return;
        }

        setIsSaving(true);
        try {
            // Sealed here, in the browser. What crosses the wire is ciphertext
            // plus one copy of the text for scoring, which is never stored.
            const sealed = await sealEntry(entry, masterKey);
            const result = await saveDiaryEntry({
                ...sealed,
                plaintext: stripHtml(entry),
                // Editing keeps the day it was written. Sending today's date on
                // every save silently re-dated old entries, which moved them in
                // the list and bent the mood trend they contribute to.
                entryDate: (selectedEntryDate ?? new Date()).toISOString(),
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
                prev.some((e) => e.id === saved.id)
                    ? prev.map((e) => (e.id === saved.id ? saved : e))
                    : [saved, ...prev]
            );
            setSelectedEntryId(saved.id);
            setSelectedEntryDate(saved.entryDate);
            setSavedContent(entry);
            setLastSavedAt(new Date());
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
    }, [entry, masterKey, selectedEntryDate, selectedEntryId]);

    // Ctrl/Cmd+S, because people who write reach for it without thinking, and
    // in a browser it otherwise opens a save-page dialog over their diary.
    const saveRef = useRef(saveEntry);
    saveRef.current = saveEntry;
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                saveRef.current();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    const openEntry = useCallback((selected: DiaryEntryView) => {
        setSelectedEntryId(selected.id);
        setSelectedEntryDate(selected.entryDate);
        setEntry(selected.content);
        setSavedContent(selected.content);
        setLastSavedAt(null);
        setCurrentAnalysis(
            selected.mood ? { mood: selected.mood, confidence: selected.confidence ?? 0 } : null
        );
    }, []);

    const startNewEntry = useCallback(() => {
        setSelectedEntryId(undefined);
        setSelectedEntryDate(null);
        setEntry("");
        setSavedContent("");
        setLastSavedAt(null);
        setCurrentAnalysis(null);
    }, []);

    /** Runs `action`, but asks first if it would throw away unsaved writing. */
    const guard = useCallback(
        (action: () => void) => {
            if (isDirty) setPending({ kind: "discard", then: action });
            else action();
        },
        [isDirty]
    );

    const handleSelect = useCallback(
        (selected: DiaryEntryView) => {
            guard(() => {
                openEntry(selected);
                setNavOpen(false);
            });
        },
        [guard, openEntry]
    );

    const handleCreateNew = useCallback(() => {
        guard(() => {
            startNewEntry();
            setNavOpen(false);
        });
    }, [guard, startNewEntry]);

    /**
     * Deletes an entry, putting it back if the server refuses.
     *
     * Removed from the list first so the interface answers immediately, but
     * the row is kept so a failure restores it in place instead of leaving
     * somebody believing an entry is gone when it is not.
     */
    const confirmDelete = useCallback(
        async (target: DiaryEntryView) => {
            setDeletingId(target.id);
            const snapshot = storedEntries;
            setStoredEntries((prev) => prev.filter((e) => e.id !== target.id));

            const result = await deleteDiaryEntry(target.id);
            setDeletingId(null);

            if (!result.success) {
                setStoredEntries(snapshot);
                toast.error(result.error ?? "Could not delete that entry");
                return;
            }

            // Only clear the editor if the deleted entry is the one open in it.
            if (selectedEntryId === target.id) startNewEntry();
            toast.success("Entry deleted");
        },
        [selectedEntryId, startNewEntry, storedEntries]
    );

    // Without the key there is nothing to show: entries on the server are
    // ciphertext, and this is the only place they can be opened.
    if (!isUnlocked) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            Your diary is locked
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Entries are encrypted with a key only this browser holds, so they cannot be
                        shown until you unlock your vault with your password.
                    </CardContent>
                </Card>
            </div>
        );
    }

    const sidebar = (
        <DiarySidebar
            entries={storedEntries}
            selectedId={selectedEntryId}
            isLoading={isLoading}
            isSearching={isSearching}
            searchQuery={searchQuery}
            unsavedId={isDirty ? (selectedEntryId ?? null) : null}
            onSelect={handleSelect}
            onCreateNew={handleCreateNew}
            onSearchChange={setSearchQuery}
            onRequestDelete={(target) => setPending({ kind: "delete", entry: target })}
        />
    );

    const insights = (
        <DiaryInsights
            currentAnalysis={currentAnalysis}
            recentEntries={storedEntries}
            isAnalyzing={isSaving}
            onSelectPrompt={(prompt) => {
                setEntry((prev) => (isEmptyEntry(prev) ? `<p>${prompt}</p><p></p>` : prev));
                setInsightsOpen(false);
            }}
        />
    );

    return (
        // dvh, not vh: on mobile browsers vh includes the collapsing address
        // bar, which pushed the toolbar off the bottom of the screen.
        <div className="flex h-[calc(100dvh-4rem)] w-full overflow-hidden bg-background">
            {/* Entry list: a column on desktop, a drawer on smaller screens,
                where a fixed 320px column left almost nothing for writing. */}
            <aside className="hidden w-72 shrink-0 border-r lg:block xl:w-80">{sidebar}</aside>

            <Sheet open={navOpen} onOpenChange={setNavOpen}>
                <SheetContent side="left" className="w-[85vw] max-w-sm p-0">
                    <SheetTitle className="sr-only">Your entries</SheetTitle>
                    {sidebar}
                </SheetContent>
            </Sheet>

            <main className="flex min-w-0 flex-1 flex-col">
                <header className="flex items-center gap-2 border-b px-3 py-2.5 sm:px-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden"
                        onClick={() => setNavOpen(true)}
                        aria-label="Open your entries"
                    >
                        <Menu className="h-5 w-5" />
                    </Button>

                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-sm font-semibold sm:text-base">
                            {selectedEntryId ? "Editing entry" : "New entry"}
                        </h1>
                        <p className="truncate text-xs text-muted-foreground">
                            {format(selectedEntryDate ?? new Date(), "EEEE, d MMMM yyyy")}
                            <span className="hidden sm:inline">
                                {" · "}
                                {wordCount} {wordCount === 1 ? "word" : "words"}
                            </span>
                        </p>
                    </div>

                    <SaveState isDirty={isDirty} isSaving={isSaving} lastSavedAt={lastSavedAt} />

                    {selectedEntryId && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            disabled={deletingId === selectedEntryId}
                            onClick={() => {
                                const open = storedEntries.find((e) => e.id === selectedEntryId);
                                if (open) setPending({ kind: "delete", entry: open });
                            }}
                            aria-label="Delete this entry"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        className="xl:hidden"
                        onClick={() => setInsightsOpen(true)}
                        aria-label="Show mood and prompts"
                    >
                        <BarChart3 className="h-5 w-5" />
                    </Button>

                    <Button onClick={saveEntry} disabled={isSaving || !isDirty} size="sm">
                        {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
                        ) : (
                            <Save className="h-4 w-4 sm:mr-2" />
                        )}
                        <span className="hidden sm:inline">{isSaving ? "Saving" : "Save"}</span>
                    </Button>
                </header>

                {unreadable > 0 && (
                    <p className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-muted-foreground">
                        {unreadable} earlier {unreadable === 1 ? "entry" : "entries"} cannot be
                        opened with your current key. That happens after a password reset, and the
                        text cannot be recovered.
                    </p>
                )}

                <div className="min-h-0 flex-1 overflow-hidden">
                    <Editor content={entry} onChange={setEntry} isSaving={isSaving} />
                </div>
            </main>

            <aside className="hidden w-80 shrink-0 overflow-y-auto border-l p-4 xl:block">
                {insights}
            </aside>

            <Sheet open={insightsOpen} onOpenChange={setInsightsOpen}>
                <SheetContent
                    side={isMobile ? "bottom" : "right"}
                    className={cn("p-4", isMobile ? "h-[85dvh]" : "w-96")}
                >
                    <SheetTitle className="sr-only">Mood and prompts</SheetTitle>
                    <div className="h-full overflow-y-auto pt-2">{insights}</div>
                </SheetContent>
            </Sheet>

            <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
                <AlertDialogContent>
                    {pending?.kind === "delete" ? (
                        <>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    The entry from{" "}
                                    {format(pending.entry.entryDate, "d MMMM yyyy")} will be
                                    removed for good. Because only your browser can decrypt it,
                                    there is no copy anywhere to restore from.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Keep it</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => confirmDelete(pending.entry)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </>
                    ) : pending?.kind === "discard" ? (
                        <>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    You have changes that have not been saved. Leaving this entry
                                    now will discard them.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Keep writing</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => {
                                        const run = pending.then;
                                        setPending(null);
                                        run();
                                    }}
                                >
                                    Discard changes
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </>
                    ) : null}
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

/** Quiet, and only says something when there is something to say. */
function SaveState({
    isDirty,
    isSaving,
    lastSavedAt,
}: {
    isDirty: boolean;
    isSaving: boolean;
    lastSavedAt: Date | null;
}) {
    if (isSaving) return null;

    if (isDirty) {
        return (
            <span className="hidden text-xs text-muted-foreground sm:inline" role="status">
                Unsaved
            </span>
        );
    }

    if (lastSavedAt) {
        return (
            <span
                className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex"
                role="status"
            >
                <Check className="h-3.5 w-3.5" />
                Saved {format(lastSavedAt, "HH:mm")}
            </span>
        );
    }

    return null;
}
