import { verifyProfileGalleryShowcase } from "./verify-profile-gallery-showcase";

await verifyProfileGalleryShowcase({
  label: "Services Catalogue",
  email: "template-services-catalogue@dentalbio.local",
  userId: "5e010000-0000-4000-8000-000000000001",
  expectedCases: [1_711_401, 1_711_402, 1_711_403, 1_711_404],
  expectedGeneralImages: [
    1_711_501, 1_711_502, 1_711_503, 1_711_504, 1_711_505,
  ],
});
