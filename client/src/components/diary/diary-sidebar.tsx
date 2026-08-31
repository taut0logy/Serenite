"use client";

import { useMemo } from "react";
import { format, isThisYear, isToday, isYesterday, subDays } from "date-fns";
import { MoreHorizontal, Pencil, PlusCircle, Search, Trash2, X } from "lucide-react";

import type { DiaryEntryView } from "@/lib/diary/types";
import { moodMeta } from "@/lib/diary/mood";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DiarySidebarProps {
    entries: DiaryEntryView[];
    selectedId?: string;
    isLoading: boolean;
    isSearching: boolean;
    searchQuery: string;
    unsavedId: string | null;
    onSelect: (entry: DiaryEntryView) => void;
    onCreateNew: () => void;
    onSearchChange: (query: string) => void;
    onRequestDelete: (entry: DiaryEntryView) => void;
}

/** Plain text for the preview line, since entries are stored as rich text. */
function preview(html: string): string {
    return html
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Groups by recency rather than listing raw dates.
 *
 * People look for an entry by when it happened ("some time last week"), not by
 * date. A flat list of identical-looking rows makes that a reading exercise.
 */
function groupLabel(date: Date): string {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    if (date > subDays(new Date(), 7)) return "Earlier this week";
    if (isThisYear(date)) return format(date, "MMMM");
    return format(date, "MMMM yyyy");
}

export function DiarySidebar({
    entries,
    selectedId,
    isLoading,
    isSearching,
    searchQuery,
    unsavedId,
    onSelect,
    onCreateNew,
    onSearchChange,
    onRequestDelete,
}: DiarySidebarProps) {
    const groups = useMemo(() => {
        const out: { label: string; entries: DiaryEntryView[] }[] = [];
        for (const entry of entries) {
            const label = groupLabel(entry.entryDate);
            const last = out[out.length - 1];
            if (last?.label === label) last.entries.push(entry);
            else out.push({ label, entries: [entry] });
        }
        return out;
    }, [entries]);

    return (
        <div className="flex h-full w-full flex-col overflow-hidden bg-muted/20">
            <div className="space-y-3 border-b p-3">
                <Button onClick={onCreateNew} className="w-full justify-start gap-2">
                    <PlusCircle className="h-4 w-4" />
                    New entry
                </Button>

                <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search your entries"
                        className="pl-8 pr-8"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        aria-label="Search your entries"
                    />
                    {searchQuery.length > 0 && (
                        <button
                            type="button"
                            onClick={() => onSearchChange("")}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="Clear search"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            <ScrollArea className="min-h-0 flex-1">
                <div className="p-2">
                    {isLoading || isSearching ? (
                        <div className="space-y-2 p-1" aria-busy="true" aria-label="Loading entries">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="space-y-2 rounded-lg border bg-card p-3">
                                    <div className="flex items-center justify-between">
                                        <Skeleton className="h-3.5 w-24" />
                                        <Skeleton className="h-4 w-14 rounded-full" />
                                    </div>
                                    <Skeleton className="h-3 w-full" />
                                    <Skeleton className="h-3 w-2/3" />
                                </div>
                            ))}
                        </div>
                    ) : entries.length === 0 ? (
                        <EmptyState hasQuery={searchQuery.trim().length > 0} onCreateNew={onCreateNew} />
                    ) : (
                        groups.map((group) => (
                            <section key={group.label} className="mb-3">
                                <h3 className="px-2 pb-1.5 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    {group.label}
                                </h3>
                                <ul className="space-y-1">
                                    {group.entries.map((entry) => {
                                        const mood = moodMeta(entry.mood);
                                        const isSelected = selectedId === entry.id;
                                        const text = preview(entry.content);

                                        return (
                                            <li key={entry.id} className="group/item relative">
                                                <button
                                                    type="button"
                                                    onClick={() => onSelect(entry)}
                                                    aria-current={isSelected ? "true" : undefined}
                                                    className={cn(
                                                        "w-full rounded-lg border p-3 pr-9 text-left transition-colors",
                                                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                                        isSelected
                                                            ? "border-primary/40 bg-background shadow-sm"
                                                            : "border-transparent hover:border-border hover:bg-background/60"
                                                    )}
                                                >
                                                    <div className="mb-1 flex items-center gap-2">
                                                        <span
                                                            className={cn("h-2 w-2 shrink-0 rounded-full", mood.dot)}
                                                            aria-hidden
                                                        />
                                                        <span className="truncate text-sm font-medium">
                                                            {format(entry.entryDate, "d MMM yyyy")}
                                                        </span>
                                                        {unsavedId === entry.id && (
                                                            <span
                                                                className="ml-auto flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400"
                                                                title="This entry has unsaved changes"
                                                            >
                                                                <Pencil className="h-3 w-3" />
                                                                Unsaved
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                                        {text || <span className="italic">Empty entry</span>}
                                                    </p>

                                                    <span className="sr-only">
                                                        Mood: {mood.label}
                                                    </span>
                                                </button>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            // Always reachable on touch, where there is no
                                                            // hover to reveal it.
                                                            className="absolute right-1 top-2 h-7 w-7 text-muted-foreground opacity-100 md:opacity-0 md:focus-visible:opacity-100 md:group-hover/item:opacity-100"
                                                            aria-label={`Actions for entry from ${format(entry.entryDate, "d MMMM yyyy")}`}
                                                        >
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            onSelect={() => onRequestDelete(entry)}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete entry
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

function EmptyState({ hasQuery, onCreateNew }: { hasQuery: boolean; onCreateNew: () => void }) {
    if (hasQuery) {
        return (
            <div className="px-4 py-10 text-center">
                <p className="text-sm font-medium">No entries match that</p>
                <p className="mt-1 text-xs text-muted-foreground">
                    Search looks at meaning as well as wording, so try describing the day rather
                    than guessing the exact words.
                </p>
            </div>
        );
    }

    return (
        <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium">Nothing written yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
                Entries are encrypted in this browser before they are sent, so only you can read
                them back.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={onCreateNew}>
                Write your first entry
            </Button>
        </div>
    );
}
