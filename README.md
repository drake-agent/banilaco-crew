# Banilaco Crew — K-Beauty Creator Program Platform

TikTok Shop 어필리에이트 30,000명 모집을 위한 크리에이터 관리 플랫폼.

## Tech Stack

- **Frontend**: Next.js 16 (App Router, Turbopack) + TypeScript 5.8 + Tailwind CSS 4
- **Backend**: Next.js API Routes + Supabase SSR
- **Database**: Supabase (PostgreSQL) with RLS
- **Auth**: Supabase Auth (@supabase/ssr)
- **Charts**: Recharts
- **Icons**: Lucide React
- **AI**: Anthropic Claude (recommendation engine)
- **Integrations**: TikTok Shop API, Apify Crawler, AfterShip

## Features

### Public Pages
- **Landing Page** (`/`) — 크리에이터 모집 랜딩페이지 (커미션, 혜택, 가입 안내)
- **Join Form** (`/join`) — 크리에이터 가입 신청 폼 (rate limiting)
- **Auth** (`/auth`) — Supabase 인증

### Creator Portal (`/creator`)
- **Dashboard** — 개인 성과 요약, 티어 진행률
- **Earnings** — 수익 트래킹
- **Content** — 콘텐츠 성과 추적
- **Samples** — 샘플 요청/배송 현황
- **Referrals** — 레퍼럴 프로그램
- **Community** — 크리에이터 커뮤니티
- **Improve** — AI 기반 성과 개선 추천

### Admin Dashboard (`/dashboard`)
- **Overview** — 30K 목표 진행률, 주간 KPI 요약, 채널 믹스, 티어 분포
- **Creators** — 크리에이터 DB 관리 (검색, 필터, 티어, 소스, 성과 트래킹)
- **Samples** — 샘플 발송 관리 SOP (요청→발송→배송→리마인더→콘텐츠)
- **Shipping** — 배송 추적 관리
- **Outreach** — 아웃리치 파이프라인 (경쟁사 헌팅, DM A/B 테스트, 전환 추적)
- **KPI** — 주간 KPI 대시보드 (30K 목표 추적, 채널별 분석, 트렌드 차트)
- **Referrals** — 레퍼럴 관리

## Setup

### 1. Clone & Install
```bash
git clone https://github.com/drake-agent/banilaco-crew.git
cd banilaco-crew
npm install
```

### 2. Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Copy `.env.example` to `.env.local` and fill in your credentials:
```bash
cp .env.example .env.local
```
3. Run the schema migrations in Supabase SQL Editor:
```
supabase/schema.sql    → Base schema
supabase/schema-v4.sql → Latest migration (RLS, RPCs, indexes)
```
4. Seed the database (optional):
```
supabase/seed.sql
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the landing page.

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/join` | 크리에이터 가입 신청 (rate limited) |
| GET/POST | `/api/creators` | 크리에이터 CRUD |
| GET/POST/PATCH | `/api/samples` | 샘플 발송 관리 |
| GET/PATCH | `/api/shipping` | 배송 추적 |
| GET/POST/PATCH | `/api/outreach` | 아웃리치 파이프라인 |
| GET/POST/PUT | `/api/kpi` | KPI 데이터 + DB 집계 |
| GET/POST | `/api/referrals` | 레퍼럴 관리 |
| POST | `/api/reminders` | 리마인더 발송 |
| POST | `/api/sync` | TikTok Shop 동기화 (Vercel Cron) |
| GET | `/api/creator` | 크리에이터 본인 정보 |
| GET | `/api/creator/recommendations` | AI 추천 |

## Tier System

| Tier | Condition | Commission | Perks |
|------|-----------|------------|-------|
| Bronze | 가입 | 30% | 무료 샘플 |
| Silver | 월 5건+ 콘텐츠 | 35% | 신제품 우선 샘플 |
| Gold | 월 $1,000+ GMV | 40% | 월 $200 보너스 |
| Diamond | 월 $5,000+ GMV | 40%+ | 월 $500~1,000 + 앰배서더 |

## Security

- Supabase RLS (Row Level Security) with `is_admin()` helper
- Dual client: `createServerClient()` (service_role) / `createUserScopedClient()` (anon, RLS enforced)
- In-memory rate limiting on public endpoints
- Field whitelisting for update operations
- Input sanitization (PostgREST ilike injection prevention)
- Timing-safe token comparison for cron auth
