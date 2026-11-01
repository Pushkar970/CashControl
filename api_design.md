# API Specification

Base URL: `/api`
All authenticated endpoints require `Authorization: Bearer <token>` header.
All responses use standard error shape: `{statusCode: integer, message: string}`.

---

## Auth

| Method | Path | Request Body | Response Body | Auth |
|--------|------|-------------|---------------|------|
| POST | /api/signup | {email: string (required), password: string (required), name: string (required)} | {token: string, user: {id: UUID, email: string, name: string}} | No |
| POST | /api/auth/login | {email: string (required), password: string (required)} | {token: string, user: {id: UUID, email: string, name: string}} | No |
| GET | /api/auth/me | — | {user: {id: UUID, email: string, name: string, tier: string, createdAt: ISO8601}} | Bearer |
| GET | /api/auth/google?redirect_uri=string | — | Redirect to Google OAuth | No |
| GET | /api/auth/google/callback | — | Redirect to frontend `/auth/callback?token=<jwt>` | No |

Notes:
- Signup creates User + UserPlan (tier=FREE, aiQueriesUsed=0, subscriptionCount=0).
- JWT expiry: 7 days.
- `/api/auth/me` response includes `tier` from UserPlan for frontend gating.

---

## Push Tokens

| Method | Path | Request Body | Response Body | Auth |
|--------|------|-------------|---------------|------|
| POST | /api/push-tokens | {token: string (required), deviceType: string (required, "ios" or "android")} | {success: boolean} | Bearer |
| DELETE | /api/push-tokens/:token | — | {success: boolean} | Bearer |

---

## Subscriptions

| Method | Path | Request Body | Response Body | Auth |
|--------|------|-------------|---------------|------|
| GET | /api/subscriptions | query: ?page=integer&limit=integer | {items: Subscription[], total: integer, page: integer, totalPages: integer} | Bearer |
| GET | /api/subscriptions/upcoming | query: ?days=integer (7 or 30) | {items: Subscription[]} | Bearer |
| GET | /api/subscriptions/:id | — | Subscription | Bearer |
| POST | /api/subscriptions | {name: string (required), category: string (required), amount: number (required), currency: string (required, default "USD"), billingCycle: string (required, "weekly"|"monthly"|"yearly"), nextRenewalDate: ISO8601 (required), reminderDaysBefore: integer[] (optional, e.g. [1,3]), notes: string (optional)} | Subscription | Bearer |
| PATCH | /api/subscriptions/:id | {name: string (optional), category: string (optional), amount: number (optional), currency: string (optional), billingCycle: string (optional), nextRenewalDate: ISO8601 (optional), reminderDaysBefore: integer[] (optional), notes: string (optional)} | Subscription | Bearer |
| DELETE | /api/subscriptions/:id | — | {success: boolean} | Bearer |

**Subscription response shape:**
```
{
  id: UUID,
  name: string,
  category: string,
  amount: number,
  currency: string,
  billingCycle: string,
  nextRenewalDate: ISO8601,
  reminderDaysBefore: integer[],
  notes: string | null,
  createdAt: ISO8601,
  updatedAt: ISO8601
}
```

Business logic:
- POST checks UserPlan tier. If FREE and subscriptionCount >= 5, return 403 `{message: "Free tier limited to 5 subscriptions. Upgrade to Pro."}`
- POST increments UserPlan.subscriptionCount; DELETE decrements it.
- Backend schedules push notifications based on `reminderDaysBefore` and `nextRenewalDate`. A cron job runs daily, finds subscriptions with renewal within reminder windows, sends push via FCM/APNs to user's registered tokens.

---

## Expenses

| Method | Path | Request Body | Response Body | Auth |
|--------|------|-------------|---------------|------|
| GET | /api/expenses | query: ?month=string (YYYY-MM, optional)&category=string (optional)&page=integer&limit=integer | {items: Expense[], total: integer, page: integer, totalPages: integer} | Bearer |
| GET | /api/expenses/:id | — | Expense | Bearer |
| POST | /api/expenses | {title: string (required), amount: number (required), category: string (required), date: ISO8601 (required), notes: string (optional)} | Expense | Bearer |
| PATCH | /api/expenses/:id | {title: string (optional), amount: number (optional), category: string (optional), date: ISO8601 (optional), notes: string (optional)} | Expense | Bearer |
| DELETE | /api/expenses/:id | — | {success: boolean} | Bearer |

**Expense response shape:**
```
{
  id: UUID,
  title: string,
  amount: number,
  category: string,
  date: ISO8601,
  notes: string | null,
  createdAt: ISO8601,
  updatedAt: ISO8601
}
```

---

## Dashboard

| Method | Path | Request Body | Response Body | Auth |
|--------|------|-------------|---------------|------|
| GET | /api/dashboard/stats | — | {monthlySpend: number, yearlySpend: number, activeSubscriptionCount: integer, biggestSubscription: {name: string, amount: number} | null, topCategory: {name: string, amount: number} | null, monthOverMonthChange: number} | Bearer |
| GET | /api/dashboard/category-breakdown | query: ?period=string ("month" or "year") | {items: {category: string, amount: number, percentage: number}[]} | Bearer |
| GET | /api/dashboard/trends | — | {items: {month: string, amount: number}[]} (last 12 months) | Bearer |
| GET | /api/dashboard/split | — | {subscriptionTotal: number, expenseTotal: number, month: string} | Bearer |

Notes:
- `monthlySpend` = sum of all expenses in current month + prorated subscription costs for current month
- `yearlySpend` = sum of all expenses in current year + prorated subscription costs for current year
- `trends` aggregates both subscriptions (prorated monthly) and expenses by month
- `monthOverMonthChange` = percentage change from previous month (positive = increase)

---

## AI Chat & Suggestions

| Method | Path | Request Body | Response Body | Auth |
|--------|------|-------------|---------------|------|
| POST | /api/ai/chat | {message: string (required), conversationId: UUID (optional)} | {conversationId: UUID, message: {id: UUID, role: string, content: string, createdAt: ISO8601}} | Bearer |
| GET | /api/ai/conversations | — | {items: {id: UUID, lastMessage: string, updatedAt: ISO8601}[]} | Bearer |
| GET | /api/ai/conversations/:id/messages | query: ?page=integer&limit=integer | {items: Message[], total: integer, page: integer, totalPages: integer} | Bearer |
| GET | /api/ai/suggestions | — | {items: {id: UUID, title: string, description: string, category: string, icon: string}[], generatedAt: ISO8601} | Bearer |

**Message shape:**
```
{
  id: UUID,
  role: string ("user" | "assistant"),
  content: string,
  createdAt: ISO8601
}
```

Business logic:
- `POST /api/ai/chat`: If FREE tier and aiQueriesUsed >= 10, return 403 `{message: "Monthly AI query limit reached. Upgrade to Pro."}`
- Increments UserPlan.aiQueriesUsed on each user message.
- Backend constructs LLM prompt with user's financial context: recent expenses, subscriptions, totals. Sends to RouteLLM (OpenAI-compatible chat/completions) with system prompt instructing financial assistant behavior.
- If `conversationId` is null, creates new Conversation.
- `GET /api/ai/suggestions`: Backend fetches user's expense/subscription data, sends to LLM with prompt requesting 3-5 actionable cost-saving insights. Caches result for 24 hours (stores in AiSuggestion table with generatedAt). Returns cached if < 24h old.

---

## User / Plan Management

| Method | Path | Request Body | Response Body | Auth |
|--------|------|-------------|---------------|------|
| GET | /api/user/plan | — | {tier: string, aiQueriesUsed: integer, aiQueriesLimit: integer, subscriptionCount: integer, subscriptionLimit: integer, currentPeriodStart: ISO8601} | Bearer |
| POST | /api/user/upgrade | — | {success: boolean, tier: string} | Bearer |

Notes:
- `GET /api/user/plan`: Returns computed limits. FREE: aiQueriesLimit=10, subscriptionLimit=5. PRO: aiQueriesLimit=-1 (unlimited), subscriptionLimit=-1.
- `POST /api/user/upgrade`: Flips tier to PRO. No payment integration (simplified).
- `aiQueriesUsed` resets monthly. Backend checks `currentPeriodStart`; if > 30 days ago, resets counter and updates period start.

---

## CSV Export

| Method | Path | Request Body | Response Body | Auth |
|--------|------|-------------|---------------|------|
| GET | /api/export/csv | query: ?type=string ("expenses" or "subscriptions" or "all")&month=string (optional, YYYY-MM) | CSV file (Content-Type: text/csv, Content-Disposition: attachment) | Bearer |

Notes:
- Pro only. If FREE tier, return 403.
- Exports user's data as CSV with appropriate headers.
