# Expense Tracker App

## Overview
Full-stack subscription & expense tracking app with AI assistant. NestJS + PostgreSQL backend, React Native + Expo frontend.

## Backend Architecture
- **Auth**: email/password (bcryptjs) + Google SSO (server-side OAuth), JWT 7-day expiry
- **Modules**: Auth, Subscriptions, Expenses, Dashboard, AI (RouteLLM), User/Plan, Export (CSV, Pro-only), PushTokens
- **Free tier**: 5 subscriptions, 10 AI queries/month; Pro: unlimited
- **AI**: POST /api/ai/chat with financial context → RouteLLM; cached 24h suggestions

## Frontend Architecture
- **Theme**: Dark mode (#0A0A0A base, #6366F1/#8B5CF6 gradients, #06B6D4 cyan accents)
- **Navigation**: expo-router with bottom tabs (Home, Subscriptions, Expenses, AI Chat, Profile)
- **Auth flow**: Layout-based guards with <Redirect>, AuthContext with login/signup/logout
- **Charts**: react-native-chart-kit (PieChart, BarChart) with dark theme
- **Biometric**: expo-local-authentication + expo-secure-store for JWT storage
- **Components**: GradientButton, Card, SkeletonLoader, ErrorBoundary

## Key Routes
- `/auth/login`, `/auth/signup`, `/auth/callback` (Google SSO)
- `/tabs/home`, `/tabs/subscriptions`, `/tabs/expenses`, `/tabs/chat`, `/tabs/profile`
- `/subscription/add`, `/subscription/[id]`, `/subscription/[id]/edit`
- `/expense/add`, `/expense/[id]`, `/expense/[id]/edit`, `/expense/smart-paste`
- `/upgrade`, `/insights`

## Smart Paste SMS Feature
- Backend: POST /api/expenses/parse-sms — accepts { messages: string[] }, uses LLM to extract transaction details
- Frontend: `/expense/smart-paste` screen — paste bank SMS, AI parses, user reviews and saves
- Expense model has `source` field: "manual" (default) or "sms" (auto-parsed)
- SMS badge shown on expense cards and detail screens for SMS-sourced expenses
- Accessible via Smart Paste bar on the Expenses tab

## SMS Auto-Sync Feature
- **Library**: `react-native-get-sms-android` for reading Android SMS inbox
- **Config plugin**: `plugins/withSmsPermission.js` adds READ_SMS + RECEIVE_SMS to AndroidManifest
- **Service**: `src/services/smsReader.ts` — reads inbox, filters with regex for Indian bank/UPI debit SMS, deduplicates via AsyncStorage hashes
- **Screen**: `app/expense/sms-sync.tsx` — permission flow → scan → AI parse → review with checkboxes → batch save
- **Backend**: `POST /api/expenses/batch` — saves multiple expenses in one transaction
- **Deduplication**: SMS hashes stored in AsyncStorage key `sms_auto_tracker_processed` (max 2000)
- **Platform**: Android-only (iOS cannot read SMS). Web preview shows fallback pointing to Smart Paste.
- **Regex patterns**: Detects Indian bank SMS (HDFC, ICICI, SBI, Axis, Kotak, etc.), UPI, NEFT, IMPS, POS, ATM, credit card alerts. Skips OTP, credits/refunds.
