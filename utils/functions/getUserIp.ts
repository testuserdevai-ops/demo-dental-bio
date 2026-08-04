export const getUserLocation = async () => {
  if (process.env.NEXT_PUBLIC_E2E_DISABLE_EXTERNALS === "1") return "Unknown";

  try {
    const response = await fetch(
      `https://ipinfo.io/json?token=${process.env.NEXT_PUBLIC_IPINFO_TOKEN}`,
    );
    const data = await response.json();

    const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    const fullCountryName = regionNames.of(data.country) || data.country;

    return fullCountryName;
  } catch (error) {
    console.error("Error fetching location:", error);
    return "Unknown"; // Default to "Unknown" if location can't be fetched
  }
};
