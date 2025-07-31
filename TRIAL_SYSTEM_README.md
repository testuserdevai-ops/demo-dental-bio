# Dentalbio Trial System Implementation

This document outlines the comprehensive trial system implementation for Dentalbio, including Stripe integration, referral bonuses, and student offers.

## Overview

The trial system provides different trial periods based on user registration type:
- **Standard Registration**: 3 months PRO trial
- **Student with Offer Code**: 6 months PRO trial  
- **Referral Registration**: +1 month bonus (4 months total for standard, 7 months for students)

## Key Features

### 1. Trial Period Calculation
- **Base Trial**: 3 months for standard users, 6 months for students with valid offer codes
- **Referral Bonus**: +1 month for both referrer and referred user
- **Stripe Integration**: Trial periods are properly set in Stripe subscriptions
- **Metadata Tracking**: Trial type and duration stored in Stripe subscription metadata

### 2. Email Notifications
- **Upgrade/Downgrade Emails**: Sent when users change plans
- **Trial End Notifications**: Sent 3 days before trial expiration
- **Automated Cron Job**: Handles trial expiration notifications

### 3. Trial Management
- **Trial Status Tracking**: Real-time trial status monitoring
- **Trial Extension**: Support for referral-based trial extensions
- **Dashboard Integration**: Trial status cards for user dashboard

## Implementation Details

### Registration Flow (`app/api/register/route.ts`)

```typescript
// Calculate base trial months
const baseTrialMonths = (calculateAge(birthday) <= 27 && position === "Student" && 
  serverOfferCodes.some((offer: any) => offer.offer_code === offerCode)) ? 6 : 3;

// Add referral bonus
const referralBonus = inviteUserName ? 1 : 0;
const totalTrialMonths = baseTrialMonths + referralBonus;

// Create Stripe subscription with trial
const subscription = await stripe.subscriptions.create({
  customer: customer.id,
  items: [{ price: pricePro }],
  trial_period_days: totalTrialMonths * 30,
  metadata: {
    trial_type: referralBonus > 0 ? 'referral' : (baseTrialMonths === 6 ? 'student_offer' : 'standard'),
    base_trial_months: baseTrialMonths.toString(),
    referral_bonus_months: referralBonus.toString(),
    total_trial_months: totalTrialMonths.toString()
  }
});
```

### Webhook Handling (`app/api/webhooks/route.ts`)

The webhook system handles:
- `checkout.session.completed`: New subscriptions
- `customer.subscription.updated`: Plan changes
- `customer.subscription.deleted`: Cancellations
- `customer.subscription.trial_will_end`: Trial end notifications (3 days before)

### Trial Management Utilities (`utils/trialManagement.ts`)

```typescript
// Get trial information
const trialInfo = await getTrialInfo(userId);

// Check trial status
const trialStatus = await getTrialStatus(userId);

// Extend trial (for referrals)
await extendTrial(userId, 1); // 1 month extension
```

### Trial Status Component (`app/components/TrialStatusCard.tsx`)

Displays trial information in user dashboard:
- Days remaining
- Progress bar
- Upgrade prompts
- Referral extension options

## Environment Variables

Add these to your `.env.local`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PRICE_PRO_MONTHLY=price_...

# Cron Job Security
CRON_SECRET_KEY=your-secure-cron-secret

# App Configuration
APP_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Database Schema

Ensure your `users` table has these fields:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  rfirst_name TEXT,
  trial_end TIMESTAMP,
  current_period_end TIMESTAMP,
  subscription_status TEXT DEFAULT 'FREE',
  subscription_id TEXT,
  customer_id TEXT,
  plan_id TEXT,
  -- other fields...
);
```

## Cron Job Setup

Set up a daily cron job to handle trial expirations:

```bash
# Example cron job (runs daily at 9 AM)
0 9 * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET_KEY" https://your-domain.com/api/cron/trial-expiration
```

Or use a service like Vercel Cron:

```typescript
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/trial-expiration",
      "schedule": "0 9 * * *"
    }
  ]
}
```

## Usage Examples

### 1. Check Trial Status in Component

```typescript
import TrialStatusCard from '@/app/components/TrialStatusCard';

export default function Dashboard() {
  return (
    <div>
      <TrialStatusCard userId={userId} />
      {/* Other dashboard content */}
    </div>
  );
}
```

### 2. Get Trial Information Programmatically

```typescript
import { getTrialInfo, getTrialStatus } from '@/utils/trialManagement';

// Get detailed trial information
const trialInfo = await getTrialInfo(userId);
console.log(`Trial type: ${trialInfo.trialType}`);
console.log(`Days remaining: ${trialInfo.daysRemaining}`);

// Get trial status
const status = await getTrialStatus(userId);
if (status.isEndingSoon) {
  // Show upgrade prompt
}
```

### 3. Extend Trial for Referrals

```typescript
import { extendTrial } from '@/utils/trialManagement';

// When someone uses a referral link
await extendTrial(referrerUserId, 1); // 1 month extension
```

## Testing

### Test Trial Scenarios

1. **Standard Registration**: Should get 3 months trial
2. **Student with Offer Code**: Should get 6 months trial
3. **Referral Registration**: Should get base + 1 month
4. **Referrer Bonus**: Should get +1 month extension

### Test Webhook Events

Use Stripe CLI to test webhooks locally:

```bash
stripe listen --forward-to localhost:3000/api/webhooks
```

### Test Cron Job

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET_KEY" http://localhost:3000/api/cron/trial-expiration
```

## Monitoring

### Trial Statistics

The system provides trial statistics via `getTrialStatistics()`:

```typescript
const stats = await getTrialStatistics();
console.log(`Active trials: ${stats.activeTrials}`);
console.log(`Expiring soon: ${stats.expiringTrials}`);
```

### Logs to Monitor

- Trial creation in registration
- Webhook events processing
- Email notifications sent
- Trial extensions via referrals
- Cron job execution

## Troubleshooting

### Common Issues

1. **Trial not created in Stripe**: Check `STRIPE_SECRET_KEY` and `PRICE_PRO_MONTHLY`
2. **Webhooks not working**: Verify `STRIPE_WEBHOOK_SECRET` and endpoint URL
3. **Emails not sending**: Check `RESEND_API_KEY` configuration
4. **Cron job failing**: Verify `CRON_SECRET_KEY` and endpoint accessibility

### Debug Steps

1. Check Stripe Dashboard for subscription creation
2. Verify webhook events in Stripe Dashboard
3. Check application logs for errors
4. Test email sending manually
5. Verify database updates

## Security Considerations

1. **Webhook Verification**: All Stripe webhooks are verified using signatures
2. **Cron Job Protection**: Cron endpoint requires authentication
3. **User Data Protection**: Trial information is user-specific
4. **Rate Limiting**: Consider implementing rate limiting for trial extensions

## Future Enhancements

1. **Trial Analytics**: More detailed trial conversion metrics
2. **A/B Testing**: Different trial lengths for optimization
3. **Trial Extensions**: Admin ability to extend trials
4. **Trial Pauses**: Allow users to pause trials temporarily
5. **Trial Upgrades**: Allow users to upgrade during trial

## Support

For issues or questions about the trial system implementation, please refer to:
- Stripe Documentation: https://stripe.com/docs/billing/subscriptions/trials
- Next.js Documentation: https://nextjs.org/docs
- Supabase Documentation: https://supabase.com/docs 