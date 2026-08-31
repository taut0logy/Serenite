"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { X, ClipboardCheck } from "lucide-react";
import { getReassessmentStatus } from "@/actions/assessment.actions";

const DISMISS_KEY = "reassessment-banner-dismissed-at";
const DISMISS_SNOOZE_MS = 24 * 60 * 60 * 1000; // re-shows the next day

export function ReassessmentBanner() {
    const router = useRouter();
    const [due, setDue] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
        if (Date.now() - dismissedAt < DISMISS_SNOOZE_MS) {
            setDismissed(true);
            return;
        }
        getReassessmentStatus().then((res) => {
            if (res.success && res.due) setDue(true);
        });
    }, []);

    const handleDismiss = () => {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setDismissed(true);
    };

    return (
        <AnimatePresence>
            {due && !dismissed && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                >
                    <div className="flex items-center gap-4 p-4 rounded-xl border border-primary/30 bg-primary/5">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <ClipboardCheck className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">Time for a check-in</p>
                            <p className="text-sm text-muted-foreground">
                                A short re-assessment helps keep your support recommendations current.
                            </p>
                        </div>
                        <Button size="sm" onClick={() => router.push("/questionnaire")}>
                            Check in
                        </Button>
                        <button
                            onClick={handleDismiss}
                            aria-label="Dismiss"
                            className="text-muted-foreground hover:text-foreground p-1"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
