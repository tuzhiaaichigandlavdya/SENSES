
import { create } from 'zustand';

export interface Message {
  id: string;
  sender_username: string;
  recipient_username: string;
  encrypted_content: string;
  iv: string;
  timestamp: string;
  decrypted_content?: string; // Client-side only
  is_read?: boolean;
}

export interface Conversation {
  username: string;
  display_name: string;
  avatar_url?: string;
  is_online?: boolean;
  last_seen?: string;
  last_message?: string;
  unread_count?: number;
}

interface ChatState {
  conversations: Conversation[];
  activeChat: string | null; // username of active chat
  messages: Record<string, Message[]>; // username -> messages
  
  setConversations: (conversations: Conversation[]) => void;
  setActiveChat: (username: string | null) => void;
  addMessage: (username: string, message: Message) => void;
  setMessages: (username: string, messages: Message[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeChat: null,
  messages: {},

  setConversations: (conversations) => set({ conversations }),
  
  setActiveChat: (username) => set({ activeChat: username }),
  
  addMessage: (username, message) => set((state) => {
    const existing = state.messages[username] || [];
    // Avoid duplicates
    if (existing.find(m => m.id === message.id)) return state;
    
    return {
      messages: {
        ...state.messages,
        [username]: [...existing, message]
      }
    };
  }),
  
  setMessages: (username, messages) => set((state) => ({
    messages: {
      ...state.messages,
      [username]: messages
    }
  })),
}));
