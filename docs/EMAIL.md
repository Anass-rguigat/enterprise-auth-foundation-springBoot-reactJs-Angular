# Email

Transactional mail is sent via an **encrypted outbox**, not direct SMTP from business services.

Full design: [EMAIL_OUTBOX.md](EMAIL_OUTBOX.md).

## Quick facts

- Rows written in the same DB transaction as the triggering action (invite, reset, verify, …).
- Payload encrypted with **AES-GCM**; AAD binds `outboxId|templateCode|recipientNormalized`.
- Background worker decrypts, sends, clears ciphertext on success; retries with backoff.
- Local Compose uses **Mailpit** (UI `:8025`, SMTP `:1025`).
- Configure `EMAIL_OUTBOX_KEK` (Base64 32-byte key) for durable encryption across restarts.
