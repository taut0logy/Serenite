"use client";

import { Phone } from "lucide-react";
import { CRISIS_RESOURCES, dialable } from "@/lib/crisis";

/**
 * Shown wherever the one-to-one channel is, unconditionally and without
 * waiting on anything. That channel is a queue a volunteer picks up; these are
 * numbers that answer now. The distinction has to be visible, not implied.
 *
 * Rendered from lib/crisis rather than a list written here. An earlier version
 * of this file carried its own copy and had Kaan Pete Roi's hours wrong, so
 * someone reading it at 6 AM would have been pointed at a line that does not
 * open until 3 PM.
 */
export function CrisisContacts() {
    return (
        <div className="rounded-xl border-2 border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-semibold text-foreground">
                If you need help right now
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
                This conversation is not an emergency service and nobody may be reading it yet.
                These lines are answered by people who can help immediately.
            </p>
            <ul className="mt-3 space-y-3">
                {CRISIS_RESOURCES.map((resource) => (
                    <li key={resource.id} className="flex items-start gap-2 text-sm">
                        <Phone className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        <span>
                            <span className="font-medium text-foreground">{resource.name}</span>{" "}
                            <a
                                href={`tel:${dialable(resource.number)}`}
                                className="font-mono text-foreground underline underline-offset-4"
                            >
                                {resource.number}
                            </a>
                            {/* Hours sit next to every number. Only one of these
                                is a crisis line and it closes overnight, so
                                leaving them implied is the dangerous option. */}
                            <span className="block text-xs text-muted-foreground">
                                {resource.hours} &middot; {resource.purpose}
                            </span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
