# Dashboard public-cache invalidation matrix

Status: Phase 6 records these immutable templates only. The verified foundation at `6540e13` does **not** add or invoke `revalidateTag`, `revalidatePath`, or another runtime public-cache invalidation call; existing unrelated cache APIs are outside this statement. Production public-cache invalidation and analytics emission remain disabled. `profileId` and every entity ID are immutable database IDs — never username, domain, email, URL, title, or position.

| Successful mutation family                 | Future profile tag           | Future entity tags                                                             | Phase 6 behavior                                  |
| ------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------- |
| Profile, dentistry, socials, profile image | `public-profile:<profileId>` | `profile:<profileId>`, `socials:<profileId>`                                   | Planned PR 3; Query/profile preview refresh only. |
| Treatments / services                      | `public-profile:<profileId>` | `treatments:<profileId>`, `treatment:<entityId>`                               | Planned PR 2; narrow Query reconciliation only.   |
| Links / groups                             | `public-profile:<profileId>` | `links:<profileId>`, `link-group:<groupId>`, `link:<entityId>`                 | Planned PR 2; narrow Query reconciliation only.   |
| Galleries                                  | `public-profile:<profileId>` | `galleries:<profileId>`, `gallery:<entityId>`                                  | Planned PR 3; narrow Query reconciliation only.   |
| Reviews / external review page             | `public-profile:<profileId>` | `reviews:<profileId>`, `review:<entityId>`, `external-review-page:<profileId>` | Planned PR 3; narrow Query reconciliation only.   |
| Blogs / groups                             | `public-profile:<profileId>` | `blogs:<profileId>`, `blog-group:<groupId>`, `blog:<entityId>`                 | Planned PR 4; narrow Query reconciliation only.   |
| Videos / groups                            | `public-profile:<profileId>` | `videos:<profileId>`, `video-group:<groupId>`, `video:<entityId>`              | Planned PR 4; narrow Query reconciliation only.   |
| Products                                   | `public-profile:<profileId>` | `products:<profileId>`, `product:<entityId>`                                   | Planned PR 5; narrow Query reconciliation only.   |
| Locations                                  | `public-profile:<profileId>` | `locations:<profileId>`, `location:<entityId>`                                 | Planned PR 5; narrow Query reconciliation only.   |

Referral and dashboard shell mutations have no public content tag in Phase 6. Phase 7 may derive username/domain-aware keys only after the public read model is designed; it must preserve the immutable-ID boundary above.
