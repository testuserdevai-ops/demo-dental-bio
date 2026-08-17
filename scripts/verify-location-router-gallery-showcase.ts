import { verifyProfileGalleryShowcase } from "./verify-profile-gallery-showcase";

await verifyProfileGalleryShowcase({
  label: "Location or Provider Router",
  email: "template-location-router@dentalbio.local",
  userId: "10ca7100-0000-4000-8000-000000000001",
  expectedCases: [1_627_401, 1_627_402, 1_627_403, 1_627_404],
  expectedGeneralImages: [
    1_627_501, 1_627_502, 1_627_503, 1_627_504, 1_627_505,
  ],
});
