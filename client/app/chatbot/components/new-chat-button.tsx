'use client';

import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useMessages } from "../store/messages";

export default function NewChatButton() {
  const clearMessages = useMessages((state) => state.clearMessages);
  
  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-2 text-muted-foreground hover:text-primary"
      onClick={clearMessages}
    >
      <PlusCircle className="h-4 w-4" />
      New Chat
    </Button>
  );
}
