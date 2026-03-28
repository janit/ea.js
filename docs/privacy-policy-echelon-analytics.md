# Privacy Policy Template — Echelon Analytics

> **Instructions**: Replace all `[bracketed placeholders]` with your values.
> Delete sections that don't apply to your deployment. This template covers the
> full Echelon Analytics feature set — most deployments won't use everything.

---

## Privacy Policy

**Last updated**: [DATE]

[YOUR COMPANY/PROJECT NAME] ("we", "us", "our") operates [YOUR WEBSITE URL]
(the "Service"). This policy describes what data we collect, why we collect it,
how we process it, and your rights regarding that data.

### 1. Data We Collect

#### 1.1 Analytics Data (Collected Automatically)

When you visit our Service, we collect anonymous usage data to understand how
people use the site and to improve the experience. This data **cannot identify
you personally**.

| Data | Purpose | Example |
|------|---------|---------|
| Pages visited | Understand popular content | `/helsinki/tampere` |
| Device type | Optimize for mobile/desktop | `mobile`, `desktop` |
| Screen resolution | Responsive design testing | `375x812` |
| Operating system | Browser compatibility | `iOS`, `Android` |
| Country | Regional content relevance | `FI`, `US` |
| Referrer origin | Understand traffic sources | `google.com` |
| Interaction time | Measure engagement quality | `4200ms` |
| Anonymous visitor ID | Distinguish unique visits | Random 16-character code |

**What we do NOT collect:**

- Your name, email address, or any account information
- Your IP address (we only use it transiently for rate limiting — it is never
  stored in our database)
- Precise geolocation (country is derived from CDN headers, not GPS)
- Browser fingerprints
- Cross-site tracking data
- Keystrokes, form inputs, or page content you view

#### 1.2 Behavioral Events

We record anonymous interactions such as route calculations, map interactions,
and feature usage. Each event records:

- The type of action (e.g., "route calculated", "search performed")
- Contextual data about the action (e.g., search query, distance calculated)
- The anonymous visitor ID and session ID
- Device type and country

These events help us understand which features are useful and where users
encounter friction.

[DELETE IF NOT APPLICABLE]

#### 1.3 Feedback Data

If you voluntarily submit feedback (e.g., via a satisfaction survey), we collect:

- Your numeric rating
- Your written feedback (free text)
- Your anonymous visitor ID and device/country context

We automatically strip any personal information you may accidentally include in
feedback text — email addresses, phone numbers, and URLs are masked before
storage.

[DELETE IF NOT APPLICABLE]

#### 1.4 Bot Detection

To protect the Service from automated abuse, we score each request using
behavioral signals such as interaction timing, request frequency, and header
presence. This scoring:

- Uses a one-way hash of your IP address that rotates every 24 hours
- Does not store your IP address
- Does not affect legitimate users — it only throttles automated traffic

### 2. Cookies

We use the following cookies:

| Cookie | Purpose | Duration | Type |
|--------|---------|----------|------|
| `_ev` | Anonymous visitor ID (random hex) | 30 days | HttpOnly, Secure, SameSite=None, Partitioned |

This cookie is **strictly functional** — it contains a random 16-character
identifier that cannot be linked to your identity. We do not use advertising
cookies, tracking pixels, or third-party cookie-syncing services.

Session data is stored in your browser's sessionStorage and is automatically
cleared when you close the tab.

### 3. Third-Party Data Sharing

[CHOOSE ONE OF THE FOLLOWING OPTIONS]

**Option A — GA4 enabled:**

We forward anonymous analytics data to Google Analytics 4 (GA4) for aggregated
reporting. Before forwarding:

- Your IP address is masked (last segment zeroed)
- Only anonymous identifiers are sent (no personal data)
- Requests identified as bots are excluded

Google's privacy policy applies to data they receive:
https://policies.google.com/privacy

We do not share data with any other third parties.

**Option B — No third-party sharing:**

We do not share your data with any third parties. All analytics data is
processed and stored on our own infrastructure.

[DELETE THE OPTION YOU DON'T USE]

### 4. Data Storage and Security

- Analytics data is stored in an SQLite database on servers located in
  [COUNTRY/REGION]
- Data is transmitted over HTTPS (TLS encryption in transit)
- Database access is restricted to authenticated application processes
- Administrative access requires authentication and is rate-limited
- [We use Cloudflare as a CDN, which processes requests in accordance with their
  privacy policy: https://www.cloudflare.com/privacypolicy/]

### 5. Data Retention

| Data type | Retention period |
|-----------|-----------------|
| Page view counts | [Indefinite / X months] |
| Visitor view records | [X months / X years] |
| Behavioral events | [X months / X years] |
| Session summaries | [X months / X years] |
| Feedback responses | [X months / X years] |
| Bot detection hashes | 5 minutes (in memory only) |

[ADJUST RETENTION PERIODS TO MATCH YOUR ACTUAL POLICY]

### 6. Your Rights

Depending on your jurisdiction, you may have the following rights:

**Under GDPR (EU/EEA residents):**

- **Right to access** — Request a copy of data associated with your anonymous
  visitor ID
- **Right to erasure** — Request deletion of data associated with your anonymous
  visitor ID
- **Right to object** — Object to processing of your data
- **Right to restriction** — Request that we limit how we process your data
- **Right to data portability** — Receive your data in a machine-readable format

Since we collect only anonymous data with no account system, exercising these
rights requires you to provide your anonymous visitor ID (found in the `_ev`
cookie in your browser's developer tools).

**Under CCPA (California residents):**

- You have the right to know what data we collect (described above)
- You have the right to request deletion of your data
- We do not sell personal information

**Under NDPA 2023 (Nigerian residents):**

- You have the right to access, rectify, and delete your data
- You have the right to object to data processing
- We process data based on legitimate interest (anonymous analytics)

**To exercise any of these rights**, contact us at [CONTACT EMAIL].

### 7. Legal Basis for Processing (GDPR)

We process anonymous analytics data under **legitimate interest** (Article
6(1)(f) GDPR). Our legitimate interest is understanding how the Service is used
so we can improve it. We have assessed that this processing does not override
your rights because:

- All data is anonymous — it cannot identify you
- No sensitive personal data is processed
- You can clear the visitor cookie at any time
- The processing has minimal impact on your privacy

[IF YOU USE CONSENT-BASED PROCESSING INSTEAD, REPLACE THIS SECTION]

### 8. Children's Privacy

We do not knowingly collect data from children under 13 (or under 16 in the
EU). The Service is not directed at children. If you believe a child has
provided us with personal data, contact us at [CONTACT EMAIL].

### 9. International Data Transfers

[CHOOSE ONE]

**Option A**: Our servers are located in [COUNTRY]. If you access the Service
from outside [COUNTRY], your anonymous analytics data will be transferred to and
processed in [COUNTRY]. [For EU residents: we rely on Standard Contractual
Clauses / adequacy decisions / other mechanism for this transfer.]

**Option B**: We use Cloudflare as a CDN, which may process your request in any
of their global data centers. The analytics data itself is stored on servers in
[COUNTRY].

[DELETE THE OPTION YOU DON'T USE]

### 10. Changes to This Policy

We may update this policy from time to time. We will notify you of significant
changes by [posting a notice on the Service / updating the "Last updated" date].
Continued use of the Service after changes constitutes acceptance.

### 11. Contact

For privacy-related questions or to exercise your rights:

- Email: [CONTACT EMAIL]
- [Optional: postal address]
- [Optional: data protection officer contact]

---

> **Template version**: 1.0
> **Covers**: Echelon Analytics — beacon tracking, semantic events, visitor
> views, page views, bot scoring, session aggregation, A/B experiment
> tracking, UTM campaign tracking.
