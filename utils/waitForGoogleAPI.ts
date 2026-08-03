export function waitForGoogleAPI(timeout = 50000) {
  return new Promise((resolve, reject) => {
    const interval = 100; // Check every 100ms
    const maxAttempts = timeout / interval;
    let attempts = 0;

    const checkGoogleAPI = setInterval(() => {
      if (typeof google !== "undefined") {
        clearInterval(checkGoogleAPI);
        resolve("Google API is ready");
      } else if (attempts >= maxAttempts) {
        clearInterval(checkGoogleAPI);
        reject("Google API script did not load in time");
      }
      attempts++;
    }, interval);
  });
}
