# BANILACO SQUAD — Code Reference

프로젝트 코드베이스의 기술 레퍼런스. 각 파일이 어떤 도메인을 책임지고, 어떤 export를 제공하는지 파일/디렉토리 단위로 기술합니다.

---

## 1. Tech Stack

| Layer | 선택 | 비고 |
|-------|------|------|
| Framework | **Next.js 16.2** (App Router, Turbopack) | RSC + Edge/Node runtime 혼용 |
| UI | **React 19** + **Tailwind CSS v4** | Radix UI primitive, lucide-react 아이콘 |
| Language | **TypeScript 5.8** (strict) | path alias `@/* → ./src/*` |
| DB | **PostgreSQL** | 관리형 권장 (Neon/Supabase/RDS) |
| ORM | **Drizzle ORM 0.45** | `drizzle-kit` 로 마이그레이션 생성 |
| Auth | **NextAuth v5 (beta)** | Discord OAuth, JWT 세션 |
| Charts | **Recharts 2.15** | 대시보드 KPI 차트 |
| LLM | **@anthropic-ai/sdk 0.85** | Claude Sonnet 4 기반 에이전트 |
| Community | **discord.js v14** | 슬래시 명령 + NLP 게이트웨이 |
| Validation | **zod 3.24** | API 경계 input 검증 |

**Runtime**: Node 20+, Bun 권장 (dev), Vercel (배포).

### 스크립트
```bash
npm run dev           # next dev --turbopack
npm run build         # next build
npm run db:generate   # drizzle-kit generate (스키마 diff → SQL)
npm run db:migrate    # drizzle-kit migrate (DB 반영)
npm run db:push       # drizzle-kit push (개발용 직반영)
npm run db:studio     # Drizzle Studio GUI
npm run db:seed       # tsx src/db/seed.ts
npm run discord:bot   # tsx src/lib/discord/bot.ts (봇 프로세스 기동)
```

---

## 2. 전체 디렉토리 구조

```
banilaco-squad/
├── drizzle/                    # 마이그레이션 SQL + 스냅샷
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # 30개 API route
│   │   ├── creator/            # 크리에이터 포털
│   │   ├── dashboard/          # 어드민 대시보드
│   │   ├── auth/, join/        # 인증 + 온보딩
│   │   └── page.tsx            # 랜딩
│   ├── components/             # UI 컴포넌트 (shared)
│   ├── db/                     # Drizzle 스키마 + 클라이언트
│   ├── lib/                    # 비즈니스 로직 (도메인별)
│   │   ├── auth/ league/ health/ streak/ squad/
│   │   ├── missions/ collab/ tier/ referral/ reminders/
│   │   ├── discord/ ai/ adapters/ api/ tiktok/ sync/
│   │   └── validate-env.ts
│   ├── agent/                  # AI 에이전트 (4-Layer Memory)
│   ├── types/                  # 공유 타입
│   ├── hooks/                  # React hooks
│   └── middleware.ts           # 라우트 인가
├── drizzle.config.ts
├── next.config.ts
├── tsconfig.json
├── vercel.json
└── package.json
```

---

## 3. 루트 설정 파일

| 파일 | 역할 |
|------|------|
| `package.json` | 버전 3.0.0, deps + scripts 정의 |
| `tsconfig.json` | strict, ES2017, path alias `@/*` |
| `next.config.ts` | remotePatterns: tiktokcdn.com, supabase.co (레거시) |
| `drizzle.config.ts` | PostgreSQL dialect, 스키마 경로 `./src/db/schema`, 출력 `./drizzle/` |
| `vercel.json` | 함수 타임아웃, 크론 스케줄 |
| `.env.example` | 16개 환경변수 샘플 (DATABASE_URL, NEXTAUTH_*, DISCORD_*, TIKTOK_SHOP_*, AFTERSHIP_*, ANTHROPIC_API_KEY, RESEND_*, CRON_SECRET) |
| `src/middleware.ts` | `/dashboard` 는 admin, `/creator` 는 creator 이상. 미인증 시 `/auth?redirect=...` 리디렉션. 공개 경로: `/auth`, `/join`, `/api/webhooks`, `/api/sync`, `/api/auth` |

---

## 4. DB 레이어 (`src/db/`)

### 4.1 클라이언트

**`src/db/index.ts`**
- `pg.Pool` (max 3, serverless 최적화) → `drizzle()` 래핑
- 전체 스키마 re-export (creators, missions, league, …)

### 4.2 스키마 (`src/db/schema/`)

| 파일 | 테이블 | 설명 |
|------|--------|------|
| `creators.ts` | `creators` | 크리에이터 프로파일 + 게이미피케이션 상태. tier(`pink_petal`/`rose`/`diamond`/`crown`), missionCount, pinkScore, flatFeeEarned, currentStreak/longestStreak, squadLeaderId (self-FK), status, source |
| `missions.ts` | `missions`, `missionCompletions`, `dailyMissionSchedule` | 미션 템플릿, 완료 로그 (rewardEarned, mysteryMultiplier, proofVerified), 일자별 스케줄 (isMystery 포함) |
| `league.ts` | `pinkLeagueSeasons`, `pinkLeagueEntries`, `pinkLeagueDailySnapshots`, `pinkLeagueVotes` | 4주 단위 시즌, 참가자 점수, 일간 랭킹, 팬 투표 (1인 1표 unique) |
| `squad.ts` | `squadBonusLog` | 스쿼드 수익공유 (리더-멤버-기간별 GMV, bonusAmount, status) |
| `memory.ts` | `episodicMemory`, `semanticMemory`, `entities`, `entityRelationships` | 4-Layer Memory L2~L4. semanticMemory는 풀/태그/중요도/접근수 포함 |
| `content.ts` | `contentTracking` | 콘텐츠 조회/좋아요/공유/GMV 귀속, sparkAdCode, shipmentId FK |
| `collab.ts` | `collabDuos` | 2인 콜랩 (initiator/partner, productTag, contentUrl×2, seasonId, weekKey, scoreBoostPct, status) |
| `payouts.ts` | `creatorPayouts` | 월간 정산 명세 (commission + flatFee + squadBonus + leagueBonus = totalPayout) |
| `samples.ts` | `sampleShipments`, `sampleAllocationRules` | 샘플 발송 라이프사이클 + 티어별 할당 룰 |
| `tiktok.ts` | `tiktokCredentials`, `webhookEvents`, `orderTracking` | TikTok Shop OAuth, 웹훅 이벤트, 주문 귀속 |
| `outreach.ts` | `outreachPipeline`, `mcnPartners` | 크리에이터 영입 파이프라인 + MCN 파트너 |
| `discord.ts` | `discordLinks` | creator ↔ discord_user_id 매핑 (isVerified) |
| `kpi.ts` | `weeklyKpis`, `weeklyChallenges` | 주간 KPI, 챌린지 상금 |
| `auth.ts` | `users`, `accounts`, `sessions`, `verificationTokens` | @auth/drizzle-adapter 기본 테이블 |
| `applications.ts` | `joinApplications` | /join 양식 제출 대기열 |
| `sync.ts` | `cronSyncState`, `syncLog` | 크론 실행 상태 + 로그 |
| `index.ts` | — | 전체 스키마 barrel export |

### 4.3 시드

**`src/db/seeds/semantic-memory-seeds.ts`**
- agent context builder가 사용할 초기 시맨틱 지식 (Decision/Tip/Article) 프리로드

### 4.4 마이그레이션 (`drizzle/`)

| 파일 | 내용 |
|------|------|
| `0000_colorful_penance.sql` | 초기 스키마 전체 (513 라인) — 20+ 테이블, FK, 기본 인덱스 |
| `0001_hotfix.sql` | `collab_duos` 추가, `missions/mission_completions/league_entries` 컬럼 보강, **핫패스 11개 인덱스**, `mission_completions`의 **파셜 유니크 인덱스** (`DATE(completed_at AT TIME ZONE 'UTC')` 기준 일일 중복 방지) |
| `meta/*.json` | Drizzle 내부 스냅샷 + 저널 |

---

## 5. API 레이어 (`src/app/api/`)

### 5.1 인증 / 온보딩

| Route | Method | Auth | 설명 |
|-------|--------|------|------|
| `/api/auth/[...nextauth]` | ALL | Public | NextAuth 핸들러 (Discord OAuth callback) |
| `/api/join` | POST | Public | 가입 양식 제출 → joinApplications insert |
| `/api/join/approve` | POST | Admin | pending → active 전환 |
| `/api/squad/validate` | GET | Public | 스쿼드 코드 검증. **20req/min rate limit** (코드 열거 방지) |

### 5.2 미션

| Route | Method | Auth | 설명 |
|-------|--------|------|------|
| `/api/missions` | GET | Creator | 오늘의 미션 목록 (티어 필터, mystery 태깅) |
| `/api/missions/complete` | POST | Creator | 완료 제출. **트랜잭션 내** CHS 체크 + anti-exploit + 배율 cap(4.0×) + 티어 재계산 |
| `/api/missions/schedule` | POST | Cron | 일간 스케줄 생성. `isMystery` 검증 + 하루 1개 제한 |

### 5.3 리그

| Route | Method | Auth | 설명 |
|-------|--------|------|------|
| `/api/league` | GET | Creator | 현재 시즌, 본인 랭크, 다음 티어 문턱 |
| `/api/league/vote` | POST | Creator | 팬 투표. 셀프 투표 차단 + 시즌당 1표 unique |

### 5.4 스쿼드 / 정산

| Route | Method | Auth | 설명 |
|-------|--------|------|------|
| `/api/squad` | GET/POST | Creator/Cron | 본인 스쿼드 통계 / `action=calculate_bonuses` 월간 정산 / 리더보드 |
| `/api/payouts` | GET | Creator/Admin | 정산 명세 조회 |
| `/api/referrals` | GET/POST | Creator | 레거시 레퍼럴 (호환용) |

### 5.5 콘텐츠 / 샘플 / 콜랩

| Route | Method | Auth | 설명 |
|-------|--------|------|------|
| `/api/collabs` | GET/POST/PATCH | Creator | Collab Duo 매칭/검증. PATCH는 만료/소유자/URL 검증 포함 |
| `/api/samples` | GET/POST | Creator/Admin | 샘플 요청/승인 |
| `/api/samples/analytics` | GET | Admin | 샘플 ROI (contentGmv / estimatedCost) |
| `/api/shipping` | POST | Webhook | Aftership 트래킹 수신 |
| `/api/recipes` | GET | Creator | 콘텐츠 레시피 템플릿 (훅/포맷/CTA) |

### 5.6 운영 / 크리에이터 관리

| Route | Method | Auth | 설명 |
|-------|--------|------|------|
| `/api/creator` | GET/POST | Creator | 본인 프로파일 조회/수정 |
| `/api/creator/recommendations` | GET | Creator | AI 맞춤 추천 (하단 §6.9) |
| `/api/creators` | GET | Admin | 크리에이터 목록 (필터/페이지네이션) |
| `/api/outreach` | GET/POST | Admin | 영입 파이프라인 |
| `/api/kpi` | GET | Admin | 주간 KPI 지표 |
| `/api/reminders` | POST | Cron | 샘플 리마인더 엔진 트리거 |

### 5.7 외부 연동 / 웹훅

| Route | Method | Auth | 설명 |
|-------|--------|------|------|
| `/api/tiktok/auth` | GET | Public | TikTok Shop OAuth callback |
| `/api/webhooks/tiktok` | POST | Webhook | TikTok Shop 주문 이벤트 |
| `/api/webhooks/aftership` | POST | Webhook | Aftership 트래킹 이벤트 (signature 검증) |
| `/api/sync` | POST | Cron | `DataSyncOrchestrator` 실행 (프로필/콘텐츠/주문) |
| `/api/distiller` | POST | Cron | 에이전트 메모리 증류 트리거 |

---

## 6. 비즈니스 로직 (`src/lib/`)

### 6.1 인증 (`src/lib/auth/`)

| 파일 | 역할 |
|------|------|
| `config.ts` | NextAuth v5 설정. Discord Provider (identify/email/guilds), JWT 세션, DB-refreshed role (SEC-6 FIX) |
| `guards.ts` | `verifyAuth()`, `verifyAdmin()`, `getCreatorFromAuth()`, `verifyCronAuth(request)` — 라우트 보호 헬퍼 |
| `index.ts` | public API barrel |

### 6.2 리그 (`src/lib/league/`)

| 파일 | Export | 역할 |
|------|--------|------|
| `scoring.ts` | `computePinkScore()`, `takeDailySnapshot(seasonId, now)`, `autoRegisterEligible()` | Pink Score = GMV×1.0 + ViralIndex×0.5. **일괄 집계 쿼리**(H5 FIX)로 N+1 제거, `now` 주입 가능(M7) |
| `season-rewards.ts` | `applyEndOfSeasonRewards()`, `carryOverMultipliers()` | 시즌 종료 시 상위 랭커에 다음 시즌 `seasonStartMultiplier` 적용 (C2 FIX: creatorId 필터 교정) |

**Pink Score 공식**
```
Pink Score = (monthlyGmv × W_GMV) + (ViralIndex × W_VIRAL)
ViralIndex = (views×0.3 + shares×0.4 + likes×0.2 + comments×0.1) / followerCount × 1000
// W_GMV = 1.0, W_VIRAL = 0.5
```

### 6.3 헬스 / 안티-치팅 (`src/lib/health/`)

| 파일 | 역할 |
|------|------|
| `chs-engine.ts` | Creator Health Score. `CHS = sales×0.4 + content×0.3 + engagement×0.2 + diversity×0.1`. Zone: GREEN(70+)/YELLOW(40-69)/ORANGE(20-39)/RED(<20). 존별 보상 배율 + 일일 캡. 신규 14일 유예(floor 40) |
| `anti-exploit.ts` | 4가지 룰: velocity(>5/60m), proofUrl 재사용, 신생계정(<3d) 폭주, 같은 날 중복 proof |

### 6.4 스트릭 (`src/lib/streak/streak-engine.ts`)

- 마일스톤: 3d(1.2×), 7d(1.5×), 14d(1.8×), 30d(2.0× 'Legend')
- Soft reset: 1일 miss = 1티어↓, 2일 = 2티어↓, 3일+ = hard reset
- Export: `calculateStreak()`, `getCurrentMilestone()`, `getNextMilestone()`

### 6.5 미션 보상 (`src/lib/missions/`)

**`mystery.ts`**
- `rollMysteryMultiplier(rng = Math.random)` — 가중 랜덤 (1×50% / 2×25% / 3×15% / 4×8% / 5×2%). PRNG DI(M6 FIX)
- `isJackpot(m)` — 4× 이상 여부

### 6.6 콜랩 (`src/lib/collab/collab-engine.ts`)
- Duo 매칭, 상호 URL 검증, 시즌/주차별 스코어 부스트(15% + 20% + 5%) 계산

### 6.7 티어 (`src/lib/tier/auto-update.ts`)
- `calculateTier(current, input)` → 새 tier, commissionRate, squadBonusRate 반환
- 승급 기준: missionCount ≥200 OR monthlyGmv ≥2500 → Diamond; ≥50 OR ≥500 → Rose
- **Auto-downgrade 없음** (BUG-2 FIX) — 강등은 관리자 수동만. Pink Crown은 리그 우승/매뉴얼

### 6.8 스쿼드 / 레퍼럴 (`src/lib/referral/`)

| 파일 | 역할 |
|------|------|
| `referral-engine.ts` | `SquadEngine` 클래스. `getSquadStats(leaderId)`, `calculateSquadBonuses(period)` (월간), `getSquadLeaderboard(limit)` |
| `index.ts` | public API |

### 6.9 AI 추천 (`src/lib/ai/recommendation-engine.ts`)
- `RecommendationEngine.generateRecommendations(creatorId)` — 콘텐츠 지표 계산 + 티어 퍼센타일 비교 + 카테고리별 제안 (hook/format/posting_schedule/cta/timing/mission)

### 6.10 리마인더 (`src/lib/reminders/`)
- `reminder-engine.ts` — 샘플 발송 후 D+5/D+10/D+14 자동 에스컬레이션
- `INotificationSender` 인터페이스 (Discord DM, Resend 이메일 구현체)

### 6.11 Discord 봇 (`src/lib/discord/`)

| 파일 | 역할 |
|------|------|
| `bot.ts` | discord.js v14 진입점. 슬래시 명령 등록 + interactionCreate / messageCreate 라우팅 |
| `notify.ts` | 채널 알림 (`#announcements`, `#daily-mission`, `#pink-league`, `#squad-activity`) Embed 전송 |
| `commands/mission.ts` | `/mission` — 오늘 미션 |
| `commands/complete.ts` | `/complete` — 미션 제출 |
| `commands/me.ts` | `/me` — 내 티어/점수/스트릭 |
| `commands/ranking.ts` | `/ranking` — 리그 TOP 10 |
| `commands/squad.ts` | `/squad` — 팀 통계 |
| `commands/link.ts` | `/link` — TikTok 핸들 연동 |

### 6.12 외부 어댑터 (`src/lib/adapters/`)

| 파일 | 역할 |
|------|------|
| `sync-orchestrator.ts` | `DataSyncOrchestrator` — 프로필/콘텐츠/주문 크론 통합 |
| `tiktok-shop.adapter.ts` | `ITikTokShopAdapter` + 구현체 (fetchOrders, refreshTokens) |
| `tiktok-crawler.adapter.ts` | 프로필/콘텐츠 크롤링 (Apify or self-hosted, CRAWLER_TYPE env 분기) |
| `competitor-discovery.adapter.ts` | 경쟁 브랜드 발견/분석 |

### 6.13 API 유틸 (`src/lib/api/`)

| 파일 | 역할 |
|------|------|
| `rate-limit.ts` | 단일 인스턴스 인메모리 레이트리미터. `checkRateLimit(key, {limit, windowMs})`, `clientKey(req, route)`. 1000히트마다 스윕 |
| `auth.ts` | 레거시 헬퍼 (guards로 이관 중) |
| `errors.ts` | `parseJsonBody<T>()` — 안전 JSON 파싱 + 에러 응답 빌더 |

### 6.14 기타

| 파일 | 역할 |
|------|------|
| `lib/tiktok/client.ts` | TikTok Shop API 호출 |
| `lib/tiktok/auth.ts` | OAuth 코드 교환 헬퍼 |
| `lib/validate-env.ts` | 앱 기동 시 필수 env 존재 검증 |
| `lib/utils.ts` | cn(), 날짜/문자열 포맷터 |
| `lib/supabase.ts` | 레거시 Supabase 어댑터 (비활성, 삭제 예정) |

---

## 7. 에이전트 레이어 (`src/agent/`)

effy v4.0 패턴을 차용한 Discord 대화 에이전트 + 4-Layer Memory.

```
Discord 메시지
  → gateway.ts (rate limit → episodic 저장)
  → context.ts (L2+L3+L4 병렬 검색)
  → Claude API (system prompt + history)
  → Discord 응답
  → episodic 응답 저장
```

| 파일 | 역할 |
|------|------|
| `gateway.ts` | 메시지 처리 파이프라인. 분당 10회 rate limit, Claude Sonnet 4 호출(1024 tokens) |
| `context.ts` | 3-route 병렬 컨텍스트 빌더 (semantic/episodic/entity) 병합 |
| `distiller.ts` | Nightly: 에피소딕 → 시맨틱 지식 승격 (Decision/Fact/Tip) |
| `memory/working.ts` | L1 — 세션 내 임시 버퍼 (in-process Map) |
| `memory/episodic.ts` | L2 — `saveEpisodic()`, `getConversationHistory()` |
| `memory/semantic.ts` | L3 — `searchSemantic(query, poolIds, topK)` (태그/중요도 랭킹) |
| `memory/entity.ts` | L4 — 엔티티 조회, 관계 조회/기록 |
| `memory/creator-sync.ts` | 크리에이터 이벤트 → Entity 동기화 (new content, mission 완료 등) |

---

## 8. 프론트엔드 (`src/app/`)

### 8.1 크리에이터 포털 (`src/app/creator/`)

| 경로 | 설명 |
|------|------|
| `layout.tsx` | 사이드바 네비 + 온보딩 체크리스트 + 스트릭 위젯 |
| `page.tsx` | 대시보드 홈 — 프로파일, 미션 진행, 리그 랭크, 수익 요약 |
| `missions/page.tsx` | 오늘의 미션 카드, 완료 제출, 히스토리. **per-mission proofUrl state**(H4), Mystery UI 브랜치(M3), `role="dialog"` + Escape 핸들러(M4) |
| `league/page.tsx` | 시즌 리더보드, 본인 랭크, (파이널 시) 투표 UI |
| `squad/page.tsx` | 스쿼드 멤버/팀 GMV/보너스 분배 |
| `collab/page.tsx` | 콜랩 요청, 매칭, Duo 부스트 |
| `content/page.tsx` | 콘텐츠 분석 (views/GMV 귀속) |
| `earnings/page.tsx` | 수익 명세 (커미션 + 플랫피 + 스쿼드 + 리그) |
| `samples/page.tsx` | 샘플 요청/배송 추적/콘텐츠 데드라인 |
| `community/page.tsx` | 크리에이터 디렉토리 |
| `improve/page.tsx` | AI 추천 |
| `referrals/page.tsx` | 레거시 레퍼럴 UI (squad로 리다이렉트) |
| `recipes/page.tsx` | 콘텐츠 레시피 템플릿 |
| `error.tsx` | 에러 바운더리 |

### 8.2 어드민 대시보드 (`src/app/dashboard/`)

| 경로 | 설명 |
|------|------|
| `layout.tsx` | 어드민 네비, role gate |
| `page.tsx` | 오버뷰 KPI (affiliate count, GMV, 티어 분포) |
| `creators/page.tsx` | 크리에이터 목록, 필터, 벌크 액션 |
| `league/page.tsx` | 시즌 관리, 스냅샷, 투표 결과 |
| `missions/page.tsx` | 미션 템플릿 CRUD, 일간 스케줄 에디터 |
| `squad/page.tsx` | 스쿼드 리더보드, 보너스 산출 트리거 |
| `samples/page.tsx` | 발송 큐, 할당 룰, 비용 추적 |
| `outreach/page.tsx` | 영입 퍼널, DM 응답률, MCN 파트너 |
| `shipping/page.tsx` | Aftership 연동 상태 |
| `kpi/page.tsx` | 주간 지표, 추세 차트 |
| `referrals/page.tsx` | 레거시 레퍼럴 추적 |

### 8.3 인증 / 공개

| 경로 | 설명 |
|------|------|
| `auth/page.tsx` | Discord 로그인 |
| `join/page.tsx` | 가입 양식 (tiktokHandle, email, instagramHandle, squadCode) |
| `page.tsx` | 랜딩 |
| `layout.tsx` | 루트 (폰트, globals.css, SessionProvider) |

---

## 9. 공유 컴포넌트 (`src/components/`)

| 파일 | 역할 |
|------|------|
| `ui/badge.tsx`, `button.tsx`, `card.tsx`, `input.tsx`, `modal.tsx`, `progress.tsx`, `table.tsx` | shadcn 스타일 Radix 기반 프리미티브 |
| `league-widget.tsx` | 현재 시즌 + 본인 랭크 + 다음 마일스톤 |
| `streak-widget.tsx` | 스트릭 일수 + 마일스톤 배지 + 리셋 타이머 |
| `onboarding-checklist.tsx` | 5단계 온보딩 (프로파일 / AI 프로파일 / 첫 미션 / 10개 / 30일 스트릭) |

---

## 10. 타입 (`src/types/database.ts`)

- Drizzle 테이블에서 `$inferSelect` / `$inferInsert` 로 파생한 도메인 타입
- Custom types: `TierName`, `HealthZone`, `RecommendationCategory`, `MissionType` 등

---

## 11. 핵심 아키텍처 패턴

### 11.1 보상 계산 파이프라인 (missions/complete)

```
base reward (mission.rewardAmount / scoreAmount)
  × streakMultiplier      (streak-engine)
  × CHS rewardMultiplier  (chs-engine, zone-based)
  × mysteryMultiplier     (mystery.ts)
  → clamp to MAX_REWARD_MULTIPLIER (4.0×)
  → insert completion + update creator metrics (single TX)
  → calculateTier() → optional tier upgrade
```

TOCTOU 방지를 위해 일일 캡 체크는 **트랜잭션 내부**에서 `tx` executor 재사용 (H1 FIX).

### 11.2 리그 일간 스냅샷 (크론)

```
entries (창사 GMV + 팔로워) — 1 쿼리
content 집계 (GROUP BY creator)  — 1 쿼리  (H5 FIX)
collab boost (initiator + partner) — 2 쿼리 (H5 FIX)
→ computePinkScore × N (순수 함수)
→ sort by totalPinkScore
→ UPDATE entries + INSERT snapshots + UPDATE creators.pinkScore
```

### 11.3 4-Layer Memory (에이전트)

| Layer | 저장소 | TTL / 승격 |
|-------|--------|-----------|
| L1 Working | Process Map | 30분 |
| L2 Episodic | `episodic_memory` | 무제한 (90일+ 아카이브) |
| L3 Semantic | `semantic_memory` | 야간 distiller로 승격 |
| L4 Entity | `entities` + `entity_relationships` | 이벤트 기반 갱신 |

### 11.4 인증 / 인가

```
NextAuth (Discord OAuth)
  → JWT session (role refreshed from DB on every request — SEC-6)
  → middleware.ts (경로 prefix 기반 gate)
  → guards.ts (라우트 핸들러 수준 세부 체크)
```

### 11.5 Anti-Fraud

```
missions/complete
  → CHS zone 체크 (ORANGE: 2/day 캡, RED: 0 보상)
  → anti-exploit 룰:
    - velocity >5/60m
    - proofUrl 재사용
    - 계정<3일 + >10 완료
    - 같은 날 중복 proof
```

---

## 12. 환경변수 (`.env.example`)

```bash
# DB
DATABASE_URL=postgresql://user:pass@host:5432/db

# NextAuth
NEXTAUTH_SECRET=<generated>
NEXTAUTH_URL=https://<domain>

# Discord OAuth + Bot
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=
DISCORD_GUILD_ID=

# Claude (agent + distiller + AI recommendations)
ANTHROPIC_API_KEY=

# TikTok Shop
TIKTOK_SHOP_APP_KEY=
TIKTOK_SHOP_APP_SECRET=
TIKTOK_WEBHOOK_SECRET=

# Crawler (Apify or self-hosted)
CRAWLER_TYPE=apify
APIFY_TOKEN=

# Aftership
AFTERSHIP_API_KEY=
AFTERSHIP_WEBHOOK_SECRET=

# Email
RESEND_API_KEY=

# Cron
CRON_SECRET=<shared-secret>
```

---

## 13. 마이그레이션 / 배포

### 13.1 신규 DB 생성
```bash
createdb banilaco_squad
DATABASE_URL=... npm run db:migrate   # drizzle/*.sql 순차 적용
npm run db:seed                        # 시맨틱 메모리 시드
```

### 13.2 스키마 변경 워크플로우
```bash
# 1. src/db/schema/*.ts 수정
# 2. SQL 생성
npm run db:generate -- --name=<label>
# 3. drizzle/<N>_<label>.sql 리뷰 (파셜 인덱스 등 수동 편집 여지)
# 4. DB 반영
npm run db:migrate
```

### 13.3 크론 스케줄 (vercel.json)

| Job | 스케줄 | 엔드포인트 |
|-----|--------|-----------|
| 프로필/콘텐츠/주문 동기화 | 매시간 | `POST /api/sync` |
| 리그 일간 스냅샷 | 매일 00:10 | `POST /api/sync?action=league` |
| 샘플 리마인더 | 매일 09:00 | `POST /api/reminders` |
| 야간 지식 증류 | 매일 02:00 | `POST /api/distiller` |
| 스쿼드 월간 보너스 | 매월 1일 | `POST /api/squad` `{action:'calculate_bonuses'}` |

모두 `Authorization: Bearer $CRON_SECRET` 필수.

---

## 14. 참고

- **리뷰 이력**: 최근 23개 Critical/High/Medium 이슈 일괄 픽스 (커밋 `b56ba1f`) — C1~C4, H1~H7, M1~M7
- **테스트**: 통합 테스트 실데이터 원칙 (mock 최소화). 현재 Vitest 설정은 미포함 (TODO)
- **로드맵**: Pink Crown 수동 승급 플로우, 리그 투표 Webhook, 스쿼드 계층 구조(2단 리더), agentic 자동 응답 학습
