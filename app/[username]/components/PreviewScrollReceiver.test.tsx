import React from "react";
import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import PreviewScrollReceiver from "./PreviewScrollReceiver";

afterEach(cleanup);

describe("PreviewScrollReceiver", () => {
  test("scrolls its own window when the dashboard requests a section", () => {
    const scrollTo = mock(() => {});
    const originalScrollTo = window.scrollTo;
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: scrollTo,
    });

    const section = document.createElement("section");
    section.id = "gallery";
    section.getBoundingClientRect = () => ({ top: 500 }) as DOMRect;
    document.body.append(section);

    render(<PreviewScrollReceiver />);
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "dentalbio:preview-scroll",
          sectionId: "gallery",
          behavior: "smooth",
        },
        origin: window.location.origin,
        source: window,
      }),
    );

    expect(scrollTo).toHaveBeenCalledWith({
      top: 380,
      behavior: "smooth",
    });

    section.remove();
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: originalScrollTo,
    });
  });
});
