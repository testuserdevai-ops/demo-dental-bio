# Multi-Domain Configuration Analysis

## Overview
Your Next.js app currently serves multiple domains (Dentalbio, doctors.bio, etc.) but uses hardcoded branding and domain-specific configurations. This document identifies all areas that need domain-specific updates.

## Areas Requiring Domain-Specific Configuration

### 1. **Logo/Branding Images**
**Files Affected:**
- `app/components/Navbar.tsx` - Line 17: `/logo.svg`
- `app/components/Footer.tsx` - Lines 17, 117: `/logo.svg`
- `app/dashboard/components/Footer.tsx` - Line 8: `/Dentalbio.svg`
- `app/dashboard/components/RightPanelClient.tsx` - Line 159: `/logo.svg`
- `app/[username]/components/Header.tsx` - Line 124: `/logo.svg`
- `app/[username]/components/Footer.tsx` - Line 71: `/logo.svg`

**Current Issue:** All domains use the same logo file.

**Solution:** Map each domain to its specific logo path (e.g., `/logos/doctorsbio.svg`, `/logos/injectorbio.svg`).

---

### 2. **Email Configuration**
**Files Affected:**
- `utils/mails/sendTemplateEmails.ts`:
  - Line 146: `from: "Dentalbio <noreply@biocloud.com>"`
  - Line 188: `href="https://dental.bio/login"`
  - Line 189: Logo URL hardcoded
  - Line 208: `href="https://dental.bio/login"`
  - Line 209: "Dentalbio" text
  - Line 212: "Your dental identity, simplified."
  - Line 216: "Dentalbio account" text
  - Line 128: `${process.env.APP_URL}/upgrade`
  - Line 134: `support@biocloud.com`
  - Line 102: `dental.bio/${username}`

- `app/api/send/route.ts`:
  - Line 90: "Dentalbio" in email title
  - Line 93: "Welcome to Dentalbio!"
  - Line 99: "Dentalbio username"
  - Line 102: `dental.bio/${username}`

- `app/components/Footer.tsx`:
  - Line 40: `mailto:hello@biocloud.com`

**Current Issue:** All emails use "Dentalbio" branding and dental.bio domain.

**Solution:** Use domain-specific email addresses, sender names, and branding text.

---

### 3. **Redirect URLs (Stripe & Veriff)**
**Files Affected:**
- `app/api/checkout/route.ts`:
  - Line 16: `APP_URL` environment variable
  - Lines 83-84: `success_url` and `cancel_url` use `APP_URL`

- `app/api/veriff/create-session/route.ts`:
  - Line 7: `NEXT_PUBLIC_BASE_URL` environment variable
  - Line 31: Callback URL uses `baseUrl`

- `app/api/veriff/callback/route.ts`:
  - Line 30: `VERIFF_CALLBACK_URL` environment variable

**Current Issue:** All domains use the same redirect URLs.

**Solution:** Use the current request's domain to construct redirect URLs dynamically.

---

### 4. **Metadata & SEO**
**Files Affected:**
- `app/layout.tsx`:
  - Line 74: `NEXT_PUBLIC_BASE_URL || "https://dental.bio"`
  - Line 49: Default title mentions "Dentalbio"
  - Line 52: Default description mentions "Dentalbio"

- `app/[username]/layout.tsx`:
  - Line 79: `NEXT_PUBLIC_BASE_URL || "https://dental.bio"`

**Current Issue:** All domains use the same base URL and metadata.

**Solution:** Detect current domain and use domain-specific metadata.

---

### 5. **Text Content**
**Files Affected:**
- `app/[username]/components/Footer.tsx`:
  - Line 78: "Join {title} on Dentalbio"

- `app/dashboard/components/RightPanelClient.tsx`:
  - Line 152: "Hide/Show Dentalbio logo"
  - Line 86: "Upgrade your plan to hide the Dentalbio logo"

**Current Issue:** Hardcoded "Dentalbio" text in UI.

**Solution:** Use domain-specific brand name.

---

### 6. **Google Analytics**
**Files Affected:**
- `app/layout.tsx`:
  - Line 92: `ga_id={"G-987STTWJ02"}`

**Current Issue:** All domains use the same GA tracking ID.

**Solution:** Use domain-specific GA tracking IDs (optional, but recommended for separate analytics).

---

## Recommended Solution Architecture

### Option 1: Environment-Based Configuration (Recommended for 7 domains)
Create a domain configuration mapping system:

1. **Create a domain configuration utility** (`utils/domainConfig.ts`)
   - Maps hostname to brand configuration
   - Returns logo path, brand name, email addresses, etc.

2. **Update all hardcoded references** to use the utility

3. **Store configurations** in environment variables or a config file

### Option 2: Database-Based Configuration (Scalable)
Store domain configurations in Supabase:
- Create a `domains` table with columns: domain, logo_path, brand_name, email_from, support_email, etc.
- Query on each request to get domain-specific config

### Option 3: Hybrid Approach (Best for Production)
- Use environment variables for core domains
- Fallback to database for dynamic additions
- Cache configurations for performance

---

## Implementation Priority

### High Priority (Core Functionality)
1. ✅ Logo paths - User-facing branding
2. ✅ Redirect URLs - Stripe/Veriff must work correctly
3. ✅ Email branding - Professional appearance

### Medium Priority (User Experience)
4. ✅ Metadata/SEO - Domain-specific titles
5. ✅ Text content - Brand consistency

### Low Priority (Analytics)
6. ⚠️ Google Analytics - Separate tracking (optional)

---

## Next Steps
1. Choose implementation approach (recommend Option 1 for simplicity)
2. Create domain configuration utility
3. Update all identified files
4. Test with multiple domains
5. Update environment variables in Vercel

