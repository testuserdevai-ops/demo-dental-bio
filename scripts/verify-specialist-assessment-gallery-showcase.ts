import { verifyProfileGalleryShowcase } from "./verify-profile-gallery-showcase";

await verifyProfileGalleryShowcase({
  label: "Specialist Assessment",
  email: "template-specialist-assessment@dentalbio.local",
  userId: "5a5e5500-0000-4000-8000-000000000001",
  expectedCases: [1_655_401, 1_655_402, 1_655_403, 1_655_404],
  expectedGeneralImages: [
    1_655_501, 1_655_502, 1_655_503, 1_655_504, 1_655_505,
  ],
});
