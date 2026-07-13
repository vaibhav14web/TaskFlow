# Module 11: Security Constraints

---

## 1. Purpose

### Why This Module Exists
The **Security Constraints** module represents the defensive shield of TaskFlow. In senior engineering and system design interviews, security is evaluated as a core architecture constraint. Candidates must demonstrate deep knowledge of vulnerability vectors (XSS, CSRF, SQL Injection, privilege escalations, domain spoofing) and how to implement defense-in-depth security policies.

### What Problem It Solves
Public-facing SaaS platforms are constant targets for automated attacks:
* **Brute-force Logins**: Botnets trying to guess user passwords.
* **CORS Exploits**: Rogue websites attempting to query the API using credentials.
* **Parameter Manipulation**: Attackers trying to inject script tags or database queries into input fields.
* **Domain Spoofing**: Users trying to invite unauthorized external emails to corporate workspaces.

Implementing CORS whitelists, rate limiters, secure headers, input validators, and domain check constraints secures application resources.

### How It Interacts With Other Modules
Security operates as a cross-cutting filter across all layers:
* Intercepts incoming network connections in the **Express Router**.
* Enforces data encryption and integrity in the **Authentication Module**.
* Sanitizes query parameters written to the **Database Module**.

```
[ Incoming Network Request ]
             |
             v
      [ CORS Whitelist ] ---> Blocked if unrecognized origin
             |
             v
   [ Express Helmet Headers ] ---> Prevent Clickjacking, MIME sniffing
             |
             v
     [ Rate Limiter ] ---> Blocked if request limits exceeded
             |
             v
    [ Input Validator ] ---> Blocked if inputs contain scripts or malformed datatypes
             |
             v
  [ Domain Whitelist checks ] ---> Block if email domain is restricted
             |
             v
[ Controller Business Logic ]
```

### Real-World Analogy
Think of security constraints as a secure airport check-in pipeline.
* **CORS Whitelist** is verifying the taxi drop-off origin: only authorized vehicles (domains) can drop off passengers.
* **Helmet Headers** represent airport security signs, instructing passenger browsers how to behave safely.
* **Rate Limiting** is the turnstile gate: only allowing one passenger through at a time, preventing stampedes.
* **Input Validation** is the baggage scanner: checking luggage for contraband (malicious scripts) before allowing it onto the plane.
* **Domain check** is checking passenger passports: verifying their citizenship (email domain) matches travel visa settings (allowed domains).

---

## 2. High-Level Overview

TaskFlow implements a multi-layered security infrastructure: edge validation, HTTP header security, rate limiting, and database-level parameterization.

---

## 3. Detailed Workflow

Let us trace the security validation flow: **An attacker attempts to invite `attacker@gmail.com` to an enterprise workspace with `allowedDomains: ["company.com"]`.**

### Execution Sequence
1. **Request Entry**:
   * The client dispatches a `POST /api/v1/workspaces/:id/invites` request.
   * Express routes the request, validating the JWT and parsing parameters.
2. **Permission Checks**:
   * The controller verifies the sender is an `ADMIN` or `OWNER` of the target workspace.
3. **Domain Verification**:
   * The controller reads the workspace settings to fetch `allowedDomains`.
   * It extracts the domain of the invited email: `const domain = email.split('@')[1];`.
   * It checks if `allowedDomains` is defined and contains values.
   * Since `gmail.com` is not in `["company.com"]`, the validation fails.
4. **Response**:
   * The controller blocks the invite creation.
   * It returns a `400 Bad Request` containing: `{ error: { code: "DOMAIN_RESTRICTED", message: "Email domain is not authorized for this workspace." } }`. No invite records are written.

---

## 4. Classes (Security Middlewares)

Security controls are configured in Express middlewares.

### `Helmet` (Headers Configurator)
* **Purpose**: Configures secure HTTP response headers to protect browser clients.
* **Key Configurations**:
  * `X-Frame-Options: DENY`: Blocks clickjacking attacks by preventing the site from rendering in iframes.
  * `X-Content-Type-Options: nosniff`: Prevents browsers from sniffing MIME types.
  * `Content-Security-Policy (CSP)`: Restricts where scripts, images, and styles can load from.
* **Why This Design**: Helmet applies standard security headers globally, securing client-side executions.

---

## 5. Functions

### `rateLimiter(req, res, next)`
* **Purpose**: Restricts request rates to prevent server resource exhaustion.
* **Parameters**:
  * `req`: `Request`
  * `res`: `Response`
  * `next`: `NextFunction`
* **Execution**:
  ```typescript
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later.' } }
  });
  ```
* **Why Written This Way**: Using `express-rate-limit` blocks request storms early in the middleware chain, saving database resources.

---

## 6. Architecture Discussion

### Security Boundaries & Input Sanitization
* **Parameterized Queries**: Prisma translates database queries into parameterized SQL statements automatically. This isolates values from SQL keywords, preventing SQL injection vulnerabilities.
* **XSS Sanitization**: Input validators sanitize payload text inputs, escaping or stripping out HTML and script tags before processing, protecting browsers from XSS.

---

## 7. Interview Questions

### Easy (15)

#### 1. What is CORS?
* **Answer**: Cross-Origin Resource Sharing. A browser security mechanism that restricts web applications from making requests to a different domain than the one that served the app.
* **Explanation**: We configure CORS on the backend to allow requests from our frontend domain while blocking unauthorized origins.
* **Follow-up**: *What header specifies allowed origins?* `Access-Control-Allow-Origin`.
* **Common Mistakes**: Setting the CORS origin to wildcard `*` in production environments.

#### 2. What is SQL Injection?
* **Answer**: An attack where malicious SQL statements are injected into input fields, tricking the database into executing unauthorized commands.
* **Explanation**: Attackers can use SQL injection to read sensitive data or delete tables. We prevent this using parameterized queries.
* **Follow-up**: *How does Prisma prevent this?* By using parameterized statements under the hood for all database queries.
* **Common Mistakes**: Thinking ORMs are completely immune to SQL injection when using raw queries.

#### 3. What is Cross-Site Scripting (XSS)?
* **Answer**: An attack where malicious scripts are injected into trusted websites, executing inside browser sessions and accessing local storage tokens.
* **Explanation**: We mitigate XSS by sanitizing input fields and using secure cookies for session storage.
* **Follow-up**: *What header restricts resource origins?* Content Security Policy (CSP).
* **Common Mistakes**: Believing that client-side sanitization is sufficient to prevent XSS.

#### 4. What is Cross-Site Request Forgery (CSRF)?
* **Answer**: An attack that tricks an authenticated user's browser into executing unauthorized actions on a trusted site.
* **Explanation**: We protect against CSRF by using SameSite cookies and anti-CSRF token validations.
* **Follow-up**: *What cookie attribute prevents CSRF?* `SameSite=Strict` or `SameSite=Lax`.
* **Common Mistakes**: Conflating CSRF with XSS attacks.

#### 5. What does the `helmet` middleware do?
* **Answer**: A collection of middlewares that set secure HTTP response headers, securing browser-side executions.
* **Explanation**: It protects apps from clickjacking, XSS, and content-type sniffing.
* **Follow-up**: *What header prevents clickjacking?* `X-Frame-Options: DENY` or `SAMEORIGIN`.
* **Common Mistakes**: Assuming helmet is only useful for serving static HTML pages.

#### 6. What is a Rate Limiter?
* **Answer**: A security mechanism that limits the frequency of incoming requests within a time window to prevent server abuse.
* **Explanation**: We rate limit our API routes to prevent denial of service (DoS) attacks.
* **Follow-up**: *What code is returned when limits are exceeded?* `429 Too Many Requests`.
* **Common Mistakes**: Setting identical rate limits for public read endpoints and CPU-heavy login routes.

#### 7. Why should we restrict CORS origins to a whitelist?
* **Answer**: To prevent rogue websites from reading data from our API or making requests using credentials.
* **Explanation**: Whitelisting origins ensures only trusted client domains can communicate with our API.
* **Follow-up**: *Can we use wildcards if credentials are enabled?* No, browsers block requests if `Access-Control-Allow-Origin: *` is combined with `Access-Control-Allow-Credentials: true`.
* **Common Mistakes**: Whitelisting `localhost` in production build settings.

#### 8. What is input sanitization?
* **Answer**: The process of cleaning and validation input values (stripping HTML tags, escaping special characters) before processing.
* **Explanation**: This prevents XSS and database syntax errors.
* **Follow-up**: *What library did we use?* Zod/Joi for validation, combined with escaping utilities.
* **Common Mistakes**: Sanitizing inputs on the client side only.

#### 9. What is a Secure Cookie?
* **Answer**: A cookie configured with attributes that restrict its transmission and access (like HttpOnly, Secure, and SameSite).
* **Explanation**: These settings protect cookies from being hijacked by browser scripts.
* **Follow-up**: *What does HttpOnly do?* Prevents JavaScript from reading the cookie, blocking XSS theft.
* **Common Mistakes**: Forgetting to set the `Secure` flag on production session cookies.

#### 10. What is a brute-force attack?
* **Answer**: An automated attack where lists of passwords or credentials are tested repeatedly against a login endpoint to guess access keys.
* **Explanation**: We mitigate brute-force attacks using rate limiters and multi-factor authentication (2FA).
* **Follow-up**: *What is credential stuffing?* Testing leaked password lists from other sites against our login portal.
* **Common Mistakes**: Relying only on password complexity checks to block brute-force attempts.

#### 11. What is the role of HTTPS in API security?
* **Answer**: HTTPS encrypts data transmitted between the client and server, preventing eavesdropping and tampering.
* **Explanation**: It protects sensitive tokens and credentials from being intercepted on public networks.
* **Follow-up**: *What protocol does it use?* TLS (Transport Layer Security).
* **Common Mistakes**: Believing that application-level encryption can replace HTTPS.

#### 12. What is privilege escalation?
* **Answer**: An exploit where attackers bypass authorization checks to gain elevated permissions (like Viewer executing Admin deletions).
* **Explanation**: We prevent this using role-based access control (RBAC) checks on all write routes.
* **Follow-up**: *What is vertical privilege escalation?* Gaining permissions of a higher role.
* **Common Mistakes**: Assuming role checks are only required on frontend layouts.

#### 13. What is the purpose of the `X-Content-Type-Options: nosniff` header?
* **Answer**: Prevents browsers from parsing files as different MIME types than declared, blocking executable script injections.
* **Explanation**: It forces the browser to trust the declared `Content-Type` header.
* **Follow-up**: *What attack does this block?* MIME sniffing attacks.
* **Common Mistakes**: Leaving this header unconfigured when serving user-uploaded files.

#### 14. Why do we sanitize file upload names?
* **Answer**: To prevent path traversal attacks where attackers use relative paths (e.g. `../../`) to write files to system directories.
* **Explanation**: We rename uploaded files using unique UUIDs.
* **Follow-up**: *Where should files be stored?* In isolated object storage buckets (like AWS S3) instead of local server disks.
* **Common Mistakes**: Saving files directly to local directories using original names.

#### 15. What does the HTTP header `Strict-Transport-Security` (HSTS) do?
* **Answer**: Instructs browser clients to communicate with the server strictly over secure HTTPS connections, blocking insecure HTTP fallbacks.
* **Explanation**: It protects against man-in-the-middle decryption exploits.
* **Follow-up**: *What parameter sets duration?* `max-age` in seconds.
* **Common Mistakes**: Configuring HSTS on domains that do not support HTTPS.

---

### Medium (20)

#### 1. How do you implement dynamic domain whitelist checks on corporate workspaces?
* **Interviewer's Intent**: To check security architecture design for tenant isolation.
* **Answer**: We add an `allowedDomains` column to the `Workspace` model. When inviting a user or checking registration access, the controller extracts the domain of the target email. It compares it against the workspace's whitelisted domains:
  ```typescript
  const domain = email.split('@')[1];
  if (workspace.allowedDomains && !workspace.allowedDomains.includes(domain)) {
    throw new Error('DOMAIN_RESTRICTED');
  }
  ```
* **Why Interviewer Asks**: Prevents corporate workspaces from leaking access to unauthorized personal emails.
* **Common Mistakes**: Validating domains only during invite clicks, allowing users to change their registration emails later to bypass checks.
* **Follow-up**: *What action must be taken if a workspace updates its domain whitelist?* We must revoke any pending invites for domains that are no longer allowed.
* **Production Example**: Tenant security controls in enterprise SaaS platforms.

#### 2. What is Content Security Policy (CSP), and how does it protect React applications?
* **Interviewer's Intent**: To check browser-side script execution security controls.
* **Answer**: CSP is an HTTP response header that specifies trusted resource sources (scripts, styles, images) the browser is allowed to load. It protects React SPAs by blocking inline script executions and resource downloads from untrusted domains, preventing XSS payloads from executing.
* **Why Interviewer Asks**: Helmet sets base headers, but configuring a strict CSP is essential to block rogue script injections.
* **Common Mistakes**: Using permissive CSP policies (like `default-src *`) which defeats the security purpose.
* **Follow-up**: *What parameter enables inline scripts under CSP?* Nonces or SHA hashes, which verify script integrity.
* **Production Example**: Enterprise CSP header configurations.

#### 3. How do you protect APIs from Parameter Pollution attacks in Express?
* **Interviewer's Intent**: To check input validation and query parameters handling practices.
* **Answer**: Parameter pollution occurs when attackers send duplicate query parameters. Express parses them into arrays, which can bypass string validations and cause database query exceptions. We prevent this by registering the `hpp` middleware, which parses query parameters and removes duplicates.
* **Why Interviewer Asks**: Un-sanitized arrays in database filters can result in query syntax errors or data leak exploits.
* **Common Mistakes**: Assuming query parameters are always strings in application logic.
* **Follow-up**: *Where does `hpp` store duplicate parameters?* In `req.query.pollution`.
* **Production Example**: Express security middleware configurations.

#### 4. How does the application protect password reset tokens from interception and replay attacks?
* **Interviewer's Intent**: To check password recovery security designs.
* **Answer**: 
  1. We generate reset tokens using cryptographically secure random bytes.
  2. We store only the **SHA-256 hash** of the token in the database, sending the plain text token in the email.
  3. The reset token has a short expiry window (e.g. 15 minutes) and is deleted immediately upon use.
* **Why Interviewer Asks**: Storing reset tokens in plain text allows database intruders to read active reset links and hijack accounts.
* **Common Mistakes**: Storing plain text recovery tokens in the database.
* **Follow-up**: *How does the backend verify the link?* By hashing the token parameter submitted in the request and matching it against the stored hash.
* **Production Example**: Secure password recovery systems.

#### 5. Why is HTTPS Strict Transport Security (HSTS) critical for API security?
* **Interviewer's Intent**: To check transport layer encryption security controls.
* **Answer**: HSTS forces browsers to connect strictly using HTTPS, blocking attackers from forcing connections to downgrade to insecure HTTP protocols (man-in-the-middle attacks).
* **Why Interviewer Asks**: Encryption is useless if attackers can force clients to connect over unencrypted channels.
* **Common Mistakes**: Configuring HSTS without verifying subdomains support HTTPS.
* **Follow-up**: *What is the preload option in HSTS?* A registry that instructs browsers to always connect via HTTPS even on their first visit to the domain.
* **Production Example**: Nginx SSL configuration.

#### 6. What is a Replay Attack, and how do you prevent it on session tokens?
* **Answer**: An attack where an attacker intercepts a valid request payload (like a login session or 2FA token) and resubmits it. We prevent this by using TLS to encrypt transmissions, short-lived tokens, and tracking nonces in Redis to prevent reuse.
* **Why Interviewer Asks**: Tests transmission security controls.
* **Common Mistakes**: Assuming HTTPS completely prevents replay attacks on expired tokens.
* **Follow-up**: *What parameter in JWT protects against replays?* The expiry timestamp (`exp`).
* **Production Example**: Replay protection in payment gateways.

#### 7. How does CORS handle credentials on preflight requests?
* **Answer**: When credentials (cookies/authorization headers) are sent, the browser requires the server to echo the exact origin in `Access-Control-Allow-Origin` (wildcards are blocked) and set `Access-Control-Allow-Credentials: true` in preflight responses.
* **Why Interviewer Asks**: Explains standard CORS authentication checks.
* **Common Mistakes**: Returning wildcard origins on authenticated endpoints.
* **Follow-up**: *What HTTP method does preflight use?* `OPTIONS`.
* **Production Example**: Configuring CORS middleware with credentials.

#### 8. What is the danger of using the `eval()` function in JavaScript?
* **Answer**: `eval()` executes input strings as JavaScript code. If user inputs are passed to `eval()`, attackers can execute arbitrary code inside the application context (XSS).
* **Why Interviewer Asks**: Basic Javascript security check.
* **Common Mistakes**: Using `eval()` to parse JSON objects.
* **Follow-up**: *What should you use instead?* `JSON.parse()`.
* **Production Example**: Secure JSON parsing.

#### 9. How do you implement secure file uploads in Node.js?
* **Answer**: 
  1. Restrict file sizes (e.g. max 5MB).
  2. Whitelist file extensions (e.g. only PNG/JPEG).
  3. Rename files using unique UUIDs to prevent path traversal.
  4. Stream uploads directly to S3 instead of local disk storage.
* **Why Interviewer Asks**: Tests file upload security controls.
* **Common Mistakes**: Relying only on client-side extension checks.
* **Follow-up**: *Why do we check the magic bytes?* To verify the actual file type instead of trusting the filename extension.
* **Production Example**: Secure upload middleware.

#### 10. What is a man-in-the-middle (MITM) attack?
* **Answer**: An attack where the attacker intercepts and modifies communications between the client and server. We protect against this using TLS encryption and certificate validation.
* **Why Interviewer Asks**: Explains network security controls.
* **Common Mistakes**: Assuming local networks are immune to interception.
* **Follow-up**: *How does HSTS mitigate this?* By blocking browser connections over unencrypted HTTP channels.
* **Production Example**: TLS network configurations.

#### 11. What are the security risks of error log messages in production?
* **Answer**: Error logs can leak sensitive details (like database credentials, internal file paths, or customer data) if stack traces are exposed in responses or logged to unsecured locations.
* **Why Interviewer Asks**: Tests logging security controls.
* **Common Mistakes**: Returning raw error stack traces to clients in production.
* **Follow-up**: *How do we prevent this?* By sanitizing error payloads in centralized error handler middlewares.
* **Production Example**: Clean production logging configurations.

#### 12. How do you protect against session hijacking in Single Page Applications?
* **Answer**: 
  1. Store access tokens in memory; refresh tokens in HttpOnly cookies.
  2. Implement short token expirations.
  3. Verify client User-Agent and IP hashes on every session check.
* **Why Interviewer Asks**: Crucial session security design.
* **Common Mistakes**: Storing session tokens in localStorage.
* **Follow-up**: *Why is localStorage vulnerable?* Because scripts can read local storage keys, enabling token theft during XSS attacks.
* **Production Example**: Secure SPA session configurations.

#### 13. What is the difference between authorization and authentication?
* **Answer**: Authentication verifies *who* the user is (identity check). Authorization verifies *what* the user is allowed to do (permissions check).
* **Why Interviewer Asks**: Clarifies access control definitions.
* **Common Mistakes**: Conflating the two as the same security step.
* **Follow-up**: *Which middleware handles authentication in TaskFlow?* `authMiddleware` (verifies JWT).
* **Production Example**: RBAC checks in controllers.

#### 14. What is a Content-Security-Policy (CSP) directive `sandbox`?
* **Answer**: A directive that restricts the actions page elements can execute (e.g. blocking form submissions, script executions, or popups) when rendering untrusted content.
* **Why Interviewer Asks**: Explains dynamic sandboxing.
* **Common Mistakes**: Applying strict sandboxes to the main application context, which blocks core UI scripts.
* **Follow-up**: *Where is it useful?* In rendering user-provided HTML or attachments inside iframes.
* **Production Example**: Sandboxed document previews.

#### 15. How do you defend against brute-force attacks on API endpoints?
* **Answer**: We configure rate limiting to block IPs or accounts that exceed request thresholds, and use CAPTCHA validation for high-risk actions.
* **Why Interviewer Asks**: Tests resource safety controls.
* **Common Mistakes**: Setting low rate limits on all endpoints, which blocks legitimate API integrations.
* **Follow-up**: *What status is returned?* `429 Too Many Requests`.
* **Production Example**: Rate limiting login routes.

#### 16. What is the danger of leaving default credentials in database configurations?
* **Answer**: Attackers scan public networks for standard database ports and try default credentials, easily gaining full database access.
* **Why Interviewer Asks**: Basic security hygiene check.
* **Common Mistakes**: Committing default credentials to public configurations.
* **Follow-up**: *How do you secure database ports?* By restricting database access to the internal network.
* **Production Example**: Secure production database configurations.

#### 17. How do you design an API to handle GDPR delete requests ("right to be forgotten")?
* **Answer**: We execute cascade deletes to wipe user records from all active tables, anonymize audit histories (removing usernames from logs), and ensure backups are eventually purged.
* **Why Interviewer Asks**: Tests data privacy compliance designs.
* **Common Mistakes**: Keeping user IDs in backups or logs forever without anonymization.
* **Follow-up**: *How do we retain audit logs?* By replacing the user's name with an anonymous string (e.g. `Deleted User`).
* **Production Example**: Compliance deletion flows.

#### 18. What is the difference between asymmetric and symmetric encryption?
* **Answer**: Symmetric encryption uses a single key to encrypt and decrypt (e.g. AES). Asymmetric encryption uses a public key to encrypt and a private key to decrypt (e.g. RSA).
* **Why Interviewer Asks**: Clarifies encryption paradigms.
* **Common Mistakes**: Using asymmetric encryption for large datasets (it is too slow; symmetric is preferred).
* **Follow-up**: *What do we use to encrypt 2FA secrets?* Symmetric AES encryption.
* **Production Example**: Secure data encryption.

#### 19. How do you protect against Clickjacking attacks?
* **Answer**: We set the `X-Frame-Options: DENY` response header to prevent the browser from rendering the page inside iframes on other domains.
* **Why Interviewer Asks**: Basic browser click interception check.
* **Common Mistakes**: Relying on frame-busting scripts, which can be bypassed.
* **Follow-up**: *What CSP directive replaces X-Frame-Options?* `frame-ancestors 'none'`.
* **Production Example**: Helmet headers configurations.

#### 20. What is a Zero-Day vulnerability?
* **Answer**: A security vulnerability in software that is unknown to the vendor, leaving zero days for mitigation before exploits occur.
* **Why Interviewer Asks**: Tests security awareness.
* **Common Mistakes**: Assuming platforms are completely secure because they are updated.
* **Follow-up**: *How do we mitigate zero-day risks?* By implementing defense-in-depth principles: layering security controls so that if one layer fails, other layers protect the system.
* **Production Example**: Layered security architectures.

---

### Hard (20)

#### 1. How would you design a cryptographically secure, multi-tenant RBAC engine in PostgreSQL using Row-Level Security (RLS)?
* **Detailed Answer**:
  1. We enable RLS on tenant tables: `ALTER TABLE Project ENABLE ROW LEVEL SECURITY;`.
  2. We create an RLS policy that restricts access based on a session variable:
     ```sql
     CREATE POLICY tenant_isolation_policy ON Project
     USING (workspaceId = current_setting('app.current_workspace_id', true));
     ```
  3. During database connections, the application sets the context parameters:
     ```sql
     SET LOCAL app.current_workspace_id = 'target-workspace-uuid';
     ```
  4. PostgreSQL filters results automatically; queries failing to pass filters return zero rows.
* **Deep Explanation**: RLS enforces security at the database engine level, protecting data even if developers forget to append workspace filters in application code.
* **Alternative Approach**: App-level filter validation.
  * *Pros*: Simple setup, database engine agnostic.
  * *Cons*: Vulnerable to developer omissions; missing a filter leaks data across tenants.
* **Production Example**: Enterprise SaaS database designs.
* **Cross Questions**: *Does RLS apply to database administrators?* By default no; we must configure policies to apply to all roles.

#### 2. How do you prevent Privilege Escalation attacks in GraphQL APIs where clients can query nested relation paths?
* **Detailed Answer**: 
  1. We enforce authorization checks at the **Resolver level** rather than the route entry.
  2. Implement **Query Depth Limiting** to prevent attackers from submitting deeply nested queries that exhaust server resources.
  3. Validate permissions for each nested node resolved. If a query requests `User -> Workspaces -> Projects -> Tasks`, the resolver verifies permissions at each relation layer.
* **Deep Explanation**: In REST, routes represent specific permission scopes. GraphQL uses a single endpoint, allowing users to traverse relations and bypass route-level security checks if resolvers lack validation.
* **Alternative Approach**: Flat schemas.
  * *Pros*: Simple access control.
  * *Cons*: Bypasses GraphQL's core benefit of querying nested relation structures.
* **Production Example**: GraphQL security configurations in enterprise platforms.
* **Cross Questions**: *What library enforces query depth limits?* `graphql-depth-limit`.

#### 3. How do you defend against JWT Key Confusion (Signature Validation Bypass) attacks?
* **Detailed Answer**: This exploit occurs when an API supports both symmetric (HS256) and asymmetric (RS256) algorithms.
  1. The API uses RS256: signing with a private key, verifying with a public key.
  2. The attacker grabs the public key, signs a modified JWT using HS256 (symmetric), and submits it.
  3. If the server library validates the signature using the public key as the secret key, signature checks pass.
  4. We prevent this by enforcing a strict whitelist of allowed algorithms in verification options: `jwt.verify(token, publicKey, { algorithms: ['RS256'] })`.
* **Deep Explanation**: Whitelisting algorithms ensures the validation library rejects HS256 tokens when RS256 is expected, protecting against key confusion.
* **Alternative Approach**: Disabling support for public-key validation entirely.
  * *Pros*: Simple,HS256 only.
  * *Cons*: Limits support for third-party integrations (like Google OAuth).
* **Production Example**: Secure JWT validation configurations.
* **Cross Questions**: *What is the difference between HS256 and RS256?* HS256 uses a shared secret; RS256 uses public/private key pairs.

#### 4. How would you design a secure session revocation architecture that scales to millions of active users with <1ms latency?
* **Detailed Answer**: We use a **bloom filter** or **Redis memory blacklist**.
  1. Access tokens are short-lived (e.g. 15 mins) and contain a unique ID (`jti`).
  2. When a user logs out, we add their token's `jti` to a Redis blacklist with a TTL matching the token's remaining expiry.
  3. The auth middleware checks Redis (`EXISTS blacklist:jti`) during request validation.
  4. If the key exists, the token is rejected.
* **Deep Explanation**: In-memory Redis lookups are fast (<1ms). Blacklisting revoked tokens keeps the cache size small, as we only store keys during their remaining validity window.
* **Alternative Approach**: Database session tables checking.
  * *Pros*: Simple relational validation.
  * *Cons*: Adds database write and read overhead, degrading throughput.
* **Production Example**: Session registries in large SaaS systems.
* **Cross Questions**: *How do you handle Redis cluster node drops?* By configuring fail-open policies with short-lived tokens to minimize compromise risks.

#### 5. How would you implement rate limiting for 2FA verification attempts to protect against brute-force attacks on the 6-digit TOTP code?
* **Detailed Answer**: A 6-digit TOTP token has only 1,000,000 combinations. Attackers can brute-force this within 30 seconds if rate limiting is missing. We implement a **sliding window rate limiter** on the `/auth/verify-2fa` endpoint. If a user inputs 3 incorrect codes within 5 minutes, we block subsequent verification attempts for 1 hour.
* **Deep Explanation**: Rate limiting is tracked by `userId` rather than IP address, preventing attackers from using distributed botnets to bypass IP-based rate limits.
* **Alternative Approach**: Temporary account lockouts.
  * *Pros*: Blocks brute-force attacks.
  * *Cons*: Vulnerable to denial-of-service, as attackers can lock out legitimate users by submitting incorrect codes.
* **Production Example**: Lockout systems in banking platforms.
* **Cross Questions**: *How do you prevent lockouts from being abused?* By requiring CAPTCHA verification after the first incorrect attempt before locking the account.

#### 6. What is the threat of XML External Entity (XXE) exploits?
* **Answer**: XXE attacks exploit vulnerabilities in XML parsers that allow loading external system files or executing internal port scans. We protect against this by disabling DTD processing in our XML parser configuration.
* **Why Interviewer Asks**: Essential security vulnerability check.
* **Common Mistakes**: Parsing XML payloads using default configurations.
* **Follow-up**: *What is a billion laughs attack?* A Denial of Service attack targeting XML parsers using nested entity expansion.
* **Production Example**: Secure XML parser configurations.

#### 7. How do you protect against CSRF attacks in APIs that use cookies for session tracking?
* **Answer**: We configure session cookies with attributes: `SameSite=Strict`, `Secure`, and `HttpOnly`. We also implement anti-CSRF token verification, requiring clients to pass a unique token header that matches the session value.
* **Why Interviewer Asks**: Essential cookie security design.
* **Common Mistakes**: Leaving SameSite at default (`None`), which allows cross-site requests to send cookies.
* **Follow-up**: *What does Secure do?* Restricts cookie transmission to encrypted HTTPS connections.
* **Production Example**: Anti-CSRF configurations.

#### 8. What is the danger of using wildcard origins in CORS with credentials?
* **Answer**: Setting `Access-Control-Allow-Origin: *` with credentials allowed allows any domain to read user data, enabling data theft. Browsers block this configuration for security.
* **Why Interviewer Asks**: CORS credentials checks.
* **Common Mistakes**: Recommending wildcard origin configurations.
* **Follow-up**: *What should you do instead?* Dynamic origin verification using whitelists.
* **Production Example**: Secure CORS setups.

#### 9. How do you implement input validation using schemas to prevent SQL injection in raw SQL queries?
* **Answer**: We use validation schemas (like Zod) to enforce strict types (e.g. integer or UUID format) on input parameters before executing queries. This prevents attackers from submitting SQL syntax strings.
* **Why Interviewer Asks**: Input safety checks.
* **Common Mistakes**: Passing parameters directly to raw queries without checks.
* **Follow-up**: *What is the preferred option?* Parameterized queries.
* **Production Example**: Input validation schemas.

#### 10. How does the application prevent account enumeration?
* **Answer**: By returning generic responses during auth processes (e.g., returning "If the email is registered, a password reset link has been sent" for reset requests), preventing attackers from validating registered emails.
* **Why Interviewer Asks**: Protects user privacy.
* **Common Mistakes**: Returning "User not found" messages on public reset endpoints.
* **Follow-up**: *What status is returned?* `200 OK` on both success and failure paths.
* **Production Example**: Secure recovery flows.

#### 11. What is the risk of utilizing asymmetric cryptography (RS256) key rotation?
* **Answer**: If an attacker compromises the key server, they can upload malicious public keys to the JWKS endpoint, tricking our API into validating fake tokens. We secure this by implementing key signature checks, SSL validation, and caching trusted certificates.
* **Why Interviewer Asks**: Tests security key distribution resilience.
* **Common Mistakes**: Downloading JWK keys from untrusted URLs.
* **Follow-up**: *How do you cache keys?* Using memory stores with a TTL of 24 hours.
* **Production Example**: Verifying JWKS endpoints in auth controllers.

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

#### 16. What is a key confusion attack?
* **Answer**: An exploit where an attacker signs a JWT using a symmetric algorithm (HS256) but signs it with the server's public key (asymmetric). If the server-side library accepts HS256 signed using public keys as secrets, signature verification passes.
* **Why Interviewer Asks**: Advanced JWT exploit check.
* **Common Mistakes**: Accepting any algorithm header passed by the client.
* **Follow-up**: *How do you prevent it?* By enforcing a strict whitelist of allowed algorithms.
* **Production Example**: Secure JWT validation options.

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

### Why did you select Google OAuth instead of building custom credentials?
* **Answer**: Google OAuth offloads password management and verification complexity to Google's secure infrastructure. It provides a faster, one-click login experience for users and leverages Google's advanced security checks.

### How did you test security constraints in integration tests?
* **Answer**: We wrote security-specific test cases that attempt to bypass permissions (e.g. Viewer attempting deletions) or submit invalid domains to whitelists, asserting that the API blocks the requests and returns correct security status codes (like `403` or `400`).

---

## 9. Code Review Questions

### What happens if the `cors` whitelist is empty in environment variables?
* **Answer**: The server fails to boot or defaults to a secure, deny-all state. This prevents the API from running in insecure fallback states.

### Why do you split the email domain check in the invitation controller?
* **Answer**: To isolate the domain string (e.g. `company.com`) from the email address. This allows comparing it against the whitelisted array values, blocking invitations for domains that are not whitelisted.

---

## 10. Production Readiness

### Helmet Integration
* Enforce Helmet response headers globally in `app.ts` to secure clients.

### SSL enforcement
* Configure HSTS and secure cookies to ensure session credentials are only transmitted over encrypted connections.

---

## 11. Common Mistakes

* **Wildcard CORS in production**: Using `Access-Control-Allow-Origin: *` on authenticated routes.
* **Client-Only validation checks**: Relying on frontend layouts to enforce security boundaries.
* **Exposing raw stack traces**: Returning detailed system error codes to public API clients.

---

## 12. Cheat Sheet

* **Helmet Headers**: Set frame-options, nosniff, and CSP parameters.
* **Secure Cookies**: Enforce `HttpOnly`, `Secure`, and `SameSite=Strict` attributes.
* **Domain check**: Extract and compare email domains against whitelisted configurations.

---

## 13. Mock Interview

### 1. What happens if a user submits an email injection payload to input forms?
* **Interviewer Expectations**: Input validation checks.
* **Ideal Answer**: The Zod validator blocks the request and returns `400 Bad Request` because the email does not match standard email patterns.

### 2. Can you bypass CORS validation by making direct API calls?
* **Interviewer Expectations**: CORS limitations.
* **Ideal Answer**: Yes, CORS is a browser security feature. Non-browser clients (like curl or Postman) can bypass CORS checks. We enforce rate limits and API keys to protect against non-browser attacks.

### 3. How do you implement passwords rotation policies?
* **Interviewer Expectations**: Password safety controls.
* **Ideal Answer**: We record password modification dates in the user table, and prompt users to update passwords if their age exceeds the rotation threshold (e.g. 90 days).

---

## 14. Summary

1. TaskFlow enforces security at routes, controllers, and database layers.
2. CORS whitelists block unauthorized cross-origin requests.
3. Helmet configures secure HTTP response headers to protect clients.
4. Input validators block malformed payloads before database queries.
5. Parameterized SQL queries prevent SQL injection.
6. Rate limiters protect server resources from DoS.
7. Short-lived access tokens minimize compromise windows.
8. Domain whitelists restrict workspace invite domains.
9. Modifying domain whitelists revokes pending invalid invites.
10. Secure cookies protect session tokens from XSS and CSRF.
