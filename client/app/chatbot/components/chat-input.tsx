"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useMessages } from "../store/messages";
import { sendMessage } from "../services/api";

export default function ChatInput() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messages = useMessages((state) => state.messages);
  const addMessage = useMessages((state) => state.addMessage);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      setIsLoading(true);
      const userMessage = input.trim();
      setInput("");
      
      try {
        // Add user message to chat
        addMessage({ role: "user", content: userMessage });
        
        // Send message to API with chat history
        const response = await sendMessage(
          userMessage,
          messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        );
        
        // Add bot response to chat
        addMessage({ role: "bot", content: response });
      } catch (error) {
        console.error('Failed to send message:', error);
        addMessage({ 
          role: "bot", 
          content: error instanceof Error ? error.message : "Sorry, I encountered an error. Please try again." 
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-4 relative">
      <Textarea
        placeholder="Message Serenite... (Press Enter to send)"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyPress}
        rows={1}
        className="min-h-[56px] max-h-[200px] resize-none rounded-2xl pr-16
          focus-visible:ring-offset-0 focus-visible:ring-primary/20
          bg-background/50 backdrop-blur-sm border-primary/10
          shadow-[0_2px_20px_-10px] shadow-primary/20
          placeholder:text-muted-foreground/50"
        disabled={isLoading}
      />
      <motion.div 
        whileHover={{ scale: 1.05 }} 
        whileTap={{ scale: 0.95 }}
        className="absolute right-2 bottom-2"
      >
        <Button 
          type="submit" 
          size="icon" 
          className={`rounded-xl h-[40px] w-[40px] 
            ${isLoading 
              ? 'bg-muted' 
              : 'bg-gradient-to-tr from-primary to-primary/90'
            } shadow-lg hover:shadow-primary/25 transition-shadow duration-300`}
          disabled={isLoading}
        >
          <Send className={`h-5 w-5 ${isLoading ? 'animate-pulse' : ''}`} />
          <span className="sr-only">Send message</span>
        </Button>
      </motion.div>
    </form>
  );
}