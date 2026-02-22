"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatTimestamp } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { SmilePlus, Trash2 } from "lucide-react";

interface MessageListProps {
  conversationId: Id<"conversations">;
  messages: any[];
}

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢"];

export function MessageList({ conversationId, messages }: MessageListProps) {
  const currentUser = useQuery(api.users.getCurrentUser);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  
  const typingStatus = useQuery(api.presence.getTypingStatus, { conversationId });
  const toggleReaction = useMutation(api.messages.toggleReaction);
  const deleteMsg = useMutation(api.messages.deleteMsg);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (!isScrolledUp) {
      scrollToBottom();
    }
  }, [messages, typingStatus, isScrolledUp]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop === target.clientHeight;
    setIsScrolledUp(!isAtBottom);
  };

  if (!currentUser) return null;

  return (
    <div className="flex-1 overflow-y-auto bg-background/50 relative p-4 flex flex-col gap-4" onScroll={handleScroll} ref={scrollRef}>
      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col">
          <p className="text-lg font-medium">No messages yet</p>
          <p className="text-sm">Say hi to start the conversation!</p>
        </div>
      ) : (
        messages.map((message) => {
          const isMe = message.senderId === currentUser._id;
          const isDeleted = message.isDeleted;
          
          // Group reactions by emoji
          const reactionCounts: Record<string, { count: number; hasReacted: boolean }> = {};
          if (message.reactions) {
            message.reactions.forEach((r: any) => {
              if (!reactionCounts[r.emoji]) reactionCounts[r.emoji] = { count: 0, hasReacted: false };
              reactionCounts[r.emoji].count++;
              if (r.userId === currentUser._id) reactionCounts[r.emoji].hasReacted = true;
            });
          }

          return (
            <div
              key={message._id}
              className={cn("flex w-full gap-2 group/message", isMe ? "justify-end" : "justify-start")}
            >
              {!isMe && (
                <Avatar className="h-8 w-8 mt-1 shrink-0">
                  <AvatarImage src={message.senderImageUrl} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {message.senderName ? message.senderName.charAt(0) : "?"}
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div className={cn(
                "max-w-[70%] sm:max-w-[60%] flex flex-col relative",
                isMe ? "items-end" : "items-start"
              )}>
                {/* Actions Hover Menu */}
                {!isDeleted && (
                  <div className={cn(
                    "absolute top-0 -translate-y-4 flex items-center gap-1 opacity-0 transition-opacity group-hover/message:opacity-100 z-10 bg-background border shadow-sm rounded-md px-1 py-1",
                    isMe ? "right-0" : "left-0"
                  )}>
                    {REACTIONS.map(emoji => (
                      <button 
                        key={emoji}
                        onClick={() => toggleReaction({ messageId: message._id, emoji })}
                        className="hover:bg-accent hover:scale-110 p-1 rounded-sm text-sm transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                    {isMe && (
                      <button 
                        onClick={() => deleteMsg({ messageId: message._id })}
                        className="p-1 text-destructive hover:bg-destructive/10 rounded-sm transition-colors ml-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}

                <div
                  className={cn(
                    "px-4 py-2 rounded-2xl md:text-sm text-[15px] max-w-full break-words shadow-sm mt-2 relative",
                    isDeleted ? "bg-accent/50 text-muted-foreground italic border border-dashed rounded-2xl" :
                    isMe 
                      ? "bg-primary text-primary-foreground rounded-tr-none" 
                      : "bg-background border rounded-tl-none"
                  )}
                >
                  {isDeleted ? "This message was deleted" : message.content}
                </div>

                {/* Reactions Display */}
                {Object.keys(reactionCounts).length > 0 && !isDeleted && (
                  <div className={cn(
                    "flex flex-wrap gap-1 mt-1 z-10",
                    isMe ? "justify-end" : "justify-start"
                  )}>
                    {Object.entries(reactionCounts).map(([emoji, data]) => (
                      <button
                        key={emoji}
                        onClick={() => toggleReaction({ messageId: message._id, emoji })}
                        className={cn(
                          "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border shadow-sm transition-colors",
                          data.hasReacted ? "bg-primary/10 border-primary/30" : "bg-background"
                        )}
                      >
                        <span>{emoji}</span>
                        <span className="font-semibold">{data.count}</span>
                      </button>
                    ))}
                  </div>
                )}

                <span className="text-[10px] text-muted-foreground mt-1 opacity-0 group-hover/message:opacity-100 transition-opacity">
                  {formatTimestamp(message.createdAt)}
                </span>
              </div>
            </div>
          );
        })
      )}

      {typingStatus && typingStatus.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground italic mb-2">
           <div className="flex gap-1 ml-10 rounded-2xl bg-muted px-4 py-2 w-fit items-center">
             <span className="animate-bounce delay-75">•</span>
             <span className="animate-bounce delay-150">•</span>
             <span className="animate-bounce delay-300">•</span>
           </div>
           <span className="ml-2 text-xs">
             {typingStatus.join(", ")} {typingStatus.length > 1 ? "are" : "is"} typing...
           </span>
        </div>
      )}

      {isScrolledUp && (
        <button
          onClick={() => {
            setIsScrolledUp(false);
            scrollToBottom();
          }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-primary/90 hover:bg-primary text-primary-foreground px-4 py-2 rounded-full text-xs font-medium shadow-md transition-transform"
        >
          ↓ New messages
        </button>
      )}
    </div>
  );
}
