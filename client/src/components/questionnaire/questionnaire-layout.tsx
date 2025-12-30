"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface QuestionnaireLayoutProps {
    children: React.ReactNode;
    className?: string;
}

export function QuestionnaireLayout({
    children,
    className,
}: QuestionnaireLayoutProps) {
    return (
        <div className="relative min-h-[calc(100vh-65px)] w-full overflow-hidden bg-background flex flex-col items-center justify-center">
            <div className="absolute inset-0 opacity-30 dark:opacity-20 pointer-events-none">
                <motion.div
                    className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-primary/20 blur-[100px]"
                    animate={{
                        x: [0, 40, 0],
                        y: [0, -40, 0],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
                <motion.div
                    className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-blue-400/20 blur-[100px]"
                    animate={{
                        x: [0, -30, 0],
                        y: [0, 30, 0],
                    }}
                    transition={{
                        duration: 15,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            </div>

            <div
                className={cn(
                    "relative z-10 w-full max-w-4xl flex flex-col",
                    "md:max-h-[85vh] md:min-h-[600px]",
                    className
                )}
            >
                {children}
            </div>
        </div>
    );
}

