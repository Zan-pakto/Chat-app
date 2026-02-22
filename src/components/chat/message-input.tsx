"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useState, useRef } from "react";
import { SendHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  conversationId: Id<"conversations">;
}

export function MessageInput({ conversationId }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  
  const sendMessage = useMutation(api.messages.send);
  const setTyping = useMutation(api.presence.setTyping);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSend = async (messageText: string) => {
    setIsSending(true);
    setFailedMessage(null);
    try {
      await sendMessage({
        conversationId,
        content: messageText.trim(),
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      setFailedMessage(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSending) return;

    const message = content;
    setContent("");
    
    // Clear typing indicator immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setTyping({ conversationId, isTyping: false });

    await handleSend(message);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value);

    // Typing indication logic
    setTyping({ conversationId, isTyping: true });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setTyping({ conversationId, isTyping: false });
    }, 2000);
  };

  return (
    <div className="flex flex-col border-t shrink-0">
      {failedMessage && (
         <div className="bg-destructive/10 text-destructive text-sm p-2 flex items-center justify-between px-4">
            <span>Failed to send message.</span>
            <div className="flex gap-2">
              <button 
                onClick={() => handleSend(failedMessage)}
                className="font-medium underline hover:text-destructive/80"
              >
                Retry
              </button>
              <button 
                onClick={() => setFailedMessage(null)}
                className="text-xs ml-2 opacity-70 hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
         </div>
      )}
      <div className="p-4 bg-background">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 max-w-4xl mx-auto"
        >
          <div className="flex-1 relative flex items-center">
            <input
              value={content}
              onChange={handleChange}
              disabled={isSending}
              placeholder="Type a message..."
              className="w-full bg-accent/50 hover:bg-accent/80 transition-colors focus:bg-background border focus:ring-1 focus:ring-primary outline-none rounded-full px-5 py-3 pr-12 text-sm disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!content.trim() || isSending}
              className={cn(
                "absolute right-2 p-2 rounded-full transition-all duration-200",
                content.trim() && !isSending
                  ? "bg-primary text-primary-foreground hover:scale-105 active:scale-95"
                  : "text-muted-foreground bg-transparent disabled:opacity-50"
              )}
            >
              <SendHorizontal size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
