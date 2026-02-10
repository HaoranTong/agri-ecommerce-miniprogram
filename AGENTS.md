# AGENTS.md

This file provides project-specific instructions and context for coding agents working on this repository.

## Project Overview
- Project: Agri E-commerce Mini Program (Taro 4 + React 18 + TypeScript)
- Repo path: e:\projects\agri-ecommerce-miniprogram
- Branch: dev
- Frontend and backend are separate repos. Each repo should have its own AGENTS.md.
  Shared rules should match; repo-specific details should differ.

## Goals (High Priority)
1) Keep the mini program fully functional (not just compiling).
2) Align implementation with docs in `docs/` (API contracts, data model, user/admin guides).
3) Maintain clear separation between:
   - Referral (distribution): social sharing, binding referrer relationships, rewards via points.
   - Agent: region-based, manual approval, separate flows and permissions.
4) New requirement: referral rewards in points + points-to-commission withdrawal (requires backend support).

## Repos & Dependencies
- Frontend: this repo.
- Backend: `e:\laragon\www\agri-ecommerce\wp-content\plugins\myshop-core`
- Backend is required for referral/points/promo/gift-card functionality. If backend changes are needed, coordinate and update docs.

## Environments & Branch Rules (Hard Rules)
- Environments:
  - Local dev: Laragon + Taro via Cloudflare tunnel `dev.fanbaoer.com` -> `127.0.0.1:80`.
  - Staging (trial): `staging.fanbaoer.com`.
  - Production: `fanbaoer.com`.
- Branch flow:
  - Work only on `dev`.
  - `trial` only receives merges from `dev`.
  - `master` only receives merges from `trial`.
  - No direct edits on `trial` or `master`.

## Key Docs (Must Stay In Sync)
- `docs/00_需求理解对齐文档_v2.1_最终版.md`
- `docs/05_DATA_MODEL_v2.1.md`
- `docs/06_DATA_DICTIONARY_v1.2.md`
- `docs/08_API_CONTRACT_V2.3.md`
- `docs/09_PLUGIN_SPEC_v1.1.md`
- `docs/10_MINIPROGRAM_SPEC_v2.0.md`
- `docs/11_WORDPRESS_ADMIN_GUIDE.md`
- `docs/20_USER_GUIDE.md`
- `docs/21_ADMIN_USER_GUIDE.md`

## Workflow Expectations
- Any new/changed feature must include tests. All tests must be green.
- For frontend: run `npm test --silent`.
- For backend (plugin): run `php tests\run_rest_tests.php`.
- Update user/admin guides when behavior changes.
- Do not create new docs; update existing ones.

## Deployment & Remote Push (Scripts)
- Two remotes: Gitee (primary) and GitHub (backup). Push to both.
- Use scripts in `scripts/`:
  - `scripts\push-all.bat <branch>`: pushes to Gitee + GitHub.
  - `scripts\deploy-trial.bat`: merges dev -> trial, pushes both remotes.
  - `scripts\deploy-prod.bat`: merges trial -> master, pushes both remotes.
  - `scripts\check-branch-protection.bat`: blocks edits on trial/master.

## Commit / Merge / Push Rules (Must Follow)
- Always work on `dev` and commit there.
- Before merging: ensure tests are green and docs are aligned.
- Frontend deploy flow:
  1) `scripts\push-all.bat dev`
  2) `scripts\deploy-trial.bat` (merge dev -> trial + push both remotes)
- Never merge into `master` unless explicitly instructed.

## Performance Notes
- Cloudflare tunnel can be slow in trial; do not over-optimize until functionality is complete.

## Feature-Specific Notes
### Referral & Sharing
- QR share: opens login page; binds referral on WeChat login.
- Poster share: opens configured landing page (default home), bind on login if required.
- A user can have only one direct referrer; no reverse binding.
- If no order for 1 year, referral binding can be reset (backend rule).

### Gift Card
- Manage page should show usable cards by default; history shows last 365 days.
- Status rules:
  - Unused, unshared: “待兑换” (blue)
  - Shared, not claimed: “已分享/待领取” (blue)
  - Shared, claimed: “已分享” (gray)
  - Redeemed: “已兑换” (gray)

## Release / Milestone
- Tag format: `YYYY-MM-DD-referral-promo-giftcard`
- Before tagging: ensure docs and tests are aligned and green.

## Safety / Constraints
- Avoid destructive git commands unless explicitly requested.
- Preserve user’s untracked files unless instructed.
