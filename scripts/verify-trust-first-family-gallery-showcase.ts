import { verifyProfileGalleryShowcase } from "./verify-profile-gallery-showcase";

await verifyProfileGalleryShowcase({
  label: "Trust-First Family Practice",
  email: "template-trust-first@dentalbio.local",
  userId: "7f570000-0000-4000-8000-000000000001",
  expectedCases: [1_637_401, 1_637_402, 1_637_403, 1_637_404],
  expectedGeneralImages: [
    1_637_501, 1_637_502, 1_637_503, 1_637_504, 1_637_505,
  ],
});
