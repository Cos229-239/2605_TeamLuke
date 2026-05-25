# ParentVault Security & Privacy

ParentVault is intended to hold child SSNs, medical details, custody schedules/decrees, screenshots of texts, photos, emergency contacts, journal notes, and AI-extracted facts. Treat every profile, import, attachment, notification, and log line as highly sensitive.

## Current scaffold status

This repo is an MVP scaffold. It currently has in-memory demo state and AI/import stubs; it does **not** yet implement production auth, encrypted persistence, backend authorization, consent records, audit logging, secure media storage, deletion/export, or self-host pairing. Do not use real family data until the blockers below are resolved.

## Production launch blockers

- **Encryption and keys:** no sensitive child data may be persisted in plaintext. Encrypt before persistence, sync, backup, queues, logs, analytics, crash reports, exports, or AI/OCR processing. This includes full SSNs, medical details, custody notes, journals, import text, attachment metadata, insurance IDs, Rx details, and chat content. Prefer client-side or per-user envelope encryption. Store/display only SSN last 4 unless full SSN is strictly required. See `docs/ENCRYPTION.md`.
- **Authentication, 2FA, and vault unlock:** require strong cloud auth, mandatory second factor, local biometric/PIN/device-passcode unlock, session timeout, device revocation, and safe account recovery. See `docs/AUTH_2FA.md`.
- **AI/OCR consent:** never send SSNs, medical data, custody documents, child images, OCR text, or screenshots to an AI/OCR provider without explicit per-import consent. Redact SSNs by default. AI output must stay a draft until parent approval.
- **Media/document storage:** originals must be private and encrypted, with short-lived signed URLs only. No public buckets, predictable paths, CDN indexing, or permanent cache copies without user choice.
- **Logs/analytics/crash reports:** ban plaintext SSNs, child names paired with medical/custody context, OCR output, chat text, attachment URIs, and document contents from logs. Add redaction utilities and tests before enabling telemetry.
- **Audit without leakage:** audit creates, edits, imports, exports, deletes, med confirmations, journal entry creation/update, attachment import/capture, and document views, but store metadata only — not sensitive content copies. Journal exports should include audit metadata and attachment hashes without leaking plaintext to logs.
- **Cloud vs self-host:** cloud mode needs documented data residency, backup retention, admin access, breach response, and deletion SLAs. Self-host mode needs QR pairing with server public key, one-time token, TLS trust/pinning, key rotation, and opt-in relay rules. Never silently sync cloud copies in self-host-only mode.
- **Notifications:** custody and medication reminders can leak on lock screens. Default notification bodies should be generic unless the parent opts into detailed previews.
- **Access/sharing:** custody scenarios may be adversarial. Define co-parent access, exports, sharing, revocation, and support/admin visibility before launch.
- **Legal/privacy review:** get dedicated review for child privacy, state privacy laws, custody records, health-data claims, subpoenas, retention, and COPPA-adjacent risk. Do not claim HIPAA compliance unless the full product/operations/contracts support it.

## AI import policy

- Require parent consent before each upload/process step.
- Record source type, provider/model, consent, confidence, reviewer, and retention/deletion choice.
- Separate source documents from extracted structured data.
- Delete source files, thumbnails, OCR text, derived metadata, temporary cache files, and queued jobs when requested.
- Never let AI provide legal or medical advice; it may organize facts and reminders only.

## Implementation requirements before real data

- Central `EncryptedValue`/`SensitivePlaintext`/redaction pattern for SSN, medical notes, insurance/Rx identifiers, custody text, OCR text, chat text, and attachment URIs.
- Encrypted local cache/offline queue with wipe-on-logout and failed-job cleanup.
- Private media storage with malware/type validation, size limits, content-type enforcement, and metadata scrubbing where safe.
- Secrets kept out of the repo and mobile bundle; backend secrets must use managed secret storage.
- Parent-visible export and delete flows, including journal exports with attachments, metadata, hashes, and encrypted originals.
- Security tests for redaction, permission checks, 2FA/step-up auth, recovery-code handling, AI consent enforcement, notification privacy, and attachment access control.
- Threat model covering malicious co-parent, lost phone, compromised cloud admin, leaked signed URL, AI vendor retention, self-host pairing hijack, and support/debug access.

## Current code notes

- `apps/mobile/src/store/vaultStore.ts` is in-memory demo state, not secure storage.
- `apps/mobile/src/services/aiImport.ts` returns fake suggestions; real AI/OCR must sit behind consent, redaction, retention, and review controls.
- `apps/mobile/src/screens/ImportScreen.tsx` copies picked documents to cache; production must clean cache files and avoid retaining originals without explicit choice.
- `apps/mobile/src/screens/JournalScreen.tsx` stores attachment URIs in app state; production must encrypt metadata and protect media access.
- `apps/mobile/src/services/notifications.ts` includes schedule titles in notification content; use generic bodies by default for medication/custody events.

## Safe defaults

Collect the minimum data, let parents use schedule reminders without optional profile data, encrypt everything sensitive before storage, hide SSNs and medical details by default, redact before processing/logging/support/analytics/AI calls, require parent review before AI-derived changes, and prefer local/self-host processing for custody documents and child images when possible. Every optional category must be skippable.
