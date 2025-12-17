# Database-Based Brand Configuration Setup

## Overview
Brand configurations are now stored in Supabase database instead of hardcoded in the code. This allows updating brand data without rebuilding the application.

## Database Schema

### `brands` Table
```sql
- id: UUID (primary key)
- domain: TEXT (unique, not null) - e.g., 'dental.bio', 'doctors.bio'
- brand_name: TEXT (not null) - Display name, e.g., 'Dentalbio'
- logo_path: TEXT (not null) - Path to logo file, e.g., '/logo.svg'
- email_from: TEXT (not null) - Email sender display name
- base_url: TEXT (not null) - Full URL, e.g., 'https://dental.bio'
- tagline: TEXT (optional) - Brand tagline
- ga_tracking_id: TEXT (optional) - Google Analytics tracking ID
- is_active: BOOLEAN (default: true) - Enable/disable brand
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

## Migration

Run the migration file:
```bash
supabase db push
```

Or manually execute `supabase/migrations/20240102000000_create_brands_table.sql` in Supabase SQL Editor.

## Default Brands

The migration automatically inserts:
- **biocloud** (default fallback)
- **dental.bio**
- **doctors.bio**
- **injector.bio**
- **pharmacists.bio**

## How It Works

### Server-Side (`utils/domainConfig.ts`)
- Fetches brands from Supabase database
- Implements 5-minute in-memory cache for performance
- Falls back to **biocloud** if domain not found
- All functions are now `async`

### Client-Side (`utils/domainConfig.client.ts`)
- Separate client-side utility for React components
- Uses Supabase client
- Same caching mechanism
- Falls back to **biocloud** if domain not found

### Caching
- Brands are cached in memory for 5 minutes
- Cache is shared across requests (server-side)
- Cache automatically refreshes after TTL expires
- Call `invalidateBrandsCache()` to force refresh

## Usage Examples

### Server-Side (API Routes, Server Components)
```typescript
import { getDomainConfig } from '@/utils/domainConfig';

// In API route or server component
const domainConfig = await getDomainConfig(request.headers);
console.log(domainConfig.brandName); // e.g., "Dentalbio"
console.log(domainConfig.logoPath); // e.g., "/logo.svg"
```

### Client-Side (React Components)
```typescript
import { useDomainConfig } from '@/utils/hooks/useDomainConfig';

function MyComponent() {
  const domainConfig = useDomainConfig();
  return <img src={domainConfig.logoPath} alt={domainConfig.brandName} />;
}
```

## Managing Brands

### Add New Brand
```sql
INSERT INTO public.brands (
  domain,
  brand_name,
  logo_path,
  email_from,
  base_url,
  tagline,
  ga_tracking_id,
  is_active
) VALUES (
  'newdomain.bio',
  'NewDomain.bio',
  '/logos/newdomain.svg',
  'NewDomain.bio',
  'https://newdomain.bio',
  'Your custom tagline.',
  'G-XXXXXXXXX',
  true
);
```

### Update Existing Brand
```sql
UPDATE public.brands
SET 
  brand_name = 'Updated Name',
  logo_path = '/new-logo.svg',
  tagline = 'New tagline'
WHERE domain = 'dental.bio';
```

### Disable Brand
```sql
UPDATE public.brands
SET is_active = false
WHERE domain = 'olddomain.bio';
```

### Invalidate Cache (After Updates)
If you update brands via API or admin panel, call:
```typescript
import { invalidateBrandsCache } from '@/utils/domainConfig';
invalidateBrandsCache();
```

## Fallback Behavior

- If domain not found in database → uses **biocloud** configuration
- If database query fails → uses cached data if available
- If no cache available → uses **biocloud** default
- All fallbacks ensure the app never breaks

## Benefits

1. ✅ **No Rebuild Required** - Update brands via database
2. ✅ **Dynamic Configuration** - Add/remove brands without code changes
3. ✅ **Performance** - 5-minute cache reduces database queries
4. ✅ **Reliability** - Multiple fallback layers ensure app always works
5. ✅ **Admin-Friendly** - Can build admin panel to manage brands

## Admin Panel Integration

You can create an admin panel to manage brands:

```typescript
// Example: Update brand via API
export async function PUT(req: Request) {
  const { domain, brand_name, logo_path, ... } = await req.json();
  
  const supabase = createClient();
  const { error } = await supabase
    .from('brands')
    .update({ brand_name, logo_path, ... })
    .eq('domain', domain);
  
  if (!error) {
    invalidateBrandsCache(); // Force cache refresh
  }
  
  return NextResponse.json({ success: !error });
}
```

## Testing

1. Run migration in Supabase
2. Verify brands are inserted correctly
3. Test each domain to ensure correct branding
4. Test fallback to biocloud for unknown domains
5. Update a brand in database and verify cache refresh (wait 5 min or call invalidate)

## Notes

- **biocloud** is the default fallback (not dental.bio)
- All email addresses still use biocloud.com domain
- Cache TTL is 5 minutes (adjustable in code)
- Row Level Security allows public read access
- Only authenticated users can modify brands

