# Dashboard E2E coverage

All mutation tests use a unique `e2e-<timestamp>-<worker>-<uuid>` tenant. The service-role key is read only by Node-side fixtures. Remote projects are rejected unless explicitly opted in, and browser code receives only the normal anonymous key.

| Page | Route | Navigation/load | Empty/populated | Validation/failure preservation | CRUD/persistence | Safe external boundary |
| --- | --- | --- | --- | --- | --- | --- |
| Bio | `/dashboard` | In progress | In progress | In progress | In progress | Preview only |
| Locations | `/dashboard/location` | In progress | In progress | In progress | In progress | Maps intercepted |
| Treatments / Services | `/dashboard/treatments` | In progress | In progress | In progress | In progress | N/A |
| Links | `/dashboard/links` | In progress | In progress | In progress | In progress | N/A |
| Blogs | `/dashboard/blog` | In progress | In progress | In progress | In progress | Editor kept minimal |
| Gallery | `/dashboard/gallery` | In progress | In progress | In progress | In progress | Local Storage only |
| Reviews | `/dashboard/review` | In progress | In progress | In progress | In progress | N/A |
| Videos | `/dashboard/video` | In progress | In progress | In progress | In progress | Provider embed intercepted |
| Shop | `/dashboard/shop` | In progress | In progress | In progress | In progress | No checkout |
| Verification | `/dashboard/verification` | In progress | N/A | N/A | Safe rendering only | Veriff intercepted |
| Referral | `/dashboard/referral` | In progress | N/A | In progress | Copy only | Email/share not sent |
| Custom Domain | `/dashboard/domain` | In progress | N/A | In progress | No attachment | DNS/Vercel intercepted |
| Subscription | `/dashboard/subscription` | In progress | In progress | In progress | Rendering only | Stripe intercepted |
| Settings | `/dashboard/settings` | In progress | N/A | In progress | In progress | No password/email/delete |
