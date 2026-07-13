# Module 04: Authentication & Security

---

## 1. Purpose

### Why This Module Exists
The **Authentication & Security** module represents the gatekeeper of TaskFlow. In technical interviews, security is a zero-tolerance domain. Candidates must prove they can design secure user authentication, protect against session hijacking, securely integrate third-party identity providers (OAuth), and implement advanced multi-factor authentication (MFA/2FA) utilizing Time-based One-Time Passwords (TOTP) and backup recovery codes.

### What Problem It Solves
TaskFlow manages private project data.
* We must verify user identities securely, storing passwords using cryptographically secure hashing (bcrypt).
* Support fast, secure, and user-friendly login flows using **Google OAuth 2.0**.
* Provide additional security layers via **2FA (TOTP)** to protect accounts even if passwords are leaked.
* Issue stateless verification sessions (JWT) while protecting against token hijacking.

Implementing these practices prevents brute-force logins, credential stuffing, and session compromise.

### How It Interacts With Other Modules
Authentication acts as the prefix middleware for all state modifications.
* The **Express router** routes public auth calls to controllers, while routing project/board actions through `authMiddleware`.
* The `authMiddleware` decodes user IDs to check authorization in the **RBAC Engine**.
* Client-side routing redirects unauthorized users to the login screen and monitors session expiry.

```
[ Client ]
   |
   +--- (1) Login (User/Pass OR Google) ---> [ Auth Controller ]
   |                                                |
   |                                          (2) 2FA Enabled?
   |                                           /         \
   |                                         Yes          No
   |                                         /             \
   |                        [ Temp Token Issued ]      [ Access Token Issued ]
   |                                 |
   +--- (3) Submit 2FA Token --------+
   |         |
   |   [ Verify TOTP ]
   |         |
   v   [ Access Token Issued ]
[ Client Dashboard Access ]
```

### Real-World Analogy
Think of the authentication system as a secure building access protocol.
* **Bcrypt** is like taking a visitor's blueprint, shredding it, and only matching the shredded pieces (hash) when they visit.
* **Google OAuth** is like presenting a trusted government ID card. We don't check their records ourselves; we trust the government's (Google's) validation stamp.
* **2FA/TOTP** is like a safe combination lock that changes automatically every 30 seconds. Even if an intruder steals your building access card (password), they cannot enter without checking the active combination on your physical watch.

---

## 2. High-Level Overview

Authentication inside TaskFlow is split between traditional password login, Google OAuth, and speakeasy-based 2FA.

---

## 3. Detailed Workflow

Let us trace the most secure verification flow: **A user logs in with 2FA/TOTP enabled.**

### Execution Sequence
1. **Credentials verification**:
   * The client sends a `POST /api/v1/auth/login` request with `{ email, password }`.
   * The controller queries the database for the user. If found, it compares the password attempt against the stored hash using `bcrypt.compare()`.
2. **2FA Intercept**:
   * If the user's `twoFactorEnabled` flag is true, the server intercepts the login.
   * Instead of returning a full access token, the server returns a temporary payload: `{ twoFactorRequired: true, tempToken: "JWT-temp-token-with-userId" }` with status `200 OK`.
3. **TOTP Verification**:
   * The client prompts the user for the 6-digit TOTP code.
   * The client sends a `POST /api/v1/auth/verify-2fa` request with `{ tempToken, code }` in the headers/body.
   * The server extracts the `userId` from the `tempToken` and fetches the user's `twoFactorSecret` from the database.
   * The server verifies the 6-digit token using `speakeasy.totp.verify({ secret, encoding: 'base32', token: code })`.
4. **Access Granted**:
   * If the code is correct, the server issues a final access token (JWT containing user profile details) with a 24-hour expiry.
   * **Backup Recovery**: If the user has lost their 2FA device, they can input an unused 16-character backup code. The server compares the backup code attempt against the stored hashes in `twoFactorBackupCodes`. If verified, access is granted, and the code is marked as spent.

---

## 4. Classes (Auth Helpers)

While the controllers manage route logic, cryptography is handled by utility modules and libraries.

### `Speakeasy` (2FA Engine)
* **Purpose**: Generates and verifies TOTP secrets and tokens.
* **Responsibilities**:
  * Creates random base32 secrets.
  * Generates Google Authenticator compatible QR code URLs.
  * Validates token codes within a specific time window.
* **Key Methods**:
  * `generateSecret()`: Creates credentials for 2FA setup.
  * `totp.verify()`: Validates code strings.
* **Why This Design**: Speakeasy conforms to standard RFC 6238 specifications, ensuring compatibility with standard MFA apps (Authy, Google Authenticator).

---

## 5. Functions

### `googleLogin(req, res, next)`
* **Purpose**: Authenticates users using a Google ID Token.
* **Parameters**:
  * `req.body.token`: `string` (The ID token returned by Google Sign-In on the client).
* **Return Value**: JSON object containing access token and user profile data.
* **Time Complexity**: $O(1)$ (direct lookup/insert of user).
* **Execution Block**:
  ```typescript
  const googleVerifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`;
  const response = await fetch(googleVerifyUrl);
  const payload = await response.json();

  if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
    throw new Error('Google token audience mismatch');
  }

  let user = await prisma.user.findUnique({ where: { email: payload.email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email: payload.email, name: payload.name, passwordHash: 'OAUTH_USER' }
    });
  }
  // Proceed to issue JWT access token...
  ```
* **Why Written This Way**: Fetching directly from Google's tokeninfo URL ensures token validity. Checking the `aud` (audience) claim blocks attackers from reusing tokens generated for other apps.

---

## 6. Architecture Discussion

### Security Architecture & Decoupling
* **Stateless Validation**: The backend does not maintain sessions in database tables. The `authMiddleware` validates JWT signatures in CPU memory, enabling simple scaling of server instances.
* **2FA isolation**: Temporary tokens issued during 2FA logins only contain the user's ID. They cannot be used to access API routes (like boards or workspaces) because the `authMiddleware` blocks tokens containing the `temp_login` claim.

---

## 7. Interview Questions

### Easy (15)

#### 1. What is the difference between hashing and encryption?
* **Answer**: Hashing is a one-way cryptographic function that cannot be decrypted. Encryption is two-way, allowing data to be decrypted using a key.
* **Explanation**: We hash passwords using bcrypt so they cannot be retrieved even if the database is compromised.
* **Follow-up**: *Why do we use hashing instead of encryption for passwords?* To prevent attackers or administrators from reading passwords in plain text.
* **Common Mistakes**: Claiming that bcrypt "encrypts" passwords.

#### 2. What is a JWT secret key, and why is it important?
* **Answer**: A secret key is a server-side cryptographic key used to sign and verify JWT tokens.
* **Explanation**: If an attacker gets the secret key, they can generate fake tokens, bypass authentication, and access any account.
* **Follow-up**: *Where should the secret key be stored?* In environment variables, never hardcoded in the codebase.
* **Common Mistakes**: Storing secret keys in public code repositories.

#### 3. What is Google OAuth 2.0?
* **Answer**: An authorization framework that allows third-party applications to obtain limited access to a user's Google account without exposing their password.
* **Explanation**: The user logs in on Google's portal, and Google issues an access token or ID token to the application.
* **Follow-up**: *How does the backend verify this token?* By calling Google's public tokeninfo API endpoint and verifying the audience claim.
* **Common Mistakes**: Trusting user details sent by the client without verifying the token signature on the backend.

#### 4. What is Speakeasy used for in this project?
* **Answer**: A Node.js library used to generate TOTP secrets, create QR code URLs, and verify 6-digit 2FA tokens.
* **Explanation**: It implements the RFC 6238 time-based one-time password algorithm.
* **Follow-up**: *Does Speakeasy require a database connection to verify tokens?* No, it verifies tokens using the user's secret key and the current system time.
* **Common Mistakes**: Thinking Speakeasy sends SMS codes.

#### 5. Why do we store passwords as hashes instead of plain text?
* **Answer**: To protect user accounts in case of database leaks. Even if an attacker dumps the database, they cannot read the passwords.
* **Explanation**: Hashing is a one-way mathematical function; we can only verify passwords by hashing the login attempt and comparing results.
* **Follow-up**: *What algorithm do we use?* Bcrypt.
* **Common Mistakes**: Storing plain text passwords in log files during debugging.

#### 6. What is a salt in bcrypt?
* **Answer**: A random string added to the password before hashing to ensure identical passwords generate different hash outputs.
* **Explanation**: Salting prevents attackers from using precomputed dictionary tables (rainbow tables) to crack hashes.
* **Follow-up**: *Does bcrypt handle salting automatically?* Yes, the salt is generated and embedded in the resulting hash string.
* **Common Mistakes**: Reusing the same salt string for all user passwords.

#### 7. What is the difference between Access Token and Refresh Token?
* **Answer**: Access tokens are short-lived, sent on every API request. Refresh tokens are long-lived, stored securely, and used to get new access tokens.
* **Explanation**: If an access token is hijacked, it expires quickly. Refresh tokens require verification before generating new sessions.
* **Follow-up**: *Where is the access token stored?* Typically in application memory or session storage.
* **Common Mistakes**: Setting access token expiries to several months.

#### 8. What is Cross-Site Scripting (XSS), and how does it relate to auth?
* **Answer**: An attack where malicious JavaScript is injected into websites, allowing scripts to read local tokens (like those in localStorage).
* **Explanation**: We mitigate XSS risks by sanitizing inputs and storing sensitive tokens in HttpOnly cookies where JavaScript cannot read them.
* **Follow-up**: *What header helps block XSS?* Content Security Policy (CSP) headers.
* **Common Mistakes**: Assuming client-side input validation completely prevents XSS.

#### 9. What is a 2FA Backup Code?
* **Answer**: A one-time use alphanumeric code generated during 2FA setup, used to log in if the user loses access to their authenticator app.
* **Explanation**: The codes are hashed and stored in the database. When used, they are validated and marked as spent.
* **Follow-up**: *Why must they be hashed?* To prevent attackers with database access from stealing backup codes and bypassing 2FA.
* **Common Mistakes**: Storing backup codes in plain text.

#### 10. Why is JWT verification fast and stateless?
* **Answer**: Because the token contains all user claims and is verified using the server's secret key without querying database records on every call.
* **Explanation**: The signature check is a CPU-bound mathematical operation, saving database connection overhead.
* **Follow-up**: *What is the drawback of stateless JWTs?* They are difficult to invalidate before their expiry date.
* **Common Mistakes**: Claiming JWTs require Redis caches for basic validation.

#### 11. What is the authorization header format for JWTs?
* **Answer**: `Authorization: Bearer <JWT_Token_String>`.
* **Explanation**: The `Bearer` prefix indicates that the request holder possesses the token.
* **Follow-up**: *How does the middleware read this?* By splitting the string on the space character and taking the second element.
* **Common Mistakes**: Forgetting the `Bearer` prefix in API clients, which causes authentication checks to fail.

#### 12. What is speakeasy's `totp.verify()` window parameter?
* **Answer**: A configuration parameter that specifies the allowable time offset (in 30-second steps) for token validation.
* **Explanation**: A window of `1` allows tokens from the previous and next 30-second intervals to be accepted, compensating for client-server clock drift.
* **Follow-up**: *Why is clock synchronization critical?* If the server clock drifts significantly, all 2FA checks will fail.
* **Common Mistakes**: Setting a window of 0 in environments with high network latency.

#### 13. What is the role of the `twoFactorEnabled` database column?
* **Answer**: A boolean flag indicating whether the user has completed the 2FA setup and requires token verification during login.
* **Explanation**: If true, logins are intercepted, and users must submit a valid 2FA token to get access.
* **Follow-up**: *Why do we have a separate temp secret?* To prevent locking users out of accounts before they verify their first 2FA setup code.
* **Common Mistakes**: Setting `twoFactorEnabled: true` immediately on secret generation before code verification.

#### 14. What does the auth middleware do on request failure?
* **Answer**: It returns a `410 Unauthorized` response and stops the request chain before it reaches the route controller.
* **Explanation**: The middleware intercepts requests and checks the JWT header. If invalid, the request ends immediately.
* **Follow-up**: *What error codes are returned?* `UNAUTHORIZED` or `TOKEN_EXPIRED`.
* **Common Mistakes**: Running business logic queries in controllers before verifying authentication headers.

#### 15. How do you revoke a JWT token?
* **Answer**: Standard JWTs cannot be revoked easily without adding database checks. We can implement token blacklist caches in Redis, check token IDs (`jti`), or use short-lived tokens.
* **Explanation**: If a token is stolen, it remains valid until the expiry timestamp is reached.
* **Follow-up**: *Which strategy has the lowest latency?* Short-lived tokens (e.g. 5 minutes) paired with refresh token verification.
* **Common Mistakes**: Assuming deleting a token from client storage invalidates it on the server.

---

### Medium (20)

#### 1. How does the 2FA setup and verification flow prevent locking out users?
* **Interviewer's Intent**: To check security design best practices for two-factor authentication enrollments.
* **Answer**: When a user clicks "Enable 2FA", we generate a secret key using Speakeasy but store it as `twoFactorTempSecret` in the database, leaving `twoFactorEnabled` set to false. The user must scan the QR code and submit a valid 6-digit code. We verify the code against the temporary secret; if valid, we copy the secret to `twoFactorSecret`, generate recovery codes, and set `twoFactorEnabled` to true.
* **Why Interviewer Asks**: If you enable 2FA on the user record immediately upon secret generation, any network failure or scanner issue before the first verification locks the user out of their account.
* **Common Mistakes**: Setting `twoFactorEnabled: true` before confirming the user has scanned and verified their authenticator key.
* **Follow-up**: *What happens to the temp secret after verification?* It is cleared to keep database hygiene.
* **Production Example**: standard enrollment flow used by GitHub or Google Security settings.

#### 2. How do you verify Google OAuth tokens securely without calling Google APIs on every request?
* **Interviewer's Intent**: To check knowledge of OAuth token structures, performance optimizations, and JWT signature verification.
* **Answer**: Google ID tokens are standard JWTs signed using Google's public certificates. Instead of calling Google's `/tokeninfo` endpoint on every request, we can download Google's public JSON Web Keys (JWKs) from `https://www.googleapis.com/oauth2/v3/certs`, cache them, and verify the token signature locally using standard JWT validation libraries.
* **Why Interviewer Asks**: Calling Google endpoints on every API request adds 100-200ms latency, creating severe performance bottlenecks.
* **Common Mistakes**: Making synchronous HTTP calls to Google servers inside the auth middleware.
* **Follow-up**: *How often do Google's public keys rotate?* Typically every 24 hours. We must configure cache expiries to reload keys daily.
* **Production Example**: Implementing local signature verification using libraries like `google-auth-library`.

#### 3. What is the threat of JWT Token Hijacking, and how do we mitigate it?
* **Interviewer's Intent**: To verify knowledge of session hijack vectors and security mitigation.
* **Answer**: If an attacker steals an active JWT, they can access the user's account from any device. We mitigate this by:
  1. Storing tokens in memory or HttpOnly, SameSite cookies.
  2. Setting short access token expiries (e.g. 15 minutes).
  3. Binding tokens to client fingerprints (like IP or User-Agent) and verifying these parameters match on every request.
* **Why Interviewer Asks**: Stateless JWTs cannot be revoked easily. Security engineers must design mitigation strategies to protect session tokens.
* **Common Mistakes**: Believing that encryption of JWT payloads prevents session hijacking.
* **Follow-up**: *What is Refresh Token Rotation?* Invalidation of the old refresh token whenever a new one is issued, helping detect hijackers using stolen credentials.
* **Production Example**: Auth0 session token security policies.

#### 4. How does the application handle logins for users registering via Google OAuth when an email account already exists?
* **Interviewer's Intent**: To check account linking design and identity federation principles.
* **Answer**: If a user signs up using email/password and later clicks "Login with Google" using the same email, the backend checks if the email exists. If found, it links the Google provider identity to the existing account rather than creating a duplicate user row.
* **Why Interviewer Asks**: Duplicate records for the same email cause authentication errors and split workspace permissions.
* **Common Mistakes**: Creating a new user row with a duplicate email, violating database unique constraints.
* **Follow-up**: *Should we require password verification when linking accounts?* For security, the first link attempt can prompt the user to confirm their password or verify their email.
* **Production Example**: Okta or Firebase Auth account linking logic.

#### 5. Why is bcrypt deliberately slow, and how does it protect against brute-force attacks?
* **Interviewer's Intent**: To check password security and cryptographic hashing mechanics.
* **Answer**: Bcrypt is a CPU-intensive hashing algorithm. It implements a **work factor** (cost parameter) that controls the time required to calculate a hash. This delay (e.g. 100ms) has minimal impact on individual users but makes brute-force attacks with millions of attempts computationally expensive and slow.
* **Why Interviewer Asks**: Fast hashing algorithms (like MD5 or SHA256) allow attackers to test billions of passwords per second using cheap GPU arrays.
* **Common Mistakes**: Recommending fast hashing algorithms for password storage.
* **Follow-up**: *What work factor did you use?* Typically 12, balancing verification speed and brute-force protection.
* **Production Example**: standard password storage setups in modern Node.js applications.

#### 6. What is session fixation, and how do we prevent it?
* **Interviewer's Intent**: To check session lifecycle security knowledge.
* **Answer**: Session fixation occurs when an attacker forces a target to use a known session ID. Once the user authenticates, the attacker hijacks the session. We prevent this by generating a new session token (JWT) immediately upon successful authentication, invalidating any pre-auth temporary tokens.
* **Why Interviewer Asks**: Failing to rotate tokens on login allows attackers to hijack sessions using pre-generated keys.
* **Common Mistakes**: Reusing the same connection or token structure before and after authentication.
* **Follow-up**: *How does this apply to WebSockets?* Sockets must re-authenticate and bind to new JWTs upon user login.
* **Production Example**: Passport.js session regeneration on login.

#### 7. How does client-server clock drift affect TOTP 2FA, and how do you handle it?
* **Interviewer's Intent**: To test network synchronization resilience in MFA implementations.
* **Answer**: TOTP generates codes based on the current Unix timestamp divided by 30 seconds. If the user's phone or server clock is drifted by more than 30 seconds, the generated codes won't match. We handle this by setting a verification **window** parameter (e.g. `window: 1` in Speakeasy), which accepts tokens from the previous and next intervals.
* **Why Interviewer Asks**: Clock drift is common. A window of 0 leads to constant login failures for users with slightly inaccurate phone clocks.
* **Common Mistakes**: Hardcoding a window of 0, which makes the login flow fragile.
* **Follow-up**: *What is the risk of a very large window (e.g. 5)?* It increases the token validity duration, making it vulnerable to intercept attacks.
* **Production Example**: Google Authenticator settings configurations.

#### 8. What is the difference between OAuth 2.0 and OpenID Connect (OIDC)?
* **Answer**: OAuth 2.0 is an authorization framework designed to grant access tokens. OpenID Connect is an identity layer built on top of OAuth 2.0 that introduces ID Tokens to handle user authentication.
* **Why Interviewer Asks**: Explains standard federation concepts.
* **Common Mistakes**: Claiming OAuth 2.0 is an authentication protocol.
* **Follow-up**: *What format does the OIDC ID Token use?* JWT.
* **Production Example**: Logging in to TaskFlow using Google OIDC.

#### 9. Why should JWT tokens never store sensitive personal data?
* **Answer**: JWTs are base64-encoded, not encrypted. Anyone who intercepts the token can decode it and read the payload.
* **Why Interviewer Asks**: Tests basic JWT cryptography knowledge.
* **Common Mistakes**: Storing user passwords or phone numbers inside JWT payloads.
* **Follow-up**: *What is JWE?* JSON Web Encryption, a standard for encrypting JWT payloads when sensitive data must be included.
* **Production Example**: Restricting JWT payloads to `userId` and authorization scopes.

#### 10. How does rate limiting on the `/auth/login` endpoint prevent denial of service (DoS)?
* **Answer**: Bcrypt password hashing is CPU-heavy. Attackers can flood the login route with request calls, exhausting server CPU capacity. Rate limiting limits the request frequency, protecting server resources.
* **Why Interviewer Asks**: Demonstrates resource exhaustion protection skills.
* **Common Mistakes**: Setting the same rate limits for login routes as public read API endpoints.
* **Follow-up**: *Where do you store rate limit buckets?* In Redis to support distributed architectures.
* **Production Example**: Implementing IP and account-based rate limit blocks.

#### 11. What is token leakage, and what are the common leak vectors?
* **Answer**: Token leakage is the accidental exposure of session tokens. Common vectors include browser history logs, network proxy logs (if tokens are passed in query params), and console output files during debugging.
* **Why Interviewer Asks**: Tests secure development practices.
* **Common Mistakes**: Passing API tokens in URL query strings.
* **Follow-up**: *Where should you pass tokens?* In the secure HTTP `Authorization` header.
* **Production Example**: Enforcing header-only authorization checks.

#### 12. How does the Speakeasy library generate the TOTP secret key?
* **Answer**: It generates a cryptographically secure random sequence of bytes and encodes them in base32 format.
* **Why Interviewer Asks**: Verifies understanding of TOTP secret generation.
* **Common Mistakes**: Using standard `Math.random()` to generate secrets.
* **Follow-up**: *Why is base32 used instead of base64?* Base32 uses a smaller character set (excluding confusing characters like '0', 'O', '1', 'I') making it easier for users to type manual keys.
* **Production Example**: Speakeasy secret generation.

#### 13. What is the purpose of the JWT `jti` (JWT ID) claim?
* **Answer**: A unique identifier for the JWT. It is used to prevent replay attacks by ensuring each token can only be accepted once.
* **Why Interviewer Asks**: Tests token tracking and replay mitigation.
* **Common Mistakes**: Ignoring the `jti` claim in token validation checks.
* **Follow-up**: *How does the server verify this?* By storing active `jti` keys in a Redis whitelist.
* **Production Example**: JWT blacklisting pipelines.

#### 14. How does the frontend handle token expiration without logging out active users?
* **Answer**: By using a background refresh loop. Before the access token expires, the client sends a request to `/auth/refresh` with the refresh token to get a new access token.
* **Why Interviewer Asks**: Crucial for user experience.
* **Common Mistakes**: Interrupting users with login dialogs while they are actively working.
* **Follow-up**: *Where should the refresh token be stored?* In an HttpOnly cookie.
* **Production Example**: Axios interceptors managing token refresh flows.

#### 15. What are the security risks of OAuth redirect URIs, and how do you secure them?
* **Answer**: If an attacker redirects the OAuth handshake to an untrusted domain, they can capture the auth code. We secure this by registering a strict whitelist of redirect URIs on the OAuth provider's portal (e.g. Google Cloud Console).
* **Why Interviewer Asks**: Prevent open redirect vulnerabilities.
* **Common Mistakes**: Using wildcards in registered redirect URIs.
* **Follow-up**: *What parameter prevents CSRF in OAuth flows?* The `state` parameter, which contains a random value verified on callback.
* **Production Example**: Google Cloud Console credentials setup.

#### 16. What is credential stuffing?
* **Answer**: An automated attack where lists of leaked username/password pairs from other sites are tested against our login endpoint.
* **Why Interviewer Asks**: High risk for public platforms.
* **Common Mistakes**: Assuming standard password validation blocks credential stuffing.
* **Follow-up**: *How do we mitigate this?* By enforcing rate limits, IP checks, and MFA.
* **Production Example**: Security policies blocking automated login attempts.

#### 17. How does the application store 2FA secrets securely in the database?
* **Answer**: In production, 2FA secrets are encrypted using a symmetric encryption algorithm (like AES-256) with a server-side environment key before writing to the database.
* **Why Interviewer Asks**: Storing 2FA secrets in plain text allows anyone with database access to bypass MFA.
* **Common Mistakes**: Storing 2FA secrets in plain text.
* **Follow-up**: *What happens if the encryption key is lost?* All users are locked out of 2FA and must use backup recovery codes.
* **Production Example**: Encrypting columns using database keys or application-level encryption.

#### 18. Why do we verify the `aud` (audience) claim in Google ID tokens?
* **Answer**: To verify that the token was generated specifically for our application. If we skip this check, an attacker can use a valid Google token generated for another app to log in.
* **Why Interviewer Asks**: Crucial OAuth security check.
* **Common Mistakes**: Verifying the token signature but ignoring the audience verification check.
* **Follow-up**: *What should `aud` match?* The application's `GOOGLE_CLIENT_ID`.
* **Production Example**: Verify checks in Google OAuth controller.

#### 19. What is a replay attack in authentication?
* **Answer**: An attack where an attacker intercepts a valid authentication request (like a 2FA code or login payload) and resubmits it to gain access.
* **Why Interviewer Asks**: Tests data capture protection.
* **Common Mistakes**: Assuming SSL completely prevents replay attacks.
* **Follow-up**: *How do we prevent 2FA replay?* By tracking used 2FA tokens and blocking reuse within the active time window.
* **Production Example**: Speakeasy automatic tracking of verified tokens.

#### 20. What is the difference between symmetric and asymmetric token signing?
* **Answer**: Symmetric signing uses the same secret key to sign and verify tokens (e.g. HS256). Asymmetric signing uses a private key to sign and a public key to verify (e.g. RS256).
* **Why Interviewer Asks**: Evaluates cryptographic key distribution design.
* **Common Mistakes**: Distributing private keys to third-party services that only need to verify tokens.
* **Follow-up**: *Which one does Google OAuth use?* Asymmetric (RS256).
* **Production Example**: Signing custom JWT tokens using RS256 private keys.

---

### Hard (20)

#### 1. How would you design a distributed, cryptographically secure Single Sign-On (SSO) system for TaskFlow Enterprise users using SAML 2.0 or OIDC?
* **Detailed Answer**: We implement **OpenID Connect (OIDC)** as the protocol. 
  1. The client redirects the user to the Enterprise Identity Provider (IdP) (e.g. Okta, Azure AD).
  2. The user authenticates, and the IdP redirects back to TaskFlow with an auth code.
  3. TaskFlow's backend exchanges this code for an ID Token and Access Token via a backchannel HTTP request, verifying the token using the IdP's public keys (JWKS).
  4. If verified, we establish a session and issue our own local JWT.
* **Deep Explanation**: SAML 2.0 uses XML-based payloads signed with XML-DSig, which is complex to parse and verify in Node.js. OIDC uses JSON-based JWTs, making it lighter and better suited for RESTful APIs.
* **Alternative Approach**: SAML 2.0.
  * *Pros*: Industry standard for legacy enterprise systems.
  * *Cons*: Heavy XML parsing overhead and vulnerability to XML signature wrapping attacks.
* **Production Example**: Enterprise login flows (Okta integration).
* **Cross Questions**: *How do you verify the authenticity of SAML XML assertions?* By validating the XML signature against the IdP's x509 certificate.

#### 2. How do you design and implement a zero-knowledge password authentication protocol like SRP (Secure Remote Password) to replace standard bcrypt hashing?
* **Detailed Answer**: SRP is a password-authenticated key agreement protocol. The client never sends the password to the server. 
  1. The client and server run cryptographic checks using a shared generator and prime number.
  2. The server stores a password verifier (derived from salt and password).
  3. During login, the client and server exchange random ephemeral keys, generating a shared session key without exchanging the password.
* **Deep Explanation**: SRP prevents eavesdroppers from capturing passwords and protects users even if the server is compromised, as the password verifier cannot be used to log in directly.
* **Alternative Approach**: Standard bcrypt over TLS.
  * *Pros*: Simple, industry standard, supported by all frameworks.
  * *Cons*: The server briefly holds the plain text password in memory during the request.
* **Production Example**: 1Password or secure desktop sync clients.
* **Cross Questions**: *What is the math basis of SRP?* Diffie-Hellman key exchange principles.

#### 3. How do you defend against JWT validation bypass exploits (e.g., the `alg: none` vulnerability)?
* **Detailed Answer**: The `alg: none` exploit occurs when an attacker modifies the JWT header to specify `alg: none` and removes the signature. If the server-side library accepts unsigned tokens, validation passes. We prevent this by:
  1. Enforcing a strict whitelist of allowed algorithms (e.g., `['HS256']`) in the JWT verification options.
  2. Explicitly blocking unsigned tokens in our middleware checks.
* **Deep Explanation**: Modern JWT libraries (like `jsonwebtoken`) disable `alg: none` by default, but developers must still specify the algorithm explicitly to prevent header manipulation.
* **Alternative Approach**: Using opaque tokens stored in Redis.
  * *Pros*: Eliminates JWT signature exploits.
  * *Cons*: Requires database/cache lookups on every request, sacrificing scalability.
* **Production Example**: Configuring secure options in JWT middleware.
* **Cross Questions**: *What is a key confusion attack?* An exploit where an attacker uses a public key to sign a token using HS256 (symmetric), tricking a server configured for RS256 (asymmetric) into verifying it.

#### 4. How would you design a token revocation system that operates with <1ms validation latency?
* **Detailed Answer**: We use a **bloom filter** or **Redis memory whitelist**. 
  1. Access tokens are short-lived (e.g., 5 mins).
  2. When a user logs out, we add their token ID (`jti`) to a Redis blacklist with a TTL matching the token's remaining expiry.
  3. The auth middleware checks Redis (`EXISTS blacklist:jti`). If the key exists, the token is rejected.
* **Deep Explanation**: Checking Redis is fast (<1ms). Using a blacklist instead of a whitelist keeps cache sizes small, as we only store revoked tokens during their active expiry window.
* **Alternative Approach**: Database blacklist check.
  * *Pros*: Simple setup, zero Redis infrastructure dependency.
  * *Cons*: Adds database query latency to every API call.
* **Production Example**: Token revocation systems in high-scale SaaS APIs.
* **Cross Questions**: *What is a bloom filter?* A space-efficient probabilistic data structure used to check if an element is in a set, which can be stored in RAM to check token revocation status.

#### 5. How would you implement rate limiting for 2FA verification attempts to protect against brute-force attacks on the 6-digit TOTP code?
* **Detailed Answer**: A 6-digit TOTP token has only 1,000,000 combinations. Attackers can brute-force this within 30 seconds if rate limiting is missing. We implement a **sliding window rate limiter** on the `/auth/verify-2fa` endpoint. If a user inputs 3 incorrect codes within 5 minutes, we block subsequent verification attempts for 1 hour.
* **Deep Explanation**: Rate limiting is tracked by `userId` rather than IP address, preventing attackers from using distributed botnets to bypass IP-based rate limits.
* **Alternative Approach**: Temporary account lockouts.
  * *Pros*: Blocks brute-force attacks.
  * *Cons*: Vulnerable to denial-of-service, as attackers can lock out legitimate users by submitting incorrect codes.
* **Production Example**: Lockout systems in banking platforms.
* **Cross Questions**: *How do you prevent lockouts from being abused?* By requiring CAPTCHA verification after the first incorrect attempt before locking the account.

#### 6. How do you design a secure password reset flow that prevents account enumeration and token interception?
* **Detailed Answer**: 
  1. Enumeration: The password reset endpoint always returns a generic success response (e.g., "If the email exists, a reset link has been sent"), preventing attackers from verifying if an email is registered on the platform.
  2. Interception: We generate a cryptographically secure random token, hash it, store the hash in the database, and send the plain text token in the email. During reset, we look up the token hash, validating it within a 15-minute expiry window.
* **Deep Explanation**: Storing reset tokens in plain text allows database intruders to hijack reset flows.
* **Alternative Approach**: Sending one-time password links.
  * *Pros*: Simple recovery flow.
  * *Cons*: Vulnerable to email interception.
* **Production Example**: Reset flows in security-first platforms like Proton or GitHub.
* **Cross Questions**: *Why do we hash the reset token in the database?* To prevent attackers with database access from reading active reset links and hijacking accounts.

#### 7. How does OAuth 2.0 PKCE (Proof Key for Code Exchange) secure mobile and SPA applications?
* **Detailed Answer**: SPAs and mobile apps cannot store client secrets securely. PKCE replaces client secrets with a dynamic cryptographic challenge. 
  1. The client generates a random `code_verifier` and hashes it to create a `code_challenge`.
  2. The client sends the challenge during authorization.
  3. The authorization server returns an auth code.
  4. The client exchanges the auth code for tokens by sending the original `code_verifier`. The server hashes it and verifies it matches the challenge, ensuring the exchange request comes from the same client.
* **Deep Explanation**: PKCE blocks attackers who intercept the authorization code from exchanging it for tokens, as they lack the original verifier string.
* **Alternative Approach**: Implicit flow.
  * *Pros*: Simple, returns tokens directly from authorization endpoints.
  * *Cons*: Deprecated due to security risks of exposing tokens in browser history.
* **Production Example**: Authentication in modern single-page applications.
* **Cross Questions**: *What hashing algorithm is used in PKCE?* SHA-256.

#### 8. How would you design a secure Two-Factor Authentication system that is resilient to SIM-swapping attacks?
* **Detailed Answer**: We completely avoid SMS-based 2FA. We support:
  1. **TOTP (Authenticator Apps)**: Cryptographic secrets generated and stored locally on the user's device.
  2. **FIDO2 / WebAuthn (Security Keys)**: Hardware keys (like YubiKeys) that sign challenges using public-key cryptography.
* **Deep Explanation**: SMS is vulnerable to social engineering attacks where attackers trick telecom carriers into routing the target's phone number to a new SIM card.
* **Alternative Approach**: Email-based 2FA.
  * *Pros*: Simple setup, no authenticator app required.
  * *Cons*: Vulnerable if the user's email account is compromised.
* **Production Example**: Security-first configurations on GitHub.
* **Cross Questions**: *How does WebAuthn prevent phishing?* WebAuthn binds credentials to the specific origin domain, blocking users from submitting keys to phishing sites.

#### 9. What is Session Hijacking via Session Fixation, and how do we prevent it on Express?
* **Detailed Answer**: The attacker generates a session ID, forces the victim to use it (e.g. by sending a link containing the session ID), and hijacks the session once the victim logs in. We prevent this by generating a new session ID and token immediately on successful login.
* **Deep Explanation**:
  ```
  Attacker Session ID ---> Victim logs in ---> Session ID is authenticated ---> Attacker uses Session ID
  ```
  Rotating tokens on login invalidates the attacker's pre-auth session ID.
* **Alternative Approach**: Binding sessions to IP addresses.
  * *Pros*: Simple validation check.
  * *Cons*: Causes issues for mobile users whose IPs change frequently.
* **Production Example**: Session management in Express-session configurations.
* **Cross Questions**: *Does JWT protect against session fixation?* Yes, since JWTs are generated on the server and signed with the secret key, attackers cannot force victims to use a pre-authenticated token.

#### 10. How would you design a secure 2FA backup code recovery process that prevents social engineering attacks on support teams?
* **Detailed Answer**: We implement a **Self-Service Zero-Knowledge Recovery** process. During 2FA setup, we generate and display backup codes, informing the user that support teams cannot recover their account if they lose both their 2FA device and backup codes.
* **Deep Explanation**: If support teams have access to backup codes or bypass links, they become targets for social engineering attacks where attackers pretend to be locked-out users.
* **Alternative Approach**: Admin override keys.
  * *Pros*: Simplifies recovery for corporate users.
  * *Cons*: Creates security vulnerabilities if admin credentials are compromised.
* **Production Example**: Zero-knowledge recovery policies on platforms like GitHub.
* **Cross Questions**: *How do you handle corporate account recovery?* By requiring approval from multiple workspace administrators.

#### 11. What is the difference between JSON Web Signature (JWS) and JSON Web Encryption (JWE)?
* **Answer**: JWS signs token payloads to guarantee integrity and authenticity. JWE encrypts token payloads to guarantee confidentiality.
* **Why Interviewer Asks**: Tests advanced token specification knowledge.
* **Common Mistakes**: Assuming standard JWS tokens (like standard JWTs) hide data from readers.
* **Follow-up**: *What is the structure of a JWE token?* Five parts separated by dots: Header, Encrypted Key, Initialization Vector, Ciphertext, and Authentication Tag.
* **Production Example**: Storing encrypted patient records inside session tokens.

#### 12. How do you implement CORS securely in a multi-tenant SaaS application?
* **Answer**: We inspect the incoming `Origin` header in a dynamic CORS middleware, checking if the domain is registered in the tenant's workspace settings (`allowedDomains`). If allowed, we echo the origin in the `Access-Control-Allow-Origin` response header.
* **Why Interviewer Asks**: Static configurations cannot handle dynamic tenant subdomains.
* **Common Mistakes**: Returning `Access-Control-Allow-Origin: *` when credentials are required.
* **Follow-up**: *What happens if `Access-Control-Allow-Credentials` is set to true with a wildcard origin?* The browser blocks the request for security.
* **Production Example**: Dynamic CORS middleware in microservice gateways.

#### 13. How does the bcrypt algorithm dynamically adjust its work factor?
* **Answer**: The work factor is an integer input (e.g. 10 to 14) representing the number of iterations of the Blowfish hashing loop ($2^{\text{cost}}$ rounds). Increasing the cost by 1 doubles the calculation time.
* **Why Interviewer Asks**: Tests password storage parameter optimization.
* **Common Mistakes**: Setting cost factors to fixed values that cannot be adjusted as CPUs become faster.
* **Follow-up**: *What cost factor would you recommend?* An integer that results in a verification time of 100-200ms on server hardware.
* **Production Example**: Configuring work factors in user registration utilities.

#### 14. What are JWT Claim Verifiers, and why are they necessary?
* **Answer**: Claims verifiers validate specific fields inside the decrypted JWT payload (e.g. `exp` for expiry, `iss` for issuer, `nbf` for not-before time). They are necessary because verifying the signature only guarantees the token has not been tampered with; it does not check if the token is expired or issued by a trusted entity.
* **Why Interviewer Asks**: Essential JWT security validation step.
* **Common Mistakes**: Verifying the signature but ignoring the expiry timestamp check.
* **Follow-up**: *What library handles this?* `jsonwebtoken` executes these checks automatically during the verification call.
* **Production Example**: Validation checks in auth middlewares.

#### 15. How would you design a session revocation system for users who want to "Log out from all devices"?
* **Detailed Answer**: We assign a `tokenVersion` integer column to the `User` model. When generating JWTs, we include the user's `tokenVersion` in the payload. During auth validation, we query the database (or a Redis cache) to verify the token's version matches the user's current version. To log out from all devices, we increment the user's `tokenVersion` in the database, invalidating all pre-existing tokens.
* **Deep Explanation**:
  ```typescript
  // Auth validation
  if (decoded.tokenVersion !== user.tokenVersion) {
    throw new Error('Session invalidated');
  }
  ```
  Incrementing the version resets the token match validation, forcing all active devices to re-authenticate.
* **Alternative Approach**: Blacklisting individual token IDs (`jti`).
  * *Pros*: Keeps active sessions running on other devices.
  * *Cons*: Requires tracking and blacklisting thousands of active tokens.
* **Production Example**: Device logouts in platforms like Netflix.
* **Cross Questions**: *Does this query the database on every request?* Yes, but we cache the active version in Redis to keep validation times under 1ms.

#### 16. What is the risk of utilizing asymmetric cryptography (RS256) key rotation, and how do you secure it?
* **Answer**: If an attacker compromises the key server, they can upload malicious public keys to the JWKS endpoint, tricking our API into validating fake tokens. We secure this by implementing key signature checks, SSL validation, and caching trusted certificates.
* **Why Interviewer Asks**: Tests security key distribution resilience.
* **Common Mistakes**: Downloading JWK keys from untrusted URLs.
* **Follow-up**: *How do you cache keys?* Using memory stores with a TTL of 24 hours.
* **Production Example**: Verifying JWKS endpoints in auth controllers.

#### 17. How do you design a database schema to support OAuth scopes and permissions?
* **Answer**: We create `OAuthClient`, `OAuthScope`, and `OAuthAccessToken` models. Tokens are linked to client IDs and contain an array of authorized scopes (e.g. `read:projects`, `write:tasks`).
* **Why Interviewer Asks**: Explains API access control design.
* **Common Mistakes**: Storing authorization scopes as plain text strings on the user record.
* **Follow-up**: *How does the backend verify scopes?* Using scope check middlewares that verify if the active token contains the required permission string.
* **Production Example**: OAuth2 authorization servers.

#### 18. What is the difference between OAuth 2.0 Grant Type `Authorization Code` and `Client Credentials`?
* **Answer**: Authorization Code is used for user-interactive applications (like web apps). Client Credentials is used for machine-to-machine integrations where no user context exists.
* **Why Interviewer Asks**: Explains standard integration flows.
* **Common Mistakes**: Using Authorization Code for background server integrations.
* **Follow-up**: *Which one requires a user redirect login?* Authorization Code.
* **Production Example**: Machine-to-machine API authentication.

#### 19. How do you protect against brute-force attacks on OAuth state parameters?
* **Answer**: By generating the `state` parameter using cryptographically secure random bytes, hashing it, and validating it against session cookies during the OAuth callback.
* **Why Interviewer Asks**: Protects against CSRF in OAuth flows.
* **Common Mistakes**: Hardcoding state parameters or using easily guessable values.
* **Follow-up**: *What is the standard length?* 16 to 32 bytes.
* **Production Example**: Generating state parameters using Node's `crypto.randomBytes()`.

#### 20. How would you design a distributed session store for stateless JWTs?
* **Detailed Answer**: We use a **Redis cluster** as a token metadata registry. Access tokens contain a unique token ID (`jti`). When checking authorization, the server queries the Redis cluster (`GET session:jti`) to verify session validity.
* **Deep Explanation**: This maintains stateless scalability for the HTTP server instances while allowing instant session revocation by deleting keys from the Redis cluster.
* **Alternative Approach**: Shared database session tables.
  * *Pros*: Simple relational queries.
  * *Cons*: Adds database write overhead, degrading performance.
* **Production Example**: High-scale session registries in microservice clusters.
* **Cross Questions**: *How do you handle Redis cluster node failures?* By configuring Redis sentinel or clustering with master-replica replication.

---

## 8. Resume-Based Questions

### Why did you implement 2FA/TOTP instead of SMS authentication?
* **Answer**: SMS authentication is vulnerable to SIM-swapping attacks, phone number recycling, and network interception. TOTP runs strictly on the user's local device, generates codes cryptographically using shared secrets, and requires no external network coverage, making it more secure and reliable.

### How did you test the 2FA login flow in your automated tests?
* **Answer**: We use Speakeasy inside our integration tests. The test generates a TOTP token using the user's secret key and current system time, then submits it to the `/verify-2fa` route. This allows us to verify the complete token verification pipeline without manual input.

---

## 9. Code Review Questions

### What happens if the `GOOGLE_CLIENT_ID` environment variable is missing?
* **Answer**: The backend logs a configuration error and returns `500 Internal Server Error` to the client. This prevents the application from failing silently or running in insecure fallback states.

### Why do you verify token audience in the Google OAuth controller?
* **Answer**: If we skip this check, an attacker can obtain a valid Google ID token generated for their own application and submit it to our login endpoint. The token would pass signature verification, allowing the attacker to hijack accounts. Verifying `aud` ensures the token was generated specifically for TaskFlow.

---

## 10. Production Readiness

### Rate Limiting
* We set strict rate limits on authentication routes (e.g. max 5 login attempts in 15 minutes) using `express-rate-limit` with a memory or Redis backend.

### SSL Configuration
* We enforce HTTP Strict Transport Security (HSTS) and secure cookies in production, ensuring session cookies are only transmitted over encrypted TLS connections.

---

## 11. Common Mistakes

* **Application-Only 2FA Validation**: Enabling 2FA on the user record before verifying the first generated token.
* **Skipping Token Expiry Verification**: Validating token signatures but ignoring the expiry timestamp.
* **Exposing Secrets in Code**: Hardcoding API client secrets inside configuration files.

---

## 12. Cheat Sheet

* **Bcrypt Cost**: Configure cost factor to `12` in production.
* **TOTP Algorithm**: Speakeasy implements RFC 6238 time-based tokens.
* **Security Validation**: Always verify the token signature, audience, and expiry claims on the server.

---

## 13. Mock Interview

### 1. What happens if the server time drifts by 2 minutes?
* **Interviewer Expectations**: Understanding of TOTP validation windows.
* **Ideal Answer**: The 2FA token check fails because the generated codes drift beyond the validation window. We must synchronize the server clock using Network Time Protocol (NTP).

### 2. Can you use a JWT token to access Socket.io namespaces?
* **Interviewer Expectations**: Token sharing across transports.
* **Ideal Answer**: Yes, we pass the JWT in the socket handshake options and verify it in the Socket.io connection middleware.

### 3. How do you implement a password strength validator on the backend?
* **Interviewer Expectations**: Input validation best practices.
* **Ideal Answer**: We use a password strength validator (like `zxcvbn`) in our schema validation middleware, rejecting passwords with low entropy.

---

## 14. Summary

1. TaskFlow enforces secure password hashing using bcrypt.
2. Google OAuth OIDC tokens are verified on the backend.
3. Speakeasy generates and validates TOTP secrets.
4. 2FA is only enabled after successful verification of the first code.
5. Statless JWT verification avoids database queries on every request.
6. Rate limiters protect authentication routes from brute-force attacks.
7. Reset and temporary login tokens are short-lived.
8. Backup codes are hashed and marked as spent on use.
9. JWT secrets are injected via secure environment variables.
10. All authentication integrations are fully tested.
