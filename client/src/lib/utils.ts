import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { v4 as uuid } from 'uuid';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a unique room ID
 * @returns A short unique identifier for a room
 */
export function generateRoomId() {
  return uuid().split('-')[0];
}

/**
 * Format a date string into a human-readable format
 * @param dateString ISO date string
 * @returns Formatted date (e.g., "May 10, 2025")
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Format a datetime string to display only the time
 * @param dateTimeString ISO datetime string
 * @returns Formatted time (e.g., "2:30 PM")
 */
export function formatTime(dateTimeString: string): string {
  if (!dateTimeString) return '';

  const date = new Date(dateTimeString);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(date);
}

/**
 * Format a number as currency
 * @param amount Numeric amount
 * @param currency Currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | string | null | undefined, currency: string = 'USD'): string {
  if (amount === null || amount === undefined) return '';

  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(numericAmount);
}
