# PHASE 2: SECURITY HARDENING
- **Secrets**: Scan for hardcoded keys. Move detected secrets to .env.
- **Auth**: Verify protected routes return 401 when unauthorized.
- **Input**: Sanitize all inputs to prevent XSS/SQLi.
