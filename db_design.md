# Database Schema

All tables use UUID primary keys (auto-generated), DateTime timestamps.

---

## User

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK, auto-generated |
| email | String | Unique, required |
| password | String | bcrypt hashed, nullable (null for Google SSO-only users) |
| name | String | Required |
| googleId | String | Unique, nullable (set for Google SSO users) |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto-updated |

Indexes: `email` (unique), `googleId` (unique, where not null)

---

## UserPlan

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK, auto-generated |
| userId | UUID | FK to User, unique, required, ON DELETE CASCADE |
| tier | String | Required, default "FREE" (enum: "FREE", "PRO") |
| aiQueriesUsed | Integer | Default 0 |
| subscriptionCount | Integer | Default 0 |
| currentPeriodStart | DateTime | Default now() |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto-updated |

Indexes: `userId` (unique)

Relation: User 1:1 UserPlan

---

## Subscription

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK, auto-generated |
| userId | UUID | FK to User, required, ON DELETE CASCADE |
| name | String | Required |
| category | String | Required |
| amount | Decimal | Required |
| currency | String | Required, default "USD" |
| billingCycle | String | Required ("weekly", "monthly", "yearly") |
| nextRenewalDate | DateTime | Required |
| reminderDaysBefore | Integer[] | Default [] |
| notes | String | Nullable |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto-updated |

Indexes: `userId`, `(userId, nextRenewalDate)`, `(userId, category)`

Relation: User 1:N Subscription

---

## Expense

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK, auto-generated |
| userId | UUID | FK to User, required, ON DELETE CASCADE |
| title | String | Required |
| amount | Decimal | Required |
| category | String | Required |
| date | DateTime | Required |
| notes | String | Nullable |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto-updated |

Indexes: `userId`, `(userId, date)`, `(userId, category)`

Relation: User 1:N Expense

---

## Conversation

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK, auto-generated |
| userId | UUID | FK to User, required, ON DELETE CASCADE |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto-updated |

Indexes: `userId`

Relation: User 1:N Conversation

---

## Message

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK, auto-generated |
| conversationId | UUID | FK to Conversation, required, ON DELETE CASCADE |
| role | String | Required ("user" or "assistant") |
| content | String | Required (text, supports long content) |
| createdAt | DateTime | Auto |

Indexes: `conversationId`, `(conversationId, createdAt)`

Relation: Conversation 1:N Message

---

## AiSuggestion

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK, auto-generated |
| userId | UUID | FK to User, required, ON DELETE CASCADE |
| title | String | Required |
| description | String | Required |
| category | String | Required |
| icon | String | Required (icon name hint, e.g. "lightbulb", "warning", "trending-down") |
| generatedAt | DateTime | Required |
| createdAt | DateTime | Auto |

Indexes: `(userId, generatedAt)`

Relation: User 1:N AiSuggestion

---

## PushToken

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK, auto-generated |
| userId | UUID | FK to User, required, ON DELETE CASCADE |
| token | String | Unique, required |
| deviceType | String | Required ("ios" or "android") |
| createdAt | DateTime | Auto |

Indexes: `token` (unique), `userId`

Relation: User 1:N PushToken

---

## Entity Relationship Summary

```
User 1:1 UserPlan
User 1:N Subscription
User 1:N Expense
User 1:N Conversation
Conversation 1:N Message
User 1:N AiSuggestion
User 1:N PushToken
```

All foreign keys cascade on delete to ensure clean user deletion.
