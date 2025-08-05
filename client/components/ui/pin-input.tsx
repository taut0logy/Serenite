'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface PinInputProps {
  length?: number;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function PinInput({
  length = 6,
  onComplete,
  disabled = false,
  className,
}: PinInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
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
      const pastedChars = newValue.split('');
      const newValues = [...values];
      
      // Fill as many inputs as we can with the pasted characters
      for (let i = 0; i < Math.min(length - index, pastedChars.length); i++) {
        newValues[i + index] = pastedChars[i];
      }
      
      setValues(newValues);
      
      // Focus the next empty input or the last one if all filled
      const nextIndex = Math.min(index + pastedChars.length, length - 1);
      focusInput(nextIndex);
      
      // Call onComplete if all inputs are filled
      const combinedValue = newValues.join('');
      if (combinedValue.length === length && onComplete) {
        onComplete(combinedValue);
      }
      
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
      const combinedValue = newValues.join('');
      if (combinedValue.length === length && onComplete) {
        onComplete(combinedValue);
      }
    }
  };
  
  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    // Handle backspace
    if (event.key === 'Backspace') {
      if (values[index]) {
        // Clear current input if it has a value
        const newValues = [...values];
        newValues[index] = '';
        setValues(newValues);
      } else if (index > 0) {
        // Move to previous input if current is empty
        focusInput(index - 1);
      }
    }
    
    // Handle arrow keys
    if (event.key === 'ArrowLeft' && index > 0) {
      focusInput(index - 1);
    } else if (event.key === 'ArrowRight' && index < length - 1) {
      focusInput(index + 1);
    }
  };
  
  return (
    <div className={cn("flex gap-2", className)}>
      {Array.from({ length }).map((_, index) => (
        <input
          title='Pin Input'
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