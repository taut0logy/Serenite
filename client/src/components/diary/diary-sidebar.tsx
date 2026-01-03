"use client";

import { StoredDiaryEntry } from "@/lib/diary-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiarySidebarProps {
    entries: StoredDiaryEntry[];
    selectedId?: string;
    onSelect: (entry: StoredDiaryEntry) => void;
    onCreateNew: () => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
}

export function DiarySidebar({
    entries,
    selectedId,
    onSelect,
    onCreateNew,
    searchQuery,
    onSearchChange,
}: DiarySidebarProps) {
    return (
        <div className="flex flex-col h-full w-full overflow-hidden border-r bg-muted/10">
            <div className="p-4 space-y-4">
                <Button onClick={onCreateNew} className="w-full justify-start gap-2">
                    <PlusCircle className="h-4 w-4" />
                    New Entry
                </Button>
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search entries..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
            </div>
            
            <ScrollArea className="flex-1 w-full">
                <div className="flex flex-col gap-2 p-2 w-full overflow-hidden">
                    {entries.length === 0 ? (
                        <div className="text-center text-sm text-muted-foreground p-4">
                            No entries found.
                        </div>
                    ) : (
                        entries.map((entry) => (
                            <button
                                key={entry.id}
                                onClick={() => onSelect(entry)}
                                className={cn(
                                    "block w-full text-left rounded-lg border p-3 transition-all hover:bg-muted/50 hover:shadow-sm overflow-hidden",
                                    selectedId === entry.id
                                        ? "bg-muted border-primary/50 shadow-sm"
                                        : "bg-card border-border"
                                )}
                            >
                                {/* Header: Date and Mood Tag */}
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-sm font-semibold text-foreground">{entry.date}</span>
                                    <span 
                                        className={cn(
                                            "text-[10px] px-1.5 py-0.5 rounded font-medium", 
                                            {
                                                "text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30": entry.mood.toLowerCase().includes("happy") || entry.mood.toLowerCase().includes("joy"),
                                                "text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30": entry.mood.toLowerCase().includes("calm") || entry.mood.toLowerCase().includes("neutral"),
                                                "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30": entry.mood.toLowerCase().includes("angry") || entry.mood.toLowerCase().includes("stress"),
                                                "text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-800": !entry.mood.toLowerCase().includes("happy") && !entry.mood.toLowerCase().includes("joy") && !entry.mood.toLowerCase().includes("calm") && !entry.mood.toLowerCase().includes("neutral") && !entry.mood.toLowerCase().includes("angry") && !entry.mood.toLowerCase().includes("stress"),
                                            }
                                        )} 
                                        title={entry.mood}
                                    >
                                        {entry.mood.split("/")[0].slice(0, 7)}
                                    </span>
                                </div>
                                
                                {/* Content Preview */}
                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                    {entry.content.replace(/<[^>]*>/g, '').slice(0, 80) || "No content"}
                                </p>
                            </button>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
