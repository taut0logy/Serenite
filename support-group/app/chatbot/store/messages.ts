import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  role: "user" | "bot";
  content: string;
}

type MessagesState = {
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
};

export const useMessages = create<MessagesState>()(
  persist(
    (set) => ({
      messages: [{ role: "bot", content: "Hello! How can I help you today?" }],
      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
      clearMessages: () =>
        set({ messages: [{ role: "bot", content: "Hello! How can I help you today?" }] }),
    }),
    {
      name: 'chat-storage',
    }
  )
);
