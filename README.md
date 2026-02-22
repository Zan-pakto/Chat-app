# Real-Time Chat Application

A production-ready, real-time web chat application built for modern messaging. It features 1-on-1 conversations, group chats, live typing indicators, responsive read receipts, and seamless auto-sync presence.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Authentication**: Clerk
- **Database & Real-time Subscriptions**: Convex 

## Key Features

1. **Authentication & Synchronization**
   - Secure sign-up/login flows via Clerk.
   - Synchronizes users continuously to Convex via a strict webhook fallback pattern.
   - Requires custom Convex JWT templates for instant secure database authorization.
2. **Real-Time Messaging**
   - **One-on-One**: Instantaneous 1v1 threads utilizing WebSocket subscriptions.
   - **Group Chats**: Ability to multi-select users and launch named group conversations.
   - **Soft Deletes**: Senders can natively delete their messages without permanent database destruction.
   - **Emoji Reactions**: Interactive emoji reaction overlays for individual messages. 
3. **Live Presence & Typing Indicators**
   - **Smart Online Status**: Military-grade presence using a dual-system (visibility API + 30-second silent heartbeat pings) to ensure users who minimize the tab immediately render offline (gray indicator).
   - **Typing Bubbles**: Displays an animated "User is typing..." indicator with a dynamic 2-second debounce constraint. 
4. **Seamless UX**
   - **Unread Counters**: Real-time updating pill badges in the sidebar. 
   - **Smart Auto-Scroll**: Messages automatically jump to the bottom unless the user intentionally scrolls up to read history—surfacing a floating "New Messages ↓" button.
   - **Responsive Breakpoints**: Gracefully degrades down to a mobile-friendly slide-over UI.
   - **Empty/Skeleton States**: Premium pulsing loaders rendered explicitly while database queries hydrate.

---

## Local Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root of your project:
```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# The Issuer URL used to construct the Convex Auth Template
CLERK_ISSUER_URL=https://your-issuer.clerk.accounts.dev

# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOYMENT=dev:your-project
```

### 3. Setup Clerk JWT Template
To authorize Convex via Clerk, you *must* configure a JWT template in the Clerk Dashboard.
1. Navigate to **Clerk Dashboard -> JWT Templates -> New Template**.
2. Select **Convex**.
3. Name it exactly `convex` (all lowercase).
4. Save. 

### 4. Run the Servers 
The application requires two active parallel servers. Run each in a separate terminal:

**Terminal 1:** Boot the Convex Backend & Database
```bash
npx convex dev
```

**Terminal 2:** Boot the Next.js Frontend
```bash
npm run dev:frontend
```

Open [http://localhost:3000](http://localhost:3000) with your browser to explore the output!
