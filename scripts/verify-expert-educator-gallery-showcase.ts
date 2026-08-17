import { verifyProfileGalleryShowcase } from "./verify-profile-gallery-showcase";

await verifyProfileGalleryShowcase({
  label: "Expert and Educator",
  email: "template-expert-educator@dentalbio.local",
  userId: "ed0ca700-0000-4000-8000-000000000001",
  expectedCases: [1_651_401, 1_651_402, 1_651_403, 1_651_404],
  expectedGeneralImages: [
    1_651_501, 1_651_502, 1_651_503, 1_651_504, 1_651_505,
  ],
});
