"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { UserButton } from "@clerk/nextjs";
import { MessageSquare, Search, PlusCircle, Users } from "lucide-react";
import { useState } from "react";
import { formatTimestamp } from "@/lib/date-utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface SidebarProps {
  selectedConversation: Id<"conversations"> | null;
  onSelect: (id: Id<"conversations"> | null) => void;
}

export function Sidebar({ selectedConversation, onSelect }: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Id<"users">[]>([]);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  
  const currentUser = useQuery(api.users.getCurrentUser);
  const conversations = useQuery(api.conversations.getMyConversations);
  const users = useQuery(api.users.getAllExceptCurrent);
  
  const createOrGetConversation = useMutation(api.conversations.createOrGet);
  const createGroup = useMutation(api.conversations.createGroup);
  
  const startConversation = async (userId: Id<"users">) => {
    try {
      const convId = await createOrGetConversation({ otherUserId: userId });
      onSelect(convId);
      setIsSearching(false);
      setSearchTerm("");
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length < 1) return;
    try {
      const convId = await createGroup({ name: groupName, memberIds: selectedUsers });
      onSelect(convId);
      setIsGroupModalOpen(false);
      setGroupName("");
      setSelectedUsers([]);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredUsers = users?.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside className={cn(
      "w-full md:w-80 border-r flex flex-col bg-background",
      selectedConversation ? "hidden md:flex" : "flex"
    )}>
      {/* Header with User Info */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserButton afterSignOutUrl="/" />
          <div className="flex flex-col">
             <span className="font-semibold text-sm">{currentUser ? currentUser.name : "Loading..."}</span>
             <span className="text-xs text-muted-foreground">My Account</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
            <DialogTrigger asChild>
              <button className="p-2 bg-secondary rounded-full hover:bg-secondary/80 transition" title="Create Group">
                <Users size={16} />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a Group Chat</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <input 
                  placeholder="Group Name" 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-1 focus:ring-primary"
                />
                <ScrollArea className="h-48 border rounded-md p-2">
                  {users?.map(user => (
                    <div key={user._id} className="flex items-center space-x-2 py-2">
                      <Checkbox 
                        id={user._id} 
                        checked={selectedUsers.includes(user._id)}
                        onCheckedChange={(c) => {
                          if (c) setSelectedUsers([...selectedUsers, user._id]);
                          else setSelectedUsers(selectedUsers.filter(id => id !== user._id));
                        }}
                      />
                      <label htmlFor={user._id} className="text-sm cursor-pointer flex-1">{user.name}</label>
                    </div>
                  ))}
                  {users?.length === 0 && <p className="text-sm text-muted-foreground text-center mt-4">No users found</p>}
                </ScrollArea>
                <button 
                  onClick={handleCreateGroup}
                  disabled={!groupName.trim() || selectedUsers.length === 0}
                  className="w-full bg-primary text-primary-foreground py-2 rounded-md disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </DialogContent>
          </Dialog>

          <button 
            onClick={() => setIsSearching(!isSearching)}
            className="p-2 bg-secondary rounded-full hover:bg-secondary/80 transition"
          >
            {isSearching ? <MessageSquare size={16} /> : <PlusCircle size={16} />}
          </button>
        </div>
      </div>

      {/* Search Input */}
      {isSearching && (
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input 
              className="w-full pl-9 pr-4 py-2 text-sm bg-accent rounded-md border-none focus:ring-1 focus:ring-primary outline-none transition-all"
              placeholder="Search users..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* List */}
      <ScrollArea className="flex-1">
        {conversations === undefined || users === undefined ? (
          <div className="flex flex-col gap-2 p-4">
             {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 w-full h-14 bg-accent/20 rounded-lg animate-pulse" />
             ))}
          </div>
        ) : isSearching ? (
          <div className="p-2 flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-muted-foreground px-2 py-1 tracking-wider">All Users</span>
            {filteredUsers?.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-4">No search results</p>
            ) : (
              filteredUsers?.map(user => (
                <button
                  key={user._id}
                  onClick={() => startConversation(user._id)}
                  className="w-full text-left flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition"
                >
                  <div className="relative">
                     <Avatar>
                        <AvatarImage src={user.imageUrl} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                     </Avatar>
                     <div className={cn("absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background", user.isOnline ? "bg-green-500" : "bg-gray-400")}></div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="font-medium text-sm truncate">{user.name}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="p-2 flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-muted-foreground px-2 py-1 tracking-wider">Conversations</span>
            {conversations.length === 0 ? (
               <div className="text-center py-8 text-muted-foreground">
                 <MessageSquare className="mx-auto h-8 w-8 mb-3 opacity-50" />
                 <p className="text-sm">No conversations yet.</p>
                 <p className="text-xs mt-1">Click the + to start chatting.</p>
               </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv._id}
                  onClick={() => onSelect(conv._id)}
                  className={cn(
                    "w-full text-left flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition",
                    selectedConversation === conv._id && "bg-accent"
                  )}
                >
                  <div className="relative shrink-0 flex items-center justify-center">
                    {conv.isGroup ? (
                      <div className="h-10 w-10 shrink-0 bg-primary/20 text-primary rounded-full flex items-center justify-center font-bold">
                        {conv.otherUser.name.charAt(0)}
                      </div>
                    ) : (
                     <>
                       <Avatar>
                          <AvatarImage src={conv.otherUser.imageUrl} />
                          <AvatarFallback>{conv.otherUser.name.charAt(0)}</AvatarFallback>
                       </Avatar>
                       <div className={cn("absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background", conv.otherUser.isOnline ? "bg-green-500" : "bg-gray-400")}></div>
                     </>
                    )}
                  </div>
                  
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate pr-2">{conv.otherUser.name}</p>
                      {conv.lastMessage && (
                        <span className="text-[10px] text-muted-foreground shrink-0 border-none">
                          {formatTimestamp(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className={cn(
                        "text-xs truncate max-w-[140px]",
                        conv.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                      )}>
                        {conv.lastMessage ? conv.lastMessage.content : "No messages yet"}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}
