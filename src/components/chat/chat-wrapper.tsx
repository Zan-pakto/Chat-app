"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Loader2, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { cn } from "@/lib/utils";

interface ChatWrapperProps {
  conversationId: Id<"conversations">;
  onBack: () => void;
}

export function ChatWrapper({ conversationId, onBack }: ChatWrapperProps) {
  const conversation = useQuery(api.conversations.getById, { conversationId });
  const messages = useQuery(api.messages.list, { conversationId });
  const markAsRead = useMutation(api.conversations.markAsRead);
  
  useEffect(() => {
    // Whenever conversation ID or messages change, we attempt to mark as read
    if (conversationId && messages?.length) {
      markAsRead({ conversationId });
    }
  }, [conversationId, messages, markAsRead]);

  if (conversation === undefined || messages === undefined) {
    return (
      <div className="flex flex-col h-full w-full max-w-full">
        {/* Skeleton Header */}
        <div className="h-16 flex items-center gap-3 border-b px-4 bg-background shrink-0">
          <div className="h-10 w-10 rounded-full bg-accent animate-pulse" />
          <div className="flex flex-col gap-2">
            <div className="h-4 w-32 bg-accent animate-pulse rounded" />
            <div className="h-3 w-16 bg-accent animate-pulse rounded" />
          </div>
        </div>
        {/* Skeleton Messages */}
        <div className="flex-1 p-6 flex flex-col gap-4">
          <div className="h-12 w-1/3 bg-accent animate-pulse rounded-2xl rounded-tl-none" />
          <div className="h-12 w-1/2 bg-accent animate-pulse rounded-2xl rounded-tr-none self-end" />
          <div className="h-12 w-1/4 bg-accent animate-pulse rounded-2xl rounded-tl-none" />
        </div>
      </div>
    );
  }

  if (conversation === null) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
        <p>Conversation not found.</p>
        <button onClick={onBack} className="mt-4 text-primary hover:underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full max-w-full">
      {/* Header */}
      <div className="h-16 flex items-center justify-between border-b px-4 bg-background shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="md:hidden text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <div className="relative flex items-center justify-center">
            {conversation.isGroup ? (
              <div className="h-10 w-10 shrink-0 bg-primary/20 text-primary rounded-full flex items-center justify-center font-bold">
                {conversation.otherUser.name.charAt(0)}
              </div>
            ) : (
             <>
               <Avatar className="h-10 w-10">
                  <AvatarImage src={conversation.otherUser.imageUrl} />
                  <AvatarFallback>{conversation.otherUser.name.charAt(0)}</AvatarFallback>
               </Avatar>
               <div className={cn("absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background", conversation.otherUser.isOnline ? "bg-green-500" : "bg-gray-400")}></div>
             </>
            )}
          </div>
          
          <div className="flex flex-col">
            <span className="font-semibold">{conversation.otherUser.name}</span>
            <span className="text-xs text-muted-foreground">
              {conversation.isGroup ? `${conversation.otherUser.memberCount} members` : conversation.otherUser.isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <MessageList messages={messages} conversationId={conversationId} />

      {/* Input */}
      <MessageInput conversationId={conversationId} />
    </div>
  );
}
