"use client";

import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    // For SSR, set initial state to false
    if (typeof window === 'undefined') return;
    
    const media = window.matchMedia(query);
    
    // Update the state initially
    setMatches(media.matches);
    
    // Define a callback function to handle changes
    const listener = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };
    
    // Add the listener to MediaQueryList
    media.addEventListener('change', listener);
    
    // Clean up when component unmounts
    return () => {
      media.removeEventListener('change', listener);
    };
  }, [query]);
  
  return matches;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
