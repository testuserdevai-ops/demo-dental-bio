# Multi-Domain Implementation Guide

## Overview
This guide explains how the multi-domain configuration system works and how to add new domains.

## Architecture

### Core Components

1. **`utils/domainConfig.ts`** - Domain configuration mapping
   - Maps hostnames to brand configurations
   - Provides server-side utilities to get domain config from headers

2. **`utils/hooks/useDomainConfig.ts`** - Client-side hook
   - React hook for client components to access domain config
   - Uses `window.location.hostname` to detect domain

### How It Works

1. **Server-Side (API Routes, Server Components)**
   - Uses `getDomainConfig(headers)` to extract domain from request headers
   - Automatically detects hostname from `host` or `x-forwarded-host` headers

2. **Client-Side (React Components)**
   - Uses `useDomainConfig()` hook
   - Automatically detects domain from `window.location.hostname`

## Adding a New Domain

### Step 1: Add Domain Configuration

Edit `utils/domainConfig.ts` and add your domain to the `DOMAIN_CONFIGS` object:

```typescript
'newdomain.bio': {
  brandName: 'NewDomain.bio',
  logoPath: '/logos/newdomain.svg',
  emailFrom: 'NewDomain.bio <noreply@newdomain.bio>',
  supportEmail: 'support@newdomain.bio',
  contactEmail: 'hello@newdomain.bio',
  baseUrl: 'https://newdomain.bio',
  tagline: 'Your custom tagline here.',
  gaTrackingId: 'G-XXXXXXXXX', // Optional
},
```

### Step 2: Add Logo File

Place your logo file in `public/logos/newdomain.svg` (or update the path in config).

### Step 3: Configure Email Domain (Optional)

If you want domain-specific email addresses, you'll need to:
1. Set up email domain with Resend (or your email provider)
2. Verify the domain
3. Update the `emailFrom` field in the config

### Step 4: Update Vercel Environment Variables

For each domain, you may want to set domain-specific environment variables in Vercel:
- `NEXT_PUBLIC_BASE_URL` (optional, will auto-detect from headers)
- Domain-specific API keys if needed

## Files Updated

### ✅ API Routes (Server-Side)
- `app/api/checkout/route.ts` - Stripe redirect URLs
- `app/api/veriff/create-session/route.ts` - Veriff callback URLs
- `app/api/veriff/callback/route.ts` - Veriff redirect URLs

### ✅ Layouts (Server-Side)
- `app/layout.tsx` - Metadata and Google Analytics
- `app/[username]/layout.tsx` - User profile metadata

### ✅ UI Components (Client-Side)
- `app/components/Navbar.tsx` - Logo
- `app/components/Footer.tsx` - Logo and contact email
- `app/dashboard/components/Footer.tsx` - Logo
- `app/dashboard/components/RightPanelClient.tsx` - Logo and brand name
- `app/[username]/components/Header.tsx` - Logo
- `app/[username]/components/Footer.tsx` - Logo and brand name

## Email Templates (TODO)

Email templates in `utils/mails/sendTemplateEmails.ts` still need to be updated. Options:

### Option A: Pass Domain Config to Email Functions
Modify email functions to accept domain config as a parameter:

```typescript
export const sendTemplateEmail = async (
  params: EmailType,
  domainConfig?: DomainConfig
) => {
  const config = domainConfig || getDomainConfigByHostname('dental.bio');
  // Use config.emailFrom, config.baseUrl, etc.
}
```

### Option B: Store Domain in User Record
When users register, store their registration domain in the database, then use it when sending emails.

### Option C: Use Default Domain for Emails
Keep emails using the default domain (dental.bio) for all users.

**Recommendation:** Use Option B for best user experience - store the domain when users register.

## Testing

1. **Local Testing:**
   - Update your `/etc/hosts` file to map domains to localhost
   - Or use a tool like `localtest.me` which resolves to localhost

2. **Production Testing:**
   - Visit each domain and verify:
     - Logo displays correctly
     - Links use correct domain
     - Email addresses are correct (if configured)
     - Redirect URLs work (Stripe, Veriff)

## Configuration Properties

Each domain configuration includes:

- `brandName`: Display name (e.g., "Dentalbio", "Doctors.bio")
- `logoPath`: Path to logo file in `/public` directory
- `emailFrom`: Email sender address and name
- `supportEmail`: Support contact email
- `contactEmail`: General contact email
- `baseUrl`: Full URL for the domain (https://domain.com)
- `tagline`: Optional brand tagline
- `gaTrackingId`: Optional Google Analytics tracking ID

## Fallback Behavior

If a domain is not found in the configuration:
- System falls back to `dental.bio` configuration
- Warning is logged to console (server-side only)
- This ensures the app always works, even with unconfigured domains

## Performance Considerations

- Domain detection is lightweight (simple object lookup)
- No database queries required
- Configuration is loaded at build time
- Client-side hook uses `useState` and `useEffect` for minimal re-renders

## Security Notes

- Domain detection relies on HTTP headers (`host` or `x-forwarded-host`)
- Vercel automatically sets these headers correctly
- For custom deployments, ensure reverse proxy sets headers correctly
- Never trust client-side domain detection for security-sensitive operations

## Next Steps

1. ✅ Core domain configuration system - **COMPLETE**
2. ✅ UI components updated - **COMPLETE**
3. ✅ API routes updated - **COMPLETE**
4. ⚠️ Email templates - **NEEDS UPDATE** (see Email Templates section above)
5. ⚠️ Add remaining 4 domains to configuration
6. ⚠️ Test with all domains
7. ⚠️ Configure email domains in Resend (if using domain-specific emails)

