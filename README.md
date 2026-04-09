# BANILACO SQUAD — K-Beauty Creator Program Platform

> "습관이 성과가 되고, 성과가 명예가 되는 크리에이터 주도 성장 엔진"

TikTok Shop 어필리에이트 크리에이터 관리 플랫폼. Daily Missions + PINK LEAGUE + Squad 수익공유.

## Tech Stack
- **Frontend**: Next.js 16.2 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes + PostgreSQL + Drizzle ORM
- **Auth**: NextAuth.js (Discord OAuth)
- **Community**: Discord Bot (discord.js v14) + 4-Layer Memory (effy pattern)
- **AI**: Anthropic Claude (recommendations, distiller, agent)
- **Integrations**: TikTok Shop API, AfterShip, Apify Crawler

## Tech Stack

- **Frontend**: Next.js 16.2 (App Router, Turbopack) + TypeScript 5.9 + Tailwind CSS 4.2
- **Backend**: Next.js API Routes + Supabase SSR
- **Database**: Supabase (PostgreSQL) with RLS
- **Auth**: Supabase Auth (@supabase/ssr 0.9)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Validation**: Zod
- **AI**: Anthropic Claude (recommendation engine)
- **Integrations**: TikTok Shop Open API (HMAC-SHA256, OAuth 2.0), Apify Crawler, AfterShip

## Tier System

| Tier | Condition | Commission | 자동 샘플 배정 |
|------|-----------|------------|----------------|
| Bronze | 가입 | 15% | Mini ($17.50) |
| Silver | 월 5건+ 콘텐츠 | 20% | Hero ($33.50) |
| Gold | 월 $1,000+ GMV | 30% | Premium ($57.50, 자동승인) |
| Diamond | 월 $5,000+ GMV | 30%+ | Full ($94.50, 자동승인) |

- 티어 자동 평가: DB 트리거 `auto_update_tier()` — GMV/콘텐츠 변동 시 자동 승급/유지
- 샘플 자동 배정: DB 트리거 `auto_allocate_sample()` — 티어 승급 시 쿨다운/월간 상한 적용

## Features

### Public Pages
- **Landing Page** (`/`) — 크리에이터 모집 랜딩페이지 (커미션, 혜택, 가입 안내)
- **Join Form** (`/join`) — 크리에이터 가입 신청 폼 (Zod 검증, rate limiting)
- **Auth** (`/auth`) — Supabase 인증

### Creator Portal (`/creator`)
- **Dashboard** — 개인 성과 요약, 티어 진행률 (API 연동)
- **Samples** — 샘플 요청/배송 현황 (API 연동)
- **Referrals** — 레퍼럴 프로그램
- **Improve** — AI 기반 성과 개선 추천
- **Error Boundary** — 컴포넌트 에러 격리 및 복구

### Admin Dashboard (`/dashboard`)
- **Overview** — 30K 목표 진행률, 주간 KPI, 채널 믹스, 티어 분포 (API 연동)
- **Creators** — 크리에이터 DB 관리 (검색, 필터, 페이지네이션, API 연동)
- **Samples** — 샘플 발송 관리 SOP (requested→approved→shipped→delivered→content_posted)
- **Shipping** — 배송 추적 (AfterShip 웹훅 실시간 + Cron 배치 동기화)
- **Outreach** — 아웃리치 파이프라인 (경쟁사 디스커버리, Zod 검증)
- **KPI** — 주간 KPI 대시보드 (30K 목표, 채널별 분석, 트렌드 차트)
- **Referrals** — 레퍼럴 관리 (admin 전용 상태 업데이트)
- **Error Boundary** — 대시보드 에러 격리 및 복구

## Architecture

### TikTok Shop API Integration
- **OAuth 2.0**: 앱 인증 + 토큰 교환 (CSRF 방지: httpOnly state cookie)
- **HMAC-SHA256**: API 요청 서명 + 웹훅 검증 (timingSafeEqual)
- **Rate Limiting**: Retry-After 헤더 파싱, 최대 5회 재시도 (지수 백오프)
- **Adapter Pattern**: `createAdapters()` 팩토리, `DataSyncOrchestrator` 파이프라인

### Sample Tracking Lifecycle
```
requested → approved → shipped → delivered → reminder_1 → reminder_2 → content_posted / no_response
```
- AfterShip 웹훅 (실시간) + Cron 배치 동기화 (짝수 시간마다)
- 콘텐츠 자동 감지: 배치 쿼리로 N+1 최적화
- 리마인더 엔진: 배송 완료 후 자동 알림

### Cron Schedule (Vercel Cron, UTC 기준)
| UTC | KST | Job | Timeout |
|-----|-----|-----|---------|
| 18:00 | 03:00 | Full Sync (프로필+콘텐츠+메트릭) | 55s |
| 03/09/15/21 | 12/18/00/06 | Shop Orders 동기화 | 55s |
| 짝수시간 | — | 샘플 배송 추적 | 55s |
| 00:00 월/목 | 09:00 월/목 | 경쟁사 디스커버리 | 55s |

## API Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/join` | Public | 크리에이터 가입 신청 (rate limited) |
| GET/POST | `/api/creators` | Admin | 크리에이터 CRUD |
| GET/POST/PATCH | `/api/samples` | Admin | 샘플 발송 관리 (Zod 검증) |
| GET | `/api/samples/analytics` | Admin | 샘플 ROI 분석 (파이프라인, 티어별 ROI) |
| GET/PATCH | `/api/shipping` | Admin | 배송 추적 |
| GET/POST/PATCH | `/api/outreach` | Admin | 아웃리치 파이프라인 (Zod 검증) |
| GET/POST/PUT | `/api/kpi` | Admin | KPI 데이터 + DB 집계 |
| GET/POST | `/api/referrals` | Admin | 레퍼럴 관리 (상태 변경: admin 전용) |
| POST | `/api/reminders` | Admin | 리마인더 발송 |
| GET/POST | `/api/sync` | Cron/Admin | TikTok Shop 동기화 (timing-safe auth) |
| GET | `/api/creator` | Creator | 본인 정보 (IDOR 보호) |
| GET | `/api/creator/recommendations` | Creator | AI 추천 |
| GET/POST | `/api/tiktok/auth` | Admin | TikTok OAuth 2.0 (state cookie CSRF 방지) |
| POST | `/api/webhooks/tiktok` | Webhook | TikTok 웹훅 수신 (HMAC 검증, 에러 로깅) |
| POST | `/api/webhooks/aftership` | Webhook | AfterShip 배송 웹훅 (서명 검증, 503 if no secret) |

## Setup

### 1. Clone & Install
```bash
git clone https://github.com/drake-agent/banilaco-crew.git
cd banilaco-crew
npm install
```

### 2. Environment Variables
```bash
cp .env.example .env.local
```

Required:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `TIKTOK_SHOP_APP_KEY`, `TIKTOK_SHOP_APP_SECRET`
- `CRON_SECRET`

Optional:
- `AFTERSHIP_API_KEY`, `AFTERSHIP_WEBHOOK_SECRET` (배송 추적)
- `APIFY_API_TOKEN` 또는 `CRAWLER_BASE_URL` (크롤러)
- `RESEND_API_KEY` (이메일), `DISCORD_WEBHOOK_URL` (알림)

시작 시 `validateEnv()`가 누락된 환경변수를 자동 체크합니다.

### 3. Supabase Setup
SQL Editor에서 순서대로 실행:
```
supabase/schema.sql         → Base schema
supabase/schema-v2.sql      → Creator accounts, TikTok credentials
supabase/schema-v3.sql      → KPI tables
supabase/schema-v4.sql      → Outreach, referrals, RLS, indexes
supabase/schema-v5.sql      → TikTok API integration tables
supabase/schema-v6.sql      → Sample tracking, content_tracking, auto triggers
supabase/schema-v7-migrations.sql → Migration tracking table
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Security

- **Supabase RLS** with `is_admin()` helper + dual client (service_role / anon)
- **IDOR Protection**: Creator API에서 creator_accounts 소유권 검증
- **Admin Auth**: 관리자 전용 엔드포인트에 role 검사
- **OAuth CSRF**: httpOnly cookie 기반 state 검증
- **Webhook Verification**: HMAC-SHA256 + timingSafeEqual (시크릿 미설정 시 503 거부)
- **Timing-safe Auth**: Cron 인증에 crypto.timingSafeEqual 사용
- **Input Validation**: Zod 스키마 검증 (outreach, samples POST/PATCH)
- **Field Whitelisting**: 공유 `pickFields()` 유틸리티로 mass assignment 방지
- **Rate Limiting**: 공개 엔드포인트 in-memory rate limiter
- **Error Boundaries**: Dashboard/Creator 페이지 에러 격리

## Shared Utilities (`src/lib/api/`)

| Module | Export | Description |
|--------|--------|-------------|
| `pagination.ts` | `clampPagination()` | 페이지네이션 파라미터 범위 제한 |
| `auth.ts` | `verifyAuth()`, `verifyAdmin()`, `getCreatorFromAuth()` | 인증/인가 헬퍼 |
| `errors.ts` | `apiError()`, `handleRouteError()` | 표준화된 에러 응답 |
| `fields.ts` | `pickFields()` | 안전한 필드 화이트리스트 |
