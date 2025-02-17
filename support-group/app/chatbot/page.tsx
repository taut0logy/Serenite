import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatMessages from "./components/messages";
import ChatInput from "./components/chat-input";
import NewChatButton from "./components/new-chat-button";

export default function ChatbotPage() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4 md:p-8">
      <Card className="w-full max-w-4xl h-[85vh] grid grid-rows-[auto,1fr,auto] 
        shadow-[0_0_50px_-12px] shadow-primary/10
        border border-primary/10 rounded-3xl 
        backdrop-blur-xl bg-background/50">
        <div className="p-4 border-b border-primary/10 flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Serenite AI Assistant
            </h1>
            <p className="text-xs text-muted-foreground/80">
              ⚠️ Serenite can make mistakes. Consider checking important information.
            </p>
          </div>
          <NewChatButton />
        </div>

        <ScrollArea className="px-4 lg:px-8 py-6 overflow-y-auto">
          <ChatMessages />
        </ScrollArea>

        <div className="p-4 lg:p-6 border-t border-primary/10 bg-background/50 backdrop-blur-xl rounded-b-3xl">
          <ChatInput />
        </div>
      </Card>
    </div>
  );
}