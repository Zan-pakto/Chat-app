"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Sidebar } from "@/components/chat/sidebar";
import { ChatWrapper } from "@/components/chat/chat-wrapper";
import { useState, useEffect } from "react";
import { Id } from "../../convex/_generated/dataModel";

export default function Home() {
  const [selectedConversation, setSelectedConversation] = useState<Id<"conversations"> | null>(null);

  const storeUser = useMutation(api.users.storeUser);
  const updatePresence = useMutation(api.presence.updatePresence);

  // Sync user and mark as online when they render this
  useQuery(api.users.getCurrentUser, {}); // just to sub

  useEffect(() => {
    storeUser();

    // Ping presence every 30 seconds to keep them online dynamically
    const interval = setInterval(() => {
      updatePresence({ isOnline: true });
    }, 30000);

    return () => clearInterval(interval);
  }, [storeUser, updatePresence]);
  
  // Instantly drop offline if they minimize or close the tab
  useEffect(() => {
     const handleVisibilityChange = () => {
        if (document.visibilityState === "hidden") {
          updatePresence({ isOnline: false });
        } else {
          updatePresence({ isOnline: true });
        }
     };
     document.addEventListener("visibilitychange", handleVisibilityChange);
     return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [updatePresence]);
  
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar 
        selectedConversation={selectedConversation} 
        onSelect={setSelectedConversation} 
      />
      <main className="flex-1 flex flex-col h-full border-l bg-accent/10">
        {selectedConversation ? (
          <ChatWrapper conversationId={selectedConversation} onBack={() => setSelectedConversation(null)} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <h2 className="text-xl font-semibold mb-2">No Conversation Selected</h2>
            <p>Choose a friend from the sidebar to start chatting</p>
          </div>
        )}
      </main>
    </div>
  );
}
