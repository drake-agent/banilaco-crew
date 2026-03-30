# Banilaco Crew - Phase 1 Code Review Summary

**Date:** 2026-03-30
**Reviewed by:** Bug Hunter + Security Auditor
**Project:** Next.js 14 + Supabase + TypeScript
**Scope:** 13 files across API routes, adapters, middleware, and database schema

---

## Overview

This is the first comprehensive review targeting **new issues that previous iterations missed**. The codebase has security and data integrity issues at critical and high severity levels that require immediate attention.

**Total Findings:** 18 (2 critical, 4 high, 10 medium, 2 low)

---

## Critical Issues

### 1. SEC-1: /api/kpi PUT - No Authentication + Data Exposure
- **Location:** `src/app/api/kpi/route.ts:45-97`
- **Issue:** Endpoint has zero auth checks and exposes aggregated creator data (total GMV, tier breakdown, source distribution)
- **Impact:** Anyone can call PUT /api/kpi and learn business metrics, recruitment strategy, and confirm 30K creator target
- **Fix Time:** 1 hour
- **Severity:** CRITICAL

### 2. SEC-3: RLS Policies Use 'USING (true)' - Authorization Bypass
- **Location:** `supabase/schema.sql:363-382` + `supabase/schema-v3.sql:50,58`
- **Issue:** All RLS policies grant `authenticated USING (true)` — any logged-in user can read/write ALL data
- **Impact:** Privilege escalation — junior team member can modify creator tiers, commission rates, referral tracking
- **Fix Time:** 3 hours
- **Severity:** CRITICAL

---

## High Severity Issues

### 3. BUG-1: /api/shipping POST - Missing Field Validation
- **Location:** `src/app/api/shipping/route.ts:108-136`
- **Issue:** `update_status` action accepts arbitrary fields without whitelisting; no status enum validation
- **Impact:** Database corruption — invalid status values, unintended fields updated
- **Fix Time:** 1 hour

### 4. SEC-2: /api/join POST - No Rate Limiting
- **Location:** `src/app/api/join/route.ts:16-64`
- **Issue:** Public endpoint with zero rate limiting, CAPTCHA, or spam detection
- **Impact:** Database pollution, spam applications, potential DOS
- **Fix Time:** 2 hours

### 5. SEC-4: createServerClient() Uses service_role Key
- **Location:** `src/lib/supabase.ts:10-16`
- **Issue:** Bypasses ALL RLS policies in every API route. Combined with missing auth checks, this is complete bypass.
- **Impact:** Data breach — unauthenticated attacker + service_role = full database access
- **Mitigation:** Add application-level auth to every endpoint. Don't rely on RLS.

---

## Medium Severity Issues

| ID | Title | Location | Fix Time |
|---|---|---|---|
| BUG-2 | /api/kpi PUT null dereference on latestKpi | route.ts:53,81-91 | 1 hour |
| BUG-3 | Loose 'any' types in filter operations | route.ts:56-76 | 1 hour |
| BUG-4 | weeks_to_30k calculation NaN/Infinity | route.ts:23-29 | 1 hour |
| SEC-5 | TikTok HMAC signing scheme incorrect | tiktok-shop.adapter.ts:85-109 | 1 hour |
| BUG-5 | Apify token exposed in URL params | tiktok-crawler.adapter.ts:81,89 | 30 min |
| BUG-6 | Competitor discovery skips engagement calculation | competitor-discovery.adapter.ts:132-144 | 30 min |
| BUG-7 | DHL tracking regex too permissive | shipping-tracker.adapter.ts:182 | 30 min |
| SEC-6 | Email API key leaked in error logs | notification-sender.ts:72-75 | 30 min |
| BUG-8 | auto_update_tier fires unnecessarily | schema.sql:325-346 | 1 hour |
| SEC-7 | /api/creator/recommendations lacks audit logging | route.ts:109-169 | 30 min |

---

## Low Severity Issues

- **BUG-9:** RecommendationEngine import may fail (type error, not a security issue)
- **SEC-8:** /api/sync routes skip auth but claim to have token validation (needs verification)

---

## Key Findings by Category

### Authorization Issues (3 total)
- Missing auth on /api/kpi PUT (CRITICAL)
- RLS policies too permissive (CRITICAL)
- /api/creator/recommendations lacks audit logging (MEDIUM)

### Data Integrity Issues (1 total)
- /api/shipping update_status missing field validation (HIGH)

### Rate Limiting (1 total)
- /api/join POST public endpoint unprotected (HIGH)

### Data Exposure (2 total)
- Competitor discovery exposes already_in_db flag (MEDIUM)
- /api/kpi PUT exposes aggregated creator data (CRITICAL)

### Type Safety (2 total)
- Loose 'any' casts in filters (MEDIUM)
- RecommendationEngine import issue (LOW)

### Arithmetic/Logic Errors (2 total)
- weeks_to_30k NaN/Infinity (MEDIUM)
- auto_update_tier unnecessary firing (MEDIUM)

### Credential Exposure (3 total)
- Apify token in URL (MEDIUM)
- Email API key in logs (MEDIUM)
- TikTok HMAC signing needs verification (MEDIUM)

---

## Immediate Action Items

### Priority 1 (This Week)
1. Add auth check to /api/kpi PUT endpoint
2. Replace RLS 'USING (true)' with role-based policies
3. Add field validation to /api/shipping update_status
4. Add rate limiting to /api/join POST

### Priority 2 (Next Week)
1. Fix /api/kpi null handling for latestKpi
2. Fix weeks_to_30k arithmetic (zero division)
3. Move Apify token to Authorization header
4. Sanitize error logs
5. Verify TikTok Shop HMAC signing logic

### Priority 3 (Engineering Debt)
1. Add audit logging to sensitive operations
2. Replace 'any' type casts with proper types
3. Fix DHL tracking format detection
4. Add guards to auto_update_tier trigger
5. Verify /api/sync token validation

---

## Prevention Measures for Future Reviews

1. **Enforce auth validation:** Every API route must have explicit auth/authz check at start
2. **Input validation:** Use zod/validation schemas for all POST/PATCH/PUT operations
3. **RLS testing:** Don't use 'USING (true)' — always specify conditions
4. **Type safety:** Avoid 'any' casts; use proper TypeScript interfaces
5. **Secrets management:** Never pass secrets in URLs; use headers
6. **Error handling:** Sanitize logs; don't expose sensitive data in error messages
7. **Rate limiting:** Add to all public endpoints by default
8. **Audit logging:** Log sensitive operations for compliance

---

## Output File

Full detailed findings with code snippets and fixes:
📄 `reviews/phase1-bug-security.json`

---

## Verdict

**The codebase is NOT production-ready.** Critical security gaps must be fixed before deploying to 30K creators. The combination of missing auth (SEC-1) + permissive RLS (SEC-3) + service_role bypass (SEC-4) creates a complete data breach vector.

**Recommendation:** Fix Priority 1 items before any production deployment. Implement a code review checklist to prevent similar issues in future iterations.
