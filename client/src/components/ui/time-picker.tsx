"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

interface TimePickerProps {
  date?: Date;
  setTime: (time: { hours: number; minutes: number }) => void;
}

export function TimePickerDemo({
  date,
  setTime,
}: TimePickerProps) {
  const minuteRef = React.useRef<HTMLInputElement>(null);
  const hourRef = React.useRef<HTMLInputElement>(null);
  
  // Initialize with current date or defaults
  const [hour, setHour] = React.useState(() => {
    if (!date) return 12;
    const hours = date.getHours();
    return hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  });
  
  const [minute, setMinute] = React.useState(() => date ? date.getMinutes() : 0);
  const [isPM, setIsPM] = React.useState(() => date ? date.getHours() >= 12 : false);
  
  // Update time values when date prop changes
  React.useEffect(() => {
    if (date) {
      const newHour = date.getHours();
      setHour(newHour === 0 ? 12 : newHour > 12 ? newHour - 12 : newHour);
      setMinute(date.getMinutes());
      setIsPM(newHour >= 12);
    }
  }, [date]);
  
  // Notify parent component when time changes
  const updateParentTime = React.useCallback(() => {
    let h = hour;
    
    // Convert 12-hour format to 24-hour
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
    
    setTime({ hours: h, minutes: minute });
  }, [hour, minute, isPM, setTime]);
  
  // Update parent when time values change
  React.useEffect(() => {
    updateParentTime();
  }, [hour, minute, isPM, updateParentTime]);
  
  function handleHourChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = parseInt(event.target.value, 10);
    
    if (isNaN(value)) {
      setHour(12);
      return;
    }
    
    const newHour = Math.max(1, Math.min(12, value));
    setHour(newHour);
    
    // Move to minute input when hour is complete
    if (value >= 10 || value > 1) {
      minuteRef.current?.focus();
    }
  }

  function handleMinuteChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = parseInt(event.target.value, 10);
    
    if (isNaN(value)) {
      setMinute(0);
      return;
    }
    
    setMinute(Math.max(0, Math.min(59, value)));
  }

  function toggleMeridian() {
    setIsPM(prev => !prev);
  }
  
  // Format for display
  const formattedHour = String(hour).padStart(2, '0');
  const formattedMinute = String(minute).padStart(2, '0');

  const timeOptions = [
    { hours: 9, minutes: 0, isPM: false, label: "9:00 AM" },
    { hours: 12, minutes: 0, isPM: true, label: "12:00 PM" },
    { hours: 3, minutes: 0, isPM: true, label: "3:00 PM" },
    { hours: 5, minutes: 30, isPM: true, label: "5:30 PM" },
    { hours: 8, minutes: 0, isPM: true, label: "8:00 PM" },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-background border rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="grid gap-1 text-center">
            <Label htmlFor="hours" className="text-xs font-medium">Hours</Label>
            <Input
              ref={hourRef}
              id="hours"
              className="w-16 h-9 text-center"
              value={formattedHour}
              onChange={handleHourChange}
              max={12}
              min={1}
              type="text"
              inputMode="numeric"
              onFocus={(e) => e.target.select()}
            />
          </div>
          <div className="mt-5 text-xl font-semibold">:</div>
          <div className="grid gap-1 text-center">
            <Label htmlFor="minutes" className="text-xs font-medium">Minutes</Label>
            <Input
              ref={minuteRef}
              id="minutes"
              className="w-16 h-9 text-center"
              value={formattedMinute}
              onChange={handleMinuteChange}
              max={59}
              min={0}
              type="text"
              inputMode="numeric"
              onFocus={(e) => e.target.select()}
            />
          </div>
          <div className="grid gap-1 text-center">
            <Label htmlFor="ampm" className="text-xs font-medium">AM/PM</Label>
            <Button
              id="ampm"
              variant="outline"
              size="sm"
              className="w-16 h-9"
              onClick={toggleMeridian}
            >
              {isPM ? "PM" : "AM"}
            </Button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {timeOptions.map((option) => (
          <Button
            key={option.label}
            variant="outline"
            size="sm"
            className="justify-start font-normal py-2 h-9"
            onClick={() => {
              setHour(option.hours);
              setMinute(option.minutes);
              setIsPM(option.isPM);
            }}
          >
            <Clock className="mr-2 h-3.5 w-3.5 opacity-70" />
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}