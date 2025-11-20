"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface PinInputProps {
    length?: number;
    onComplete?: (value: string) => void;
    onSubmit?: (value: string) => void;
    disabled?: boolean;
    className?: string;
}

export function PinInput({
    length = 6,
    onComplete,
    onSubmit,
    disabled = false,
    className,
}: PinInputProps) {
    const [values, setValues] = useState<string[]>(Array(length).fill(""));
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        inputRefs.current = inputRefs.current.slice(0, length);
    }, [length]);

    const focusInput = (index: number) => {
        const input = inputRefs.current[index];
        if (input) {
            input.focus();
        }
    };

    const handleChange = (
        event: React.ChangeEvent<HTMLInputElement>,
        index: number
    ) => {
        const newValue = event.target.value;

        // Handle paste event with multiple characters
        if (newValue.length > 1) {
            handlePaste(newValue, index);
            return;
        }

        // Normal single-character input
        if (newValue && /^[0-9]$/.test(newValue)) {
            const newValues = [...values];
            newValues[index] = newValue;
            setValues(newValues);

            // Move focus to next input if available
            if (index < length - 1) {
                focusInput(index + 1);
            }

            // Call onComplete if all inputs are filled
            const combinedValue = newValues.join("");
            if (combinedValue.length === length && onComplete) {
                onComplete(combinedValue);
            }
        }
    };

    const handlePaste = (
        pastedData: string,
        startIndex: number = 0
    ) => {
        // Extract only numeric characters from pasted data
        const numericChars = pastedData.replace(/\D/g, "").split("");
        
        if (numericChars.length === 0) return;

        const newValues = [...values];

        // Fill inputs starting from the paste position
        for (
            let i = 0;
            i < Math.min(length - startIndex, numericChars.length);
            i++
        ) {
            newValues[i + startIndex] = numericChars[i];
        }

        setValues(newValues);

        // Focus the next empty input or the last one if all filled
        const filledCount = startIndex + numericChars.length;
        const nextIndex = Math.min(filledCount, length - 1);
        focusInput(nextIndex);

        // Call onComplete if all inputs are filled
        const combinedValue = newValues.join("");
        if (combinedValue.length === length && onComplete) {
            onComplete(combinedValue);
        }
    };

    const handlePasteEvent = (
        event: React.ClipboardEvent<HTMLInputElement>,
        index: number
    ) => {
        event.preventDefault();
        const pastedData = event.clipboardData.getData("text");
        handlePaste(pastedData, index);
    };

    const handleKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>,
        index: number
    ) => {
        // Handle backspace
        if (event.key === "Backspace") {
            event.preventDefault();
            if (values[index]) {
                // Clear current input if it has a value
                const newValues = [...values];
                newValues[index] = "";
                setValues(newValues);
            } else if (index > 0) {
                // Move to previous input and clear it if current is empty
                const newValues = [...values];
                newValues[index - 1] = "";
                setValues(newValues);
                focusInput(index - 1);
            }
        }

        // Handle delete key
        if (event.key === "Delete") {
            event.preventDefault();
            const newValues = [...values];
            newValues[index] = "";
            setValues(newValues);
        }

        // Handle arrow keys
        if (event.key === "ArrowLeft" && index > 0) {
            event.preventDefault();
            focusInput(index - 1);
        } else if (event.key === "ArrowRight" && index < length - 1) {
            event.preventDefault();
            focusInput(index + 1);
        }

        // Handle home/end keys
        if (event.key === "Home") {
            event.preventDefault();
            focusInput(0);
        } else if (event.key === "End") {
            event.preventDefault();
            focusInput(length - 1);
        }

        // Handle Enter key to submit
        if (event.key === "Enter") {
            event.preventDefault();
            const combinedValue = values.join("");
            if (combinedValue.length === length && onSubmit) {
                onSubmit(combinedValue);
            } else if (combinedValue.length === length && onComplete) {
                onComplete(combinedValue);
            }
        }
    };

    const handleFocus = (
        event: React.FocusEvent<HTMLInputElement>
    ) => {
        // Select the content when focusing for easier replacement
        event.target.select();
    };

    return (
        <div className={cn("flex gap-2", className)}>
            {Array.from({ length }).map((_, index) => (
                <input
                    title="Pin Input"
                    autoCorrect="off"
                    key={index}
                    ref={(el) => {
                        inputRefs.current[index] = el;
                        return undefined;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={values[index]}
                    onChange={(e) => handleChange(e, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onPaste={(e) => handlePasteEvent(e, index)}
                    onFocus={handleFocus}
                    disabled={disabled}
                    className={cn(
                        "h-12 w-10 text-center rounded-md border border-input bg-background text-lg font-semibold",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                />
            ))}
        </div>
    );
}
