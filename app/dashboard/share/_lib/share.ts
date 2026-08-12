export function buildOwnerShareUrls(profileUrl: string) {
  const whatsapp = new URL("https://api.whatsapp.com/send");
  whatsapp.searchParams.set("text", profileUrl);
  const linkedIn = new URL("https://www.linkedin.com/sharing/share-offsite/");
  linkedIn.searchParams.set("url", profileUrl);
  const email = new URL("mailto:");
  email.searchParams.set("subject", "My DentalBio profile");
  email.searchParams.set("body", `View my profile: ${profileUrl}`);
  return {
    whatsapp: whatsapp.toString(),
    linkedIn: linkedIn.toString(),
    email: email.toString(),
  };
}
