"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Clock } from "lucide-react";

export interface DateTimePickerProps {
    value: Date | undefined;
    onChange: (date: Date | undefined) => void;
    id?: string;
}

export function DateTimePicker({
    value,
    onChange,
    id = "datetime",
}: DateTimePickerProps) {
    // Convert date to local date and time string formats for inputs
    const dateString = value ? value.toISOString().split("T")[0] : "";
    const timeString = value ? value.toTimeString().slice(0, 5) : "";

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;

        if (!newDate) {
            onChange(undefined);
            return;
        }

        try {
            // Create a new date object with the selected date and current time
            const updatedDate = value ? new Date(value) : new Date();
            const [year, month, day] = newDate.split("-").map(Number);
            updatedDate.setFullYear(year, month - 1, day);

            onChange(updatedDate);
        } catch (error) {
            console.error("Invalid date format", error);
        }
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = e.target.value;

        if (!newTime) return;

        try {
            // Create a new date object with current date and selected time
            const updatedDate = value ? new Date(value) : new Date();
            const [hours, minutes] = newTime.split(":").map(Number);
            updatedDate.setHours(hours, minutes);

            onChange(updatedDate);
        } catch (error) {
            console.error("Invalid time format", error);
        }
    };

    const setToday = () => {
        onChange(new Date());
    };

    const setTomorrow = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        onChange(tomorrow);
    };

    const setNextHour = () => {
        const nextHour = new Date();
        nextHour.setHours(nextHour.getHours() + 1);
        onChange(nextHour);
    };

    return (
        <div className="space-y-3 border rounded-md p-3">
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <Label
                        htmlFor={`${id}-date`}
                        className="flex items-center gap-1"
                    >
                        <CalendarIcon className="h-4 w-4" />
                        <span>Date</span>
                    </Label>
                    <Input
                        id={`${id}-date`}
                        type="date"
                        value={dateString}
                        onChange={handleDateChange}
                        min={new Date().toISOString().split("T")[0]}
                    />
                </div>
                <div className="space-y-1">
                    <Label
                        htmlFor={`${id}-time`}
                        className="flex items-center gap-1"
                    >
                        <Clock className="h-4 w-4" />
                        <span>Time</span>
                    </Label>
                    <Input
                        id={`${id}-time`}
                        type="time"
                        value={timeString}
                        onChange={handleTimeChange}
                    />
                </div>
            </div>

            <div className="flex gap-2 flex-wrap">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={setToday}
                    className="flex-1"
                >
                    Now
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={setTomorrow}
                    className="flex-1"
                >
                    Tomorrow
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={setNextHour}
                    className="flex-1"
                >
                    +1 Hour
                </Button>
            </div>
        </div>
    );
}
