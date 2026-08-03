// utils/loadScript.ts
let called = false;
export const loadGoogleMapsScript = (apiKey: string) => {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      // Ensure this code only runs in the browser
      reject(
        new Error("Google Maps script can only be loaded in the browser."),
      );
      return;
    }

    if ((typeof google !== "undefined" && google.maps) || called === true) {
      resolve(); // Script is already loaded
    } else {
      called = true;
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = (e) =>
        reject(new Error("Google Maps API script loading failed."));
      document.head.appendChild(script);
      // console.log(script);
    }
  });
};
