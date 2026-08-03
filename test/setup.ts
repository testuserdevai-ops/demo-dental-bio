import { afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { resetNavigationMocks } from "./mocks/next-navigation";

GlobalRegistrator.register();

const { cleanup } = await import("@testing-library/react");

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  localStorage.clear();
  sessionStorage.clear();
  resetNavigationMocks();
});
