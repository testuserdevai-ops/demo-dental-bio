# Database-Based Brand Configuration - Migration Summary

## ✅ Completed Changes

### 1. Database Migration
- ✅ Created `supabase/migrations/20240102000000_create_brands_table.sql`
- ✅ Creates `brands` table with all brand configuration fields
- ✅ Sets up Row Level Security (public read, authenticated write)
- ✅ Inserts default brands including **biocloud** as fallback
- ✅ Creates indexes for performance
- ✅ Auto-updates `updated_at` timestamp

### 2. Server-Side Updates (`utils/domainConfig.ts`)
- ✅ Removed hardcoded brand configurations
- ✅ Added Supabase database fetching with 5-minute cache
- ✅ Changed all functions to `async`
- ✅ **biocloud** is now the default fallback (not dental.bio)
- ✅ Added `invalidateBrandsCache()` function for cache management

### 3. Client-Side Updates
- ✅ Created `utils/domainConfig.client.ts` for client-side brand fetching
- ✅ Updated `utils/hooks/useDomainConfig.ts` to use database
- ✅ Maintains same caching mechanism on client-side

### 4. API Routes Updated
All API routes now `await` the async `getDomainConfig`:
- ✅ `app/api/checkout/route.ts`
- ✅ `app/api/veriff/create-session/route.ts`
- ✅ `app/api/veriff/callback/route.ts`
- ✅ `app/api/send/route.ts`
- ✅ `app/api/send/trial-end-check/route.ts`

### 5. Email Functions Updated
- ✅ `utils/mails/sendTemplateEmails.ts` - Updated to use biocloud as default
- ✅ All email functions now await async brand fetching

## Default Brand: Biocloud

**Important:** The default fallback brand is now **biocloud** (not dental.bio). This means:
- Unknown domains → use biocloud configuration
- Database errors → use biocloud configuration
- Missing brands → use biocloud configuration

## Next Steps

### 1. Run Migration
```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase SQL Editor
# Execute: supabase/migrations/20240102000000_create_brands_table.sql
```

### 2. Verify Brands in Database
Check that brands were inserted:
```sql
SELECT * FROM public.brands WHERE is_active = true;
```

You should see:
- biocloud (default)
- dental.bio
- doctors.bio
- injector.bio
- pharmacists.bio

### 3. Test Application
- Visit each domain and verify correct branding
- Test unknown domain → should show biocloud
- Update a brand in database → wait 5 min or call `invalidateBrandsCache()`

### 4. Add More Brands (Optional)
```sql
INSERT INTO public.brands (
  domain, brand_name, logo_path, email_from, base_url, tagline, is_active
) VALUES (
  'newdomain.bio',
  'NewDomain.bio',
  '/logos/newdomain.svg',
  'NewDomain.bio',
  'https://newdomain.bio',
  'Your tagline here.',
  true
);
```

## Benefits

1. ✅ **No Rebuild Required** - Update brands via Supabase dashboard
2. ✅ **Dynamic** - Add/remove brands without code deployment
3. ✅ **Cached** - 5-minute cache reduces database load
4. ✅ **Reliable** - Multiple fallback layers (cache → biocloud)
5. ✅ **Admin-Friendly** - Can build admin UI to manage brands

## Cache Management

The system caches brands for 5 minutes. To force refresh:

```typescript
import { invalidateBrandsCache } from '@/utils/domainConfig';
invalidateBrandsCache();
```

Call this after updating brands via admin panel or API.

## Database Schema

```sql
brands (
  id UUID PRIMARY KEY,
  domain TEXT UNIQUE NOT NULL,
  brand_name TEXT NOT NULL,
  logo_path TEXT NOT NULL,
  email_from TEXT NOT NULL,
  base_url TEXT NOT NULL,
  tagline TEXT,
  ga_tracking_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## Important Notes

- All email addresses still use **biocloud.com** domain
- Brand configurations are fetched from database with caching
- **biocloud** is the default fallback for all unknown domains
- Cache automatically refreshes after 5 minutes
- Row Level Security allows public read access

## Testing Checklist

- [ ] Run migration successfully
- [ ] Verify brands table exists
- [ ] Check biocloud brand is inserted
- [ ] Test each domain shows correct branding
- [ ] Test unknown domain shows biocloud
- [ ] Update brand in database
- [ ] Verify changes appear (after cache refresh)
- [ ] Test email functions use correct branding

