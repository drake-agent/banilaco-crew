# Banilaco Crew — K-Beauty Creator Program Platform

TikTok Shop 어필리에이트 30,000명 모집을 위한 크리에이터 관리 플랫폼.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **Icons**: Lucide React

## Features

### Public Pages
- **Landing Page** (`/`) — 크리에이터 모집 랜딩페이지 (커미션, 혜택, 가입 안내)
- **Join Form** (`/join`) — 크리에이터 가입 신청 폼

### Admin Dashboard (`/dashboard`)
- **Overview** — 30K 목표 진행률, 주간 KPI 요약, 채널 믹스, 티어 분포
- **Creators** — 크리에이터 DB 관리 (검색, 필터, 티어, 소스, 성과 트래킹)
- **Samples** — 샘플 발송 관리 SOP (요청→발송→배송→리마인더→콘텐츠)
- **Outreach** — 아웃리치 파이프라인 (경쟁사 헌팅, DM A/B 테스트, 전환 추적)
- **KPI** — 주간 KPI 대시보드 (30K 목표 추적, 채널별 분석, 트렌드 차트)

## Setup

### 1. Clone & Install
```bash
cd banilaco-crew
npm install
```

### 2. Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Copy `.env.example` to `.env.local` and fill in your Supabase credentials:
```bash
cp .env.example .env.local
```
3. Run the schema migration:
```bash
# In Supabase SQL Editor, run:
# supabase/schema.sql
```
4. Seed the database (optional):
```bash
# In Supabase SQL Editor, run:
# supabase/seed.sql
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the landing page.
Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard) for the admin dashboard.

## Database Schema

| Table | Description |
|-------|-------------|
| `creators` | 크리에이터 DB (티어, 소스, GMV, 콘텐츠 수) |
| `sample_shipments` | 샘플 발송 관리 (SOP 파이프라인) |
| `outreach_pipeline` | 아웃리치 파이프라인 (경쟁사 헌팅) |
| `mcn_partners` | MCN 파트너 관리 |
| `weekly_kpis` | 주간 KPI 스냅샷 |
| `content_tracking` | 콘텐츠 성과 추적 |
| `weekly_challenges` | 주간 챌린지 |
| `join_applications` | 공개 가입 신청 |

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/join` | 크리에이터 가입 신청 |
| GET/POST | `/api/creators` | 크리에이터 CRUD |
| GET/POST/PATCH | `/api/samples` | 샘플 발송 관리 |
| GET/POST/PATCH | `/api/outreach` | 아웃리치 파이프라인 |
| GET/POST | `/api/kpi` | KPI 데이터 |
| PUT | `/api/kpi` | 대시보드 서머리 집계 |

## Tier System

| Tier | Condition | Commission | Perks |
|------|-----------|------------|-------|
| Bronze | 가입 | 30% | 무료 샘플 |
| Silver | 월 5건+ 콘텐츠 | 35% | 신제품 우선 샘플 |
| Gold | 월 $1,000+ GMV | 40% | 월 $200 보너스 |
| Diamond | 월 $5,000+ GMV | 40%+ | 월 $500~1,000 + 앰배서더 |

## Project Structure

```
banilaco-crew/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Public landing page
│   │   ├── join/page.tsx         # Public join form
│   │   ├── dashboard/
│   │   │   ├── layout.tsx        # Dashboard sidebar layout
│   │   │   ├── page.tsx          # Overview dashboard
│   │   │   ├── creators/page.tsx # Creator management
│   │   │   ├── samples/page.tsx  # Sample operations
│   │   │   ├── outreach/page.tsx # Outreach pipeline
│   │   │   └── kpi/page.tsx      # KPI dashboard
│   │   └── api/                  # API routes
│   ├── components/ui/            # Reusable UI components
│   ├── lib/                      # Utilities & Supabase client
│   └── types/                    # TypeScript types
├── supabase/
│   ├── schema.sql                # Database schema
│   └── seed.sql                  # Sample data
└── package.json
```
