"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";
import { useMessages } from "../store/messages";

interface Message {
  role: "user" | "bot";
  content: string;
}

export default function ChatMessages() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = useMessages((state) => state.messages);
  const scrollTimeout = useRef<NodeJS.Timeout>();

  const scrollToBottom = () => {
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    
    scrollTimeout.current = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: "smooth",
        block: "end"
      });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
    return () => {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [messages]);

  return (
    <div className="space-y-8 pb-4">
      <AnimatePresence mode="popLayout">
        {messages.map((message, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`flex items-start gap-4 ${
              message.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Avatar className="border-2 border-primary/20 w-10 h-10 shadow-lg">
                <AvatarFallback 
                  className={`${
                    message.role === "user" 
                      ? "bg-gradient-to-br from-primary/10 to-primary/20" 
                      : "bg-gradient-to-br from-secondary/10 to-secondary/20"
                  } text-sm font-medium`}
                >
                  {message.role === "user" ? "You" : "S"}
                </AvatarFallback>
              </Avatar>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.01 }}
              className={`relative rounded-2xl px-5 py-3.5 max-w-[80%] shadow-md
                ${message.role === "user" 
                  ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground"
                  : "bg-gradient-to-br from-muted/50 to-muted shadow-inner"
                }
                before:absolute before:w-4 before:h-4 before:rotate-45
                ${message.role === "user"
                  ? "before:right-[-8px] before:bg-primary"
                  : "before:left-[-8px] before:bg-muted"
                }
              `}
            >
              <div className="relative z-10">
                {message.content}
              </div>
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={messagesEndRef} />
    </div>
  );
}