# Public profile template feature matrix

Status: current implementation audit  
Audited: 2026-08-16

This report records which saved DentalBio content sources are represented by
each public profile template and how each template currently presents them. It
describes the implementation as it exists; it is not the desired product
contract.

## Scope and legend

The audit covers the nine templates dispatched by
`app/[username]/_components/PublicProfileTemplate.tsx` and the public content
loaded by `app/[username]/_lib/public-profile.ts`.

- **Yes**: the template can present the feature as a normal, identifiable
  public section or module.
- **Partial**: the source is used, but only a subset is shown, it is mixed into
  another feature, or it is used only to support a CTA, summary, or image.
- **No**: the template body does not present the feature.
- Empty saved content can still cause a supported section to render nothing.
- Every non-Basic template also receives the shared public header and footer.
  They provide common contact, social, website, share, and brand affordances;
  those shared affordances are counted below.

## 1. Feature presence matrix

| Template                    | Identity / bio | Socials / website | Booking / contact | Treatments | Services | Saved links | Blogs | Videos | Before / after gallery | General gallery | Reviews | External review page | Locations | Products |
| --------------------------- | -------------- | ----------------- | ----------------- | ---------- | -------- | ----------- | ----- | ------ | ---------------------- | --------------- | ------- | -------------------- | --------- | -------- |
| Basic                       | Yes            | Yes               | Yes               | Yes        | Yes      | Yes         | Yes   | Yes    | Yes                    | Yes             | Yes     | Partial              | Yes       | Yes      |
| Direct Booking              | Yes            | Yes               | Yes               | Partial    | No       | Partial     | No    | No     | No                     | Partial         | Partial | Partial              | Partial   | No       |
| Location or Provider Router | Yes            | Yes               | Yes               | No         | No       | No          | No    | No     | No                     | No              | Partial | Partial              | Yes       | No       |
| Services Catalogue          | Yes            | Yes               | Yes               | Yes        | Yes      | Partial     | No    | No     | No                     | No              | Partial | Partial              | Yes       | No       |
| Cosmetic Transformation     | Yes            | Yes               | Yes               | Partial    | No       | Yes         | No    | No     | Partial                | Partial         | Partial | No                   | Partial   | No       |
| Trust-First Family Practice | Yes            | Yes               | Yes               | Partial    | No       | Partial     | No    | No     | No                     | Partial         | Partial | Partial              | Partial   | No       |
| Specialist Assessment       | Yes            | Yes               | Yes               | Partial    | No       | Partial     | No    | No     | No                     | No              | Partial | No                   | Partial   | No       |
| Clinic and Commerce         | Yes            | Yes               | Yes               | Partial    | Partial  | Partial     | No    | No     | No                     | No              | Partial | No                   | No        | Yes      |
| Expert and Educator         | Yes            | Yes               | Yes               | No         | No       | Partial     | No    | No     | No                     | No              | No      | No                   | Partial   | No       |

## 2. Implementation details matrix

| Template                        | Treatments and services                                                                                                                                                                                                                                                         | Links, blogs, videos, and products                                                                                                                                                                                    | Galleries, reviews, and locations                                                                                                                                                                                                                          | Notable constraints and presentation rules                                                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Basic**                       | Separate **Treatments** and **Services** accordions. Both filter by `isService` and render the complete loaded lists in public rank order.                                                                                                                                      | Renders all active saved link groups and links, all enabled blog groups/posts, all enabled video groups/videos, and all enabled products.                                                                             | Renders all enabled before/after cases, all enabled general-gallery images, all enabled reviews, and all saved locations. The first external review page is linked from the Reviews heading when reviews exist.                                            | This is the only current template that exposes every major public content family and already separates an unrestricted treatment/service inventory.                                                   |
| **Direct Booking**              | Renders treatments only under **Featured treatments**. Uses configured `featuredTreatmentIds` when present; otherwise uses the first three ranked treatments. Services are explicitly filtered out.                                                                             | Saved links are not listed. At most one active assessment/consultation-like saved link can become the primary action. No blogs, videos, or products.                                                                  | Uses the first location, the first general-gallery image as its practice image, an aggregate score/count from all scored reviews, and the first valid external review page. It does not show review bodies or before/after cases.                          | Treatment output is pinned or capped at three. Dashboard treatment mutations invalidate server cache but do not currently trigger the embedded preview reload.                                        |
| **Location or Provider Router** | Does not read or render treatments or services.                                                                                                                                                                                                                                 | Does not render saved links, blogs, videos, or products.                                                                                                                                                              | All valid locations become selector options. The selected/default location gets contact and map actions. Reviews are filtered and capped at two; the first valid external review page is linked. No galleries.                                             | This template is location-first and currently omits the entire treatment/service inventory despite the onboarding treatment builder being available.                                                  |
| **Services Catalogue**          | Splits eligible ranked items into a mixed **Featured care** block of up to three, then removes those IDs from the normal **Treatments** and **Support services** sections. Remaining treatments and services are unlimited. `featuredTreatmentIds` can control the mixed block. | Only active links classified as financing, team, or FAQ resources are shown. No blogs, videos, or products.                                                                                                           | Reviews are capped at three and can link the first valid external review page. All saved locations are passed to the shared work-location UI. No galleries.                                                                                                | Every eligible treatment/service is represented somewhere, but the first/selected three are mixed by kind and absent from their normal sections. The service heading differs from the dashboard term. |
| **Cosmetic Transformation**     | Selects one treatment as **Signature treatment**, then shows at most four other non-service treatments under **Explore treatment options**. Services are excluded. `signatureTreatmentId` can pin the signature item.                                                           | Renders the standard active saved-link groups and can also promote one matching consultation link to the primary CTA. No blogs, videos, or products.                                                                  | Before/after cases are selected by `featuredGalleryIds` or capped at six. The first general-gallery image becomes the hero. Reviews are selected by `featuredReviewIds` or capped at three. The first location is shown. External review pages are unused. | A maximum of five treatments is visible. Treatment, gallery, and review presentation depends on template-specific selection fields.                                                                   |
| **Trust-First Family Practice** | Shows only the first three ranked treatments. Services are excluded even though the section is titled **Featured family services**.                                                                                                                                             | Shows only the first three active saved links as patient resources. No blogs, videos, or products.                                                                                                                    | The first general-gallery image becomes the hero. Reviews are selected by `featuredReviewIds` or capped at two; the first valid external review page can be linked. The first location is shown. No before/after gallery.                                  | The treatment heading calls treatments “services,” while actual service records are filtered out.                                                                                                     |
| **Specialist Assessment**       | Shows only the first three ranked non-service items under **Specialist treatments**. Services are excluded.                                                                                                                                                                     | Shows only active links whose title/group can be classified as assessment, emergency, insurance, referral, or FAQ content. No blogs, videos, or products.                                                             | Computes an average from all scored reviews but shows at most one review quote. Shows the first valid location. External review pages and galleries are unused.                                                                                            | The template catalogue advertises gallery-related structure, but the current renderer does not consume either gallery source.                                                                         |
| **Clinic and Commerce**         | Takes the first three ranked treatment records without separating by `isService`. Treatments and services can therefore be mixed together in one **Visit the clinic** grid.                                                                                                     | Products are filtered to valid enabled outbound products and all are shown, with a configured/default product ordered first. Saved links are reduced to the first newsletter/community-like link. No blogs or videos. | Shows the first two reviews. Does not use external review pages, galleries, or saved locations.                                                                                                                                                            | The combined treatment/service list is capped at three and its section has only the `treatments` anchor. The product inventory is dynamic and uncapped.                                               |
| **Expert and Educator**         | Does not read or render treatments or services.                                                                                                                                                                                                                                 | Uses active saved links as resources, selects one featured resource, classifies the remainder into patient/professional audiences, and caps each audience at four. No blogs, videos, or products.                     | Shows the first location with consultation/map actions. Reviews, external review pages, and galleries are unused.                                                                                                                                          | At most nine link resources are visible: one featured item plus four per audience. The template currently omits the entire treatment/service inventory.                                               |

## 3. Cross-template findings

### Treatment and service consistency

Only Basic currently satisfies all of these conditions together:

1. both treatments and services are supported;
2. they are separated by kind;
3. every loaded item can be rendered; and
4. there is no template-specific featured/pinned selection.

The other templates fall into four groups:

- **Omitted entirely:** Location or Provider Router; Expert and Educator.
- **Treatments only and capped:** Direct Booking; Cosmetic Transformation;
  Trust-First Family Practice; Specialist Assessment.
- **Mixed and capped:** Clinic and Commerce.
- **All items present but featured/mixed:** Services Catalogue.

### Content concentrated in Basic

Blogs and videos are public only in Basic. Before/after gallery cases are
public only in Basic and Cosmetic Transformation. Products are public only in
Basic and Clinic and Commerce.

Changing to any other template can therefore leave valid saved content in the
database while making it absent from the public template.

### Common partial-support patterns

- Many templates use only the first ranked location rather than every saved
  location.
- Review cards are commonly capped at two or three, or reduced to an aggregate
  rating and one quote.
- External review pages are usually reduced to the first valid link and are
  absent from four templates.
- Several templates classify saved links by title/group text and silently omit
  links that do not match template-specific regular expressions.
- General-gallery images are sometimes repurposed as a single hero or location
  image rather than displayed as a gallery.

## 4. One-line resolution logic

| Issue | Required logic fix |
| --- | --- |
| Treatments | Filter the complete eligible inventory by `isService !== true`, preserve saved rank, and render every treatment under the owner-defined treatment heading; a featured treatment may be emphasized but must not be consumed or hidden. |
| Services | Filter the complete eligible inventory by `isService === true`, preserve saved rank, and render every service in a separate dynamic section under the owner-defined service heading. |
| Locations | Keep every valid saved location reachable in deterministic order and render only that location's optional owned image; never substitute a gallery image or stop at the first row. |
| Reviews | Render every eligible review card in saved order; aggregate score/count and highlighted quotes may supplement the inventory but must not cap or replace it. |
| External review pages | Render every valid saved external-review destination with stable identity and controlled tracking instead of selecting only the first link or omitting the feature by template. |
| Template-classified saved links | Treat title/group classification only as optional presentation grouping, never as eligibility; every active safe saved link must remain discoverable even when it matches no template-specific expression. |
| General-gallery hero reuse | A safe image may also be reused as a hero/accent, but separately render the complete eligible general gallery so hero selection never consumes the gallery inventory. |

## 5. Primary implementation references

- Template dispatcher and shared wrapper:
  `app/[username]/_components/PublicProfileTemplate.tsx`
- Public content view model and queries:
  `app/[username]/_lib/public-profile.ts`
- Template/module catalogue:
  `lib/profile-presentation/catalog.ts`
- Template answer contract:
  `lib/profile-presentation/contract.ts`
- Basic content modules:
  `app/[username]/_components/BasicProfileTemplate.tsx` and
  `app/[username]/components/`
- Template-specific renderers:
  `app/[username]/_components/*ProfileTemplate.tsx`
- Template-specific selectors:
  `app/[username]/_lib/*-template.ts`
