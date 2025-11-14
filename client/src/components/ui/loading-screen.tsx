"use client";

import { CogIcon } from "lucide-react";
import { motion } from "framer-motion";

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex h-[calc(100vh-4rem-1px)] w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center justify-center gap-2">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ 
            duration: 2,
            repeat: Infinity, 
            ease: "linear",
            repeatType: "loop"
          }}
          style={{ transformOrigin: "center" }}
        >
          <CogIcon className="h-12 w-12 text-primary" />
        </motion.div>
        <p
          className="text-lg font-medium text-muted-foreground"
        >
          {message}
        </p>
      </div>
    </div>
  );
}

export function LoadingSpinner({ size = "default" }: { size?: "small" | "default" | "large" }) {
  const sizeClasses = {
    small: "h-4 w-4",
    default: "h-8 w-8",
    large: "h-12 w-12",
  };

  return (
    <div className="flex items-center justify-center">
      <motion.div
        className={`border-t-2 border-primary rounded-full ${sizeClasses[size]}`}
        animate={{ rotate: 360 }}
        transition={{
          duration: 0.8,
          ease: "linear",
          repeat: Infinity,
        }}
      />
    </div>
  );
} 