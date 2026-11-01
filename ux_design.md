# UX Specification — Subscription & Expense Tracker with AI Assistant

## Design Direction

- **Theme**: Dark mode — backgrounds use dark grays `#0A0A0A` (base), `#111111` (surface), `#1A1A1A` (card)
- **Primary palette**: Indigo `#6366F1` → Violet `#8B5CF6` gradient for buttons and accents
- **Accent**: Cyan `#06B6D4` for secondary highlights, chart accents, AI elements
- **Text**: Headings `#F1F5F9`, Body `#CBD5E1`, Muted `#64748B`
- **Typography**: Display/Heading — `Outfit` (Google Font, 600/700 weight). Body — `Inter` (Google Font, 400/500). Scale: Display 32px, H1 24px, H2 20px, Body 16px, Caption 13px
- **Cards**: Rounded 16px, glass-effect translucent backgrounds (`rgba(255,255,255,0.05)` with subtle border `rgba(255,255,255,0.08)`)
- **Buttons**: Linear gradient `[#6366F1, #8B5CF6]`, rounded 12px, press scale 0.97 + haptic
- **Charts**: `react-native-chart-kit` or `victory-native` with gradient fills matching palette
- **Spacing**: 8pt grid throughout

## Animation & Motion

- Screen transitions: fade + slide (stack push right, pop left)
- Tab switches: cross-fade 200ms
- Button press: scale 0.97 spring + light haptic
- Cards: press scale 0.98
- List items: staggered fade-in on mount (50ms delay per item)
- Charts: animated on mount (pie slices grow, bars rise)
- Loading: skeleton shimmer placeholders (never spinners)
- Bottom sheets: multi-snap with backdrop blur + medium haptic on snap
- Respect `AccessibilityInfo.isReduceMotionEnabled`

## File Structure

```
app/
  _layout.tsx              # Root layout: AuthProvider, theme, font loading. Redirects: if loading → splash, if !authenticated → /auth/login, if authenticated → /tabs/home
  auth/
    _layout.tsx            # Auth stack layout. If authenticated → <Redirect href="/tabs/home" />
    login.tsx              # Login screen
    signup.tsx             # Signup screen
    callback.tsx           # Google SSO callback
  tabs/
    _layout.tsx            # <Tabs> with 5 tabs: Home, Subscriptions, Expenses, AI Chat, Profile. If !authenticated → <Redirect href="/auth/login" />
    home.tsx               # Dashboard
    subscriptions.tsx      # Subscription list
    expenses.tsx           # Expense list
    chat.tsx               # AI Chat
    profile.tsx            # Profile & settings
  subscription/
    add.tsx                # Add subscription
    [id]/
      index.tsx            # Subscription detail
      edit.tsx             # Edit subscription
  expense/
    add.tsx                # Add expense
    [id]/
      index.tsx            # Expense detail
      edit.tsx             # Edit expense
  upgrade.tsx              # Pro upgrade screen
  insights.tsx             # Full insights/suggestions screen
```

## Screens

### 1. Login Screen (`app/auth/login.tsx`)
- **Purpose**: Authenticate existing users
- **Layout**:
  - App logo + name centered top (with subtle gradient glow)
  - Email input (floating label, keyboard type `email-address`)
  - Password input (floating label, secure entry, show/hide toggle)
  - "Log In" gradient button (full width)
  - Divider: "or continue with"
  - Google SSO button (outlined, Google icon + "Sign in with Google")
  - Biometric login button (icon: Face ID or Fingerprint depending on device) — only visible if user has previously enabled biometrics (check `SecureStore` for stored token). Tap triggers `expo-local-authentication` prompt; on success, retrieves stored JWT from SecureStore, validates via `GET /api/auth/me`; if valid, AuthProvider state updates and layout switches to tabs; if expired/invalid, show toast "Session expired, please log in again" and clear stored token
  - Footer link: "Don't have an account? Sign Up" → push `/auth/signup`
- **Validation**: Email format, password min 6 chars. Error shake on invalid fields.
- **Actions**: On successful login, AuthProvider state updates; the auth layout detects `isAuthenticated` and the layout switches to the authenticated tab group.

### 2. Signup Screen (`app/auth/signup.tsx`)
- **Purpose**: Register new users
- **Layout**:
  - Back arrow → pop to login
  - "Create Account" heading
  - Name input (floating label)
  - Email input (floating label)
  - Password input (floating label, strength indicator bar below)
  - "Sign Up" gradient button
  - Divider + Google SSO button
  - Footer: "Already have an account? Log In" → pop
- **Validation**: Name required, email format, password min 8 chars with strength meter
- **Actions**: On successful signup, AuthProvider state updates; layout switches to authenticated tab group. New users start on Free tier (backend creates UserPlan with tier=FREE).

### 3. Google SSO Callback (`app/auth/callback.tsx`)
- **Purpose**: Handle redirect from Google SSO
- **Layout**: Full-screen loading with app logo + shimmer
- **Logic**: Extracts `token` from query params, calls `AuthProvider.setToken(token)` which validates via `GET /api/auth/me`. On success, AuthProvider state updates and layout switches to tabs. On failure, navigate to `/auth/login` with error toast.

### 4. Dashboard / Home (`app/tabs/home.tsx`)
- **Purpose**: Overview of financial health
- **Layout** (scrollable):
  - **Header**: "Dashboard" title + greeting ("Hello, {name}") with user avatar placeholder
  - **Summary Row** (horizontal scroll, 2 cards):
    - "Monthly Spend" card: total amount for current month, small trend arrow (up/down vs last month)
    - "Yearly Spend" card: total for current year
  - **Quick Stats Row** (3 mini cards):
    - "Active Subscriptions" count
    - "Biggest Subscription" name + amount
    - "Top Category" name + amount
  - **Pie Chart Card**: "Spending by Category" — pie chart for current month. Toggle pill: "Month" / "Year". Each slice colored distinctly. Legend below chart.
  - **Bar Chart Card**: "Monthly Trends" — bar chart showing last 12 months spending. Bars use gradient fill. X-axis: month abbreviations. Y-axis: amounts.
  - **Split Chart Card**: "Subscriptions vs One-Time" — horizontal stacked bar or donut showing subscription total vs expense total for current month
  - **Insights & Suggestions Card**: "AI Insights" header with sparkle icon. Shows up to 3 AI-generated suggestion cards (each with icon, short text, action hint). "View All" link → push `/insights`. If free tier and queries exhausted, show "Upgrade to Pro for unlimited insights" with upgrade button.
  - **Upcoming Renewals Card**: "Upcoming Renewals (7 days)" — list of up to 5 subscriptions renewing soon, each showing name, amount, days until renewal. "See All" → push `/tabs/subscriptions` (scrolls to upcoming section)
- **Data**: `GET /api/dashboard/stats`, `GET /api/dashboard/category-breakdown?period=month`, `GET /api/dashboard/trends`, `GET /api/dashboard/split`, `GET /api/ai/suggestions`, `GET /api/subscriptions/upcoming?days=7`
- **Pull-to-refresh**: Refreshes all data

### 5. Subscriptions List (`app/tabs/subscriptions.tsx`)
- **Purpose**: Manage all subscriptions
- **Layout**:
  - Header: "Subscriptions" + total monthly cost badge
  - **Segment control**: "Active" / "Upcoming Renewals"
  - **Active tab**: List of subscription cards. Each card shows: color indicator (left border, color based on category), name, category chip, amount + cycle (e.g., "$12.99/mo"), next renewal date. Tap → push `/subscription/[id]`
  - **Upcoming tab**: Grouped by timeframe — "Next 7 Days", "Next 30 Days". Same card style with days-until badge.
  - **FAB** (bottom-right): "+" button → push `/subscription/add`. If free tier and already at 5 subscriptions, show bottom sheet prompting upgrade instead.
  - **Empty state**: Illustration + "No subscriptions yet" + "Add your first subscription" button
- **Data**: `GET /api/subscriptions`, `GET /api/subscriptions/upcoming?days=30`

### 6. Add Subscription (`app/subscription/add.tsx`)
- **Purpose**: Create a new subscription
- **Layout** (scrollable form):
  - Header: "Add Subscription" + close (X) button → pop
  - Name input (floating label, required)
  - Category picker (bottom sheet with options: Streaming, SaaS, Fitness, Music, News, Cloud Storage, Gaming, Food Delivery, Education, Other)
  - Amount input (numeric keyboard, required) + Currency picker (dropdown: USD, EUR, GBP, etc.)
  - Billing cycle selector (chips: Weekly, Monthly, Yearly)
  - Next renewal date picker (date picker, defaults to today)
  - Reminder toggle + reminder options (1 day before, 3 days before, both) — shown when toggle is on
  - Notes input (multiline, optional)
  - "Save Subscription" gradient button
- **Validation**: Name and amount required, amount > 0
- **Action**: `POST /api/subscriptions` → on success, pop back to list with success toast

### 7. Subscription Detail (`app/subscription/[id]/index.tsx`)
- **Purpose**: View subscription details
- **Layout**:
  - Header with back arrow + Edit button (top right) → push `edit.tsx`
  - Large card: subscription name, category chip, color accent
  - Details list: Amount, Currency, Billing Cycle, Next Renewal, Reminder settings, Notes
  - "Cost History" mini section: calculated yearly cost
  - Delete button (destructive, red outline) at bottom → confirmation dialog → `DELETE /api/subscriptions/:id` → pop to list
- **Data**: `GET /api/subscriptions/:id`

### 8. Edit Subscription (`app/subscription/[id]/edit.tsx`)
- **Purpose**: Modify existing subscription
- **Layout**: Same form as Add, pre-filled with current values
- **Action**: `PATCH /api/subscriptions/:id` → pop to detail with success toast

### 9. Expenses List (`app/tabs/expenses.tsx`)
- **Purpose**: View and manage expenses
- **Layout**:
  - Header: "Expenses" + total for selected month
  - **Filter bar**: Month picker (scrollable month pills for last 12 months, current selected) + Category filter (dropdown, "All" default)
  - **Expense list** (FlashList): Each item shows title, category chip, amount, date. Tap → push `/expense/[id]`
  - **FAB**: "+" → push `/expense/add`
  - **Empty state**: "No expenses for this period" + add button
- **Data**: `GET /api/expenses?month=2024-01&category=all&page=1&limit=20`

### 10. Add Expense (`app/expense/add.tsx`)
- **Purpose**: Record a new expense
- **Layout**:
  - Header: "Add Expense" + close (X)
  - Title input (required)
  - Amount input (numeric, required)
  - Category picker (same categories as subscriptions + additional: Groceries, Transport, Dining, Shopping, Bills, Health, Travel, Entertainment, Other)
  - Date picker (defaults to today)
  - Notes input (optional, multiline)
  - "Save Expense" gradient button
- **Action**: `POST /api/expenses` → pop with toast

### 11. Expense Detail (`app/expense/[id]/index.tsx`)
- **Purpose**: View expense details
- **Layout**: Header + back + Edit button. Card with all fields. Delete button at bottom.
- **Data**: `GET /api/expenses/:id`

### 12. Edit Expense (`app/expense/[id]/edit.tsx`)
- **Purpose**: Modify expense
- **Layout**: Same form as Add, pre-filled
- **Action**: `PATCH /api/expenses/:id` → pop to detail

### 13. AI Chat (`app/tabs/chat.tsx`)
- **Purpose**: Conversational AI assistant for expense queries
- **Layout**:
  - Header: "AI Assistant" with sparkle icon
  - Chat message list (FlatList, inverted). User messages: right-aligned, gradient bubble. AI messages: left-aligned, dark card bubble with cyan accent border. AI messages support markdown rendering.
  - Suggested prompts row (horizontal scroll, shown when conversation is empty): "What did I spend most on?", "How can I save money?", "Compare this month to last", "What subscriptions can I cancel?"
  - Input bar at bottom: text input + send button (gradient). Disabled while AI is responding (show typing indicator: three animated dots in AI bubble).
  - Free tier: show remaining query count badge near input ("7/10 queries left"). When exhausted, input disabled with "Upgrade to Pro" button replacing send.
- **Data**: `POST /api/ai/chat` (sends message, returns AI response), `GET /api/ai/conversations` (load history)
- **Behavior**: Messages persisted server-side. New session created on first message if no active conversation. Conversation history loaded on screen mount.

### 14. Profile (`app/tabs/profile.tsx`)
- **Purpose**: Account settings and plan management
- **Layout** (scrollable):
  - **User card**: Avatar placeholder (initials circle), name, email
  - **Plan section**: Current plan badge ("Free" or "Pro"), usage stats (subscriptions used: 3/5, AI queries: 7/10 for free). "Upgrade to Pro" button if free → push `/upgrade`
  - **Settings section** (list items):
    - "Biometric Login" toggle — when enabled, stores current JWT in SecureStore; when disabled, clears it. Only shown if device supports biometrics (check `expo-local-authentication` compatibility).
    - "Export to CSV" — Pro only. Tap triggers `GET /api/export/csv` download. If free, show lock icon + "Pro feature" label, tap → push `/upgrade`
    - "Notification Preferences" — toggle for renewal reminders (on/off)
  - **Danger zone**: "Log Out" button (outlined, red text) → clears auth state, clears SecureStore biometric token. AuthProvider state updates; layout switches to auth screens.
  - App version at bottom

### 15. Upgrade Screen (`app/upgrade.tsx`)
- **Purpose**: Upsell Pro tier
- **Layout**:
  - Header: back arrow + "Go Pro"
  - Hero section: gradient card with Pro badge, tagline "Unlock the full experience"
  - Feature comparison list (checkmarks): Free vs Pro side by side
    - Subscriptions: 5 vs Unlimited
    - Charts: Basic vs All
    - AI Queries: 10/month vs Unlimited
    - CSV Export: ✗ vs ✓
  - "Upgrade to Pro" large gradient button → `POST /api/user/upgrade` → on success, refresh user context, show success animation, pop back
  - Note: This is a simplified in-app upgrade (no real payment integration). The backend simply flips the tier.

### 16. Insights Screen (`app/insights.tsx`)
- **Purpose**: Full list of AI-generated insights
- **Layout**:
  - Header: back arrow + "AI Insights"
  - List of insight cards, each with: icon (lightbulb/warning/tip), title, description text, category tag
  - Pull-to-refresh to regenerate
- **Data**: `GET /api/ai/suggestions`

## Navigation

- **Unauthenticated flow**: `/auth/login` ↔ `/auth/signup` (stack push/pop). Google SSO opens browser → returns to `/auth/callback`.
- **Authenticated flow**: Bottom tabs with 5 tabs:
  1. Home (house icon) — `tabs/home.tsx`
  2. Subscriptions (repeat/refresh icon) — `tabs/subscriptions.tsx`
  3. Expenses (receipt icon) — `tabs/expenses.tsx`
  4. AI Chat (message-sparkle icon) — `tabs/chat.tsx`
  5. Profile (user icon) — `tabs/profile.tsx`
- **Stack screens** (outside tabs, share auth guard from root layout): subscription/add, subscription/[id]/index, subscription/[id]/edit, expense/add, expense/[id]/index, expense/[id]/edit, upgrade, insights
- **Auth guard**: Root `_layout.tsx` checks `isAuthenticated` and `isLoading`. Tabs `_layout.tsx` also guards. Auth `_layout.tsx` redirects authenticated users to tabs.

## Component Standards

- All buttons: gradient fill with press animation + haptic
- Inputs: floating labels, focus border animation (indigo glow), error state with shake
- Cards: 16px radius, glass effect, press scale 0.98
- Lists: `@shopify/flash-list` for expenses and subscriptions
- Loading: skeleton shimmer for all data screens
- Empty states: illustration + message + CTA button
- Accessibility: contrast ≥ 4.5:1, touch targets 44pt+, accessible labels on all interactive elements
- Charts: animated on mount, accessible color palette with sufficient contrast between segments
