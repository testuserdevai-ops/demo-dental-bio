import { verifyProfileGalleryShowcase } from "./verify-profile-gallery-showcase";

await verifyProfileGalleryShowcase({
  label: "Direct Booking",
  email: "template-direct-booking@dentalbio.local",
  userId: "db010000-0000-4000-8000-000000000001",
  expectedCases: [1_611_401, 1_611_402, 1_611_403, 1_611_404],
  expectedGeneralImages: [
    1_611_501, 1_611_502, 1_611_503, 1_611_504, 1_611_505,
  ],
});
