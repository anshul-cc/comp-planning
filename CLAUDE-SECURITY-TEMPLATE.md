# Security-First Development Constitution

> Copy this to your project's `CLAUDE.md` to enforce security best practices in all Claude-assisted development.

---

## 1. Secrets Management (Zero-Leak Architecture)

### Rules
- **NEVER** hardcode secrets, API keys, passwords, or tokens in code
- **ALWAYS** use environment variables via `process.env`
- **ALWAYS** validate critical environment variables at startup (fail fast)
- **NEVER** commit `.env` files to version control

### Required Files
```
.env          # Local secrets (NEVER commit)
.env.example  # Template with placeholder values (safe to commit)
.gitignore    # Must include: .env, .env.local, .env.*.local, *.db
```

### Startup Validation Pattern
```javascript
require('dotenv').config();

const REQUIRED_VARS = ['SESSION_SECRET', 'DATABASE_URL'];
for (const varName of REQUIRED_VARS) {
    if (!process.env[varName]) {
        console.error(`CRITICAL: ${varName} is missing from environment!`);
        process.exit(1);
    }
}
```

### Environment Variable Categories
| Category | Variables | Required |
|----------|-----------|----------|
| Session | `SESSION_SECRET` | Yes |
| Database | `DATABASE_URL`, `DATABASE_AUTH_TOKEN` | Yes |
| Admin | `ADMIN_USER`, `ADMIN_PASS` | Yes |
| Email | `EMAIL_USER`, `EMAIL_PASS` | Optional |
| SMS | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_PHONE`, `TWILIO_TO_PHONE` | Optional |
| GitHub | `GITHUB_TOKEN`, `REPO_OWNER`, `REPO_NAME` | Optional |

---

## 2. Authentication & Authorization

### Rules
- **ALWAYS** hash passwords with bcrypt (minimum 12 rounds)
- **ALWAYS** implement rate limiting on login endpoints
- **ALWAYS** implement account lockout after failed attempts (3-5 max)
- **NEVER** expose raw user emails in public responses (use masking)
- **ALWAYS** use secure session configuration

### Password Hashing Pattern
```javascript
const bcrypt = require('bcrypt');
const BCRYPT_ROUNDS = 12;

// Hash
const hashedPassword = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS);

// Verify
const isValid = await bcrypt.compare(plainPassword, hashedPassword);
```

### Rate Limiting Pattern
```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: 'Too many login attempts. Please try again later.'
});

app.use('/api/auth/login', loginLimiter);
```

### Account Lockout Pattern
```javascript
const MAX_ATTEMPTS = 3;
const LOCKOUT_MINUTES = 5;

if (failedAttempts >= MAX_ATTEMPTS) {
    await dbRun(
        "UPDATE users SET locked_until = datetime('now', '+? minutes') WHERE id = ?",
        [LOCKOUT_MINUTES, userId]
    );
    // Trigger security alerts
    handleLockout(userEmail);
}
```

### Email Masking Pattern
```javascript
function maskEmail(email) {
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) return `***@${domain}`;
    return `${localPart[0]}****${localPart[localPart.length - 1]}@${domain}`;
}
// anshul@example.com -> a****l@example.com
```

---

## 3. Database Security

### Rules
- **ALWAYS** use parameterized queries (prevent SQL injection)
- **NEVER** concatenate user input into SQL strings
- **ALWAYS** use a database abstraction layer
- **NEVER** commit database files to version control

### Parameterized Query Pattern
```javascript
// CORRECT
const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);

// WRONG - SQL Injection vulnerable!
const user = await dbGet(`SELECT * FROM users WHERE email = '${email}'`);
```

### Database Abstraction Pattern
```javascript
// lib/db.js - Unified connection supporting local SQLite and cloud (Turso)
const isTurso = process.env.DATABASE_URL?.startsWith('libsql://');

async function dbGet(sql, params = []) {
    if (isTurso) {
        const result = await tursoClient.execute({ sql, args: params });
        return result.rows[0];
    } else {
        return sqliteDb.prepare(sql).get(...params);
    }
}
```

---

## 4. Security Headers

### Rules
- **ALWAYS** set security headers on all responses

### Required Headers
```javascript
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    next();
});
```

---

## 5. Input Validation & Sanitization

### Rules
- **ALWAYS** validate all user input on the server side
- **NEVER** trust client-side validation alone
- **ALWAYS** sanitize input before database operations
- **ALWAYS** validate email format, password strength, etc.

### Validation Pattern
```javascript
function validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    if (!password || typeof password !== 'string') return false;
    return password.length >= 8;
}

// In route handler
if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
}
```

---

## 6. Security Monitoring & Alerts

### Rules
- **ALWAYS** log security events (failed logins, lockouts, etc.)
- **ALWAYS** implement real-time alerts for critical security events
- **ALWAYS** mask PII in all public-facing alerts (GitHub, logs)

### Alert Channels
| Channel | Use Case | Implementation |
|---------|----------|----------------|
| Email | Admin notification | nodemailer with SMTP |
| SMS | Critical alerts | Twilio |
| GitHub PR | Dev team awareness | GitHub API comments |
| Database | Audit trail | `pending_alerts` table |

### Security Event Logging Pattern
```javascript
async function handleLockout(email) {
    const maskedEmail = maskEmail(email);
    console.log(`[SECURITY] Account lockout: ${maskedEmail}`);

    // Send alerts (non-blocking)
    sendEmailAlert(email).catch(err => console.error('Email failed:', err));
    sendSmsAlert(email).catch(err => console.error('SMS failed:', err));
    postGitHubComment(maskedEmail).catch(err => console.error('GitHub failed:', err));
}
```

---

## 7. Two-Factor Authentication (2FA)

### Rules
- **ALWAYS** offer 2FA for admin/sensitive accounts
- **ALWAYS** use TOTP (Time-based One-Time Password)
- **NEVER** store 2FA secrets in plain text logs
- **ALWAYS** provide 2FA reset mechanism

### 2FA Implementation Pattern
```javascript
const speakeasy = require('speakeasy');

// Generate secret
const secret = speakeasy.generateSecret({ name: "MyApp (user@email.com)" });

// Verify token
const verified = speakeasy.totp.verify({
    secret: user.tfa_secret,
    encoding: 'base32',
    token: userProvidedToken,
    window: 2 // Allow 60 seconds drift
});
```

---

## 8. Deployment Security (Vercel/Cloud)

### Rules
- **ALWAYS** set environment variables in hosting dashboard (not in code)
- **ALWAYS** use production branch protection
- **NEVER** expose debug endpoints in production
- **ALWAYS** use HTTPS (automatic on Vercel)

### Vercel Configuration Pattern
```json
// vercel.json
{
  "version": 2,
  "builds": [{ "src": "server.js", "use": "@vercel/node" }],
  "routes": [
    { "src": "/api/(.*)", "dest": "server.js" },
    { "src": "/admin/(.*)", "dest": "server.js" },
    { "src": "/(.*)", "dest": "server.js" }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Required Vercel Environment Variables
```
SESSION_SECRET=<random-32-char-string>
DATABASE_URL=<turso-or-db-url>
DATABASE_AUTH_TOKEN=<db-token>
ADMIN_USER=<admin-username>
ADMIN_PASS=<strong-password>
```

---

## 9. Git Security

### Rules
- **NEVER** commit secrets or credentials
- **ALWAYS** use `.gitignore` for sensitive files
- **ALWAYS** review diffs before committing
- **NEVER** force push to main/production branches

### Required .gitignore Entries
```
# Environment
.env
.env.local
.env.*.local

# Database
*.db
*.sqlite
*.db-shm
*.db-wal

# Dependencies
node_modules/

# OS
.DS_Store

# Logs
*.log
```

---

## 10. API Security

### Rules
- **ALWAYS** implement rate limiting on all API endpoints
- **ALWAYS** validate and sanitize request body/params
- **ALWAYS** return generic error messages (don't leak system info)
- **ALWAYS** use proper HTTP status codes

### Error Response Pattern
```javascript
// CORRECT - Generic message
res.status(401).json({ error: 'Invalid credentials' });

// WRONG - Leaks information
res.status(401).json({ error: 'User anshul@test.com not found in database' });
```

---

## Quick Checklist for New Projects

Before deploying any project, verify:

- [ ] All secrets are in environment variables
- [ ] `.env` is in `.gitignore`
- [ ] `.env.example` exists with placeholder values
- [ ] Passwords are hashed with bcrypt (12+ rounds)
- [ ] Rate limiting is enabled on auth endpoints
- [ ] Account lockout is implemented
- [ ] SQL queries use parameterized statements
- [ ] Security headers are set
- [ ] Input validation exists on all endpoints
- [ ] PII is masked in logs and public alerts
- [ ] 2FA is available for admin accounts
- [ ] Production environment variables are set in hosting dashboard

---

## Emergency Response

If secrets are accidentally committed:

1. **Immediately** rotate all exposed credentials
2. Remove from git history: `git filter-branch` or BFG Repo-Cleaner
3. Force push cleaned history (coordinate with team)
4. Audit access logs for unauthorized use
5. Update `.gitignore` to prevent recurrence

---

*This security constitution is based on OWASP best practices and real-world implementation experience.*
