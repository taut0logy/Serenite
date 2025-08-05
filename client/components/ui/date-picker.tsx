"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DatePickerProps {
  date: Date;
  setDate: (date: Date) => void;
  showTimePicker?: boolean;
}

export function DatePicker({ date, setDate, showTimePicker = false }: DatePickerProps) {
  // Separate time setter functions
  const setHours = (hours: number) => {
    const newDate = new Date(date);
    newDate.setHours(hours);
    setDate(newDate);
  };

  const setMinutes = (minutes: number) => {
    const newDate = new Date(date);
    newDate.setMinutes(minutes);
    setDate(newDate);
  };

  // Get current hours and minutes
  const hours = date.getHours();
  const minutes = date.getMinutes();

  return (
    <div className="grid gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(newDate) => newDate && setDate(newDate)}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {showTimePicker && (
        <div className="flex items-center gap-2">
          <Button
            variant={"outline"}
            className="w-full justify-start text-left font-normal"
            disabled
          >
            <Clock className="mr-2 h-4 w-4" />
            {format(date, "p")}
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <span className="sr-only">Set time</span>
                <Clock className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4">
              <div className="flex items-center space-x-2">
                <div className="grid gap-1">
                  <div className="text-xs font-medium">Hours</div>
                  <Select
                    value={hours.toString()}
                    onValueChange={(value) => setHours(parseInt(value))}
                  >
                    <SelectTrigger className="w-16">
                      <SelectValue placeholder={hours.toString()} />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }).map((_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, "0")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <div className="text-xs font-medium">Minutes</div>
                  <Select
                    value={minutes.toString()}
                    onValueChange={(value) => setMinutes(parseInt(value))}
                  >
                    <SelectTrigger className="w-16">
                      <SelectValue placeholder={minutes.toString()} />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 60 }).map((_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, "0")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
} 