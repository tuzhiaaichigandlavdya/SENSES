
# Threat Model: CipherChat

## 1. System Overview
CipherChat is an end-to-end encrypted (E2EE) messaging application designed to operate in a zero-trust environment. The server is assumed to be "honest but curious" (or potentially compromised), meaning it routes messages correctly but attempts to read their content.

## 2. Trust Boundaries
- **Trusted**: User's Device (Browser memory, Local inputs).
- **Untrusted**: Network (TLS assumed but intercepted), Server (Vercel, Database), Storage (Postgres).

## 3. Threat Analysis & Mitigations

### 3.1 Server Compromise / Database Leak
- **Threat**: Attacker gains full access to the Postgres database.
- **Impact**: Attacker sees:
  - Encrypted private keys (blob).
  - Encrypted messages (ciphertext).
  - Public keys.
  - Hashed passwords.
  - Metadata (Sender, Recipient, Timestamp).
- **Mitigation**:
  - **Private Keys**: Encrypted client-side using a key derived from the user's password (PBKDF2/AES-GCM). The server never sees the plaintext private key.
  - **Messages**: Encrypted client-side using ephemeral symmetric keys derived via ECDH (X25519). Server sees only ciphertext.
  - **Passwords**: Hashed using Argon2/Bcrypt with salt.

### 3.2 Man-in-the-Middle (MitM) - Network
- **Threat**: Attacker intercepts traffic between User and Server.
- **Mitigation**:
  - **TLS/SSL**: All traffic is HTTPS.
  - **E2EE**: Even if TLS is broken, the payload is encrypted with keys unknown to the attacker.

### 3.3 Malicious Client / Impersonation
- **Threat**: User A tries to impersonate User B.
- **Mitigation**:
  - **Authentication**: JWT tokens issued upon successful password verification.
  - **Signature**: Messages could be signed with the private key (Future Improvement: Ed25519 signatures). Currently relying on authenticated session + knowledge of shared secret.

### 3.4 Cross-Site Scripting (XSS)
- **Threat**: Malicious script injected into the frontend to steal keys from memory.
- **Mitigation**:
  - **React**: Auto-escaping of content.
  - **Content Security Policy (CSP)**: Restrict script sources.
  - **HttpOnly Cookies**: For JWT (Recommended for production, currently using localStorage/memory for demo simplicity).
  - **Key Storage**: Keys are kept in Javascript memory (Closure/Zustand) and never written to `localStorage` or `cookies` in plaintext.

### 3.5 Metadata Leakage
- **Threat**: Attacker learns *who* is talking to *whom* and *when*.
- **Mitigation**:
  - Currently **Accepted Risk**. The server needs metadata to route messages.
  - Mitigation (Future): Sealed Sender techniques or Mixnets.

## 4. Cryptographic Primitives
- **Key Exchange**: X25519 (ECDH over P-256 fallback in WebCrypto).
- **Symmetric Encryption**: AES-256-GCM.
- **Key Derivation**: PBKDF2 (SHA-256, 100k iterations).
- **Randomness**: `crypto.getRandomValues()`.

## 5. Residual Risks
- **Weak Passwords**: If a user chooses a weak password, their encrypted private key blob can be brute-forced offline if the DB is leaked.
- **Browser Compromise**: If the user's browser or OS is compromised, E2EE provides no protection (Keyloggers, Memory dump).
