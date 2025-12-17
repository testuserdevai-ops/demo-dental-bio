# Email Configuration Update

## Summary
All emails are now configured to be sent from and received at **biocloud.com**, regardless of which domain the user visits. Email content still uses domain-specific branding (logo, brand name, tagline, URLs).

## Changes Made

### 1. Email Address Configuration
- **Created `EMAIL_CONFIG` constant** in `utils/domainConfig.ts`:
  - `from: 'noreply@biocloud.com'`
  - `support: 'support@biocloud.com'`
  - `contact: 'hello@biocloud.com'`

### 2. Updated Email Functions

#### `utils/mails/sendTemplateEmails.ts`
- ✅ `sendTemplateEmail()` now accepts optional `domainConfig` parameter
- ✅ Uses `EMAIL_CONFIG.from` for sender address
- ✅ Uses domain-specific branding (brand name, logo, tagline, base URL) in email content
- ✅ Email footer shows domain-specific brand name and tagline
- ✅ All links use domain-specific base URL

#### `app/api/send/route.ts`
- ✅ Gets domain config from request headers
- ✅ Passes domain config to email functions
- ✅ Welcome emails use domain-specific branding
- ✅ Referral emails use domain-specific branding

#### `utils/mails/sendReportEmail.ts`
- ✅ All admin/report emails use `Biocloud <noreply@biocloud.com>`
- ✅ Internal notifications sent from biocloud.com

#### `app/api/send/trial-end-check/route.ts`
- ✅ Uses domain config (currently defaults to dental.bio)
- ⚠️ **TODO**: Should use user's registration domain if stored in database

### 3. UI Updates
- ✅ Footer contact link uses `mailto:hello@biocloud.com`

## Email Format

All emails now follow this pattern:
- **From:** `{BrandName} <noreply@biocloud.com>` (e.g., "Dentalbio <noreply@biocloud.com>")
- **Content:** Domain-specific branding (logo, brand name, tagline)
- **Links:** Domain-specific URLs (e.g., https://doctors.bio/upgrade)
- **Support:** support@biocloud.com

## Example Email Headers

For a user on `doctors.bio`:
```
From: Doctors.bio <noreply@biocloud.com>
Subject: Welcome to Doctors.bio! 🎉
```

For a user on `dental.bio`:
```
From: Dentalbio <noreply@biocloud.com>
Subject: Welcome to Dentalbio! 🎉
```

## Future Improvements

### Option 1: Store Registration Domain (Recommended)
Store the domain where the user registered in the `users` table:
```sql
ALTER TABLE users ADD COLUMN registration_domain TEXT;
```

Then update email functions to use the stored domain:
```typescript
const { data: user } = await supabase
  .from('users')
  .select('registration_domain')
  .eq('email', email)
  .single();

const domainConfig = getDomainConfigByHostname(user.registration_domain || 'dental.bio');
```

### Option 2: Pass Domain in Function Calls
Update all email function calls to pass domain config explicitly.

### Option 3: Use Default Domain
Continue using default domain (dental.bio) for emails sent outside of request context (like cron jobs).

## Testing Checklist

- [ ] Test welcome email from each domain
- [ ] Verify sender address is biocloud.com
- [ ] Verify email content shows correct brand name
- [ ] Verify links point to correct domain
- [ ] Test trial end notification emails
- [ ] Test plan change emails
- [ ] Verify admin/report emails use biocloud.com

## Notes

- All email addresses now use biocloud.com domain
- Email content is still personalized per domain (branding, URLs)
- Admin/internal emails always use "Biocloud" as sender name
- User-facing emails use domain-specific brand name as sender name

