"use client";

import { Phone } from "lucide-react";

/**
 * Shown wherever the one-to-one channel is, unconditionally and without
 * waiting on anything. The channel is a queue a volunteer picks up; these are
 * the numbers that answer now. The distinction has to be visible, not implied.
 *
 * TODO(sub-project 5): these are placeholders pending the regional crisis
 * table. Verify every number is live before this ships.
 */
const CONTACTS = [
    { name: "Kaan Pete Roi", detail: "09612 119 911", note: "Emotional support helpline, Bangladesh" },
    { name: "National Emergency", detail: "999", note: "Police, fire and ambulance" },
];

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
            <ul className="mt-3 space-y-2">
                {CONTACTS.map((contact) => (
                    <li key={contact.name} className="flex items-start gap-2 text-sm">
                        <Phone className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        <span>
                            <span className="font-medium text-foreground">{contact.name}</span>{" "}
                            <a
                                href={`tel:${contact.detail.replace(/\s/g, "")}`}
                                className="font-mono text-foreground underline underline-offset-4"
                            >
                                {contact.detail}
                            </a>
                            <span className="block text-xs text-muted-foreground">{contact.note}</span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
