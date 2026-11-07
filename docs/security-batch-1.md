# Cash Dashboard security boundary

This application manages collectors, cash collections, cash clients, history/reconciliation and existing cash financial workflows. It is separate from ENAKO OS, despite sharing a backend/database. Its collector administration and collection ledger are not ENAKO OS functional modules.

Local source status: Batch 1 implemented; NOT deployed or ready for production cutover. The backend report is `backend/docs/security-remediation/batch-1.md` in the shared workspace. That report, its change register and migration guide are required companion review material.

## Login and permissions

- All identities authenticate through `/api/v1/cash-auth/login`; the server checks password hash, active status and an explicit account grant.
- Email, complete terminal ID and exact normalized phone are supported; PIN bypasses and browser account/password comparison are removed.
- The server grants operator or administrator access. An OS CEO/Manager title, email or frontend selection does not grant cash permissions.
- Operators access their own records and the explicitly shared cash-client directory. Administrators can manage cash accounts and shared records. Creating a collector does not automatically approve a grant.
- Cash credentials live in sessionStorage under a separate key; server-side revocation/status/password/grant checks occur on requests. A server session expires after at most 15 minutes; the existing UI inactivity signout remains two minutes.
- Dedicated cash-managed accounts are excluded from OS authentication. Existing legitimate dual-purpose accounts are classified during the approved migration, not silently converted.
- Existing financial/KYC APIs still have independent OS authorization. A cash grant does not grant those OS permissions. Compatible administrators may acquire a separate OS session; cash tokens are never sent to those endpoints.

## Changed operations

- Collector registration waits for server success, hashes the password and returns a credential-free profile. It requires approved provisioning before the new account can sign in.
- Collector removal now means confirmed dedicated-account deactivation. History is retained; bulk history deletion is disabled.
- Assignments use database account IDs. Server ownership, not display metadata, controls access.
- Cash status changes are pending-only and audited. A repeated final-state update fails rather than silently applying another effect.
- Cash writes wait for the server response before claiming success. This does not certify the separate financial mirroring workflow as atomic.
- Receipt dispatch uses a protected server workflow; it cannot fall back to generic unauthenticated email or treat a failed dispatch as success.
- Legacy shared ledger/draft caches are left for an approved migration/export; they are not trusted as the new session's ledger. Credential/profile caches are removed when the new frontend runs.

## Local verification

From `cash/`:

```powershell
node --test test-cash-auth.cjs test-collection-sync.cjs test-fx-collectors.cjs test-idle-session.cjs
.\node_modules\.bin\tsc.cmd --noEmit --incremental false --pretty false
```

Result: 34 tests passed and the type check passed. Fetch/storage are mocked; these tests never contact the configured API. Run the backend cash security and staff-redaction suites separately. Real PostgreSQL persistence, browser workflows and provider delivery still require isolated staging verification.

## Hold points

Do not push or deploy from this branch without explicit approval. Legacy credentials are not automatically accepted/migrated, so an approved reset/grant/classification plan is mandatory. Private receipt uploads, full financial atomicity/reconciliation, distributed throttling, remaining shared-backend vulnerabilities and Zero Trust enforcement are not completed by this batch.
