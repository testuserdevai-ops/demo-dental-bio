import { expect, mock, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();

const writeText = mock(async () => undefined);
Object.defineProperty(navigator, "clipboard", {
  configurable: true,
  value: { writeText },
});

const { fireEvent, render, screen } = await import("@testing-library/react");
const { ShareHub } = await import("./ShareHub");

test("keeps the mobile sharing task compact and copyable", async () => {
  render(<ShareHub profileUrl="https://dental.bio/dr-alex" />);
  const copy = screen.getByRole("button", { name: "Copy profile link" });
  expect(copy.className).toContain("min-h-11");
  fireEvent.click(copy);
  await screen.findByRole("button", { name: "Copied" });
  expect(writeText).toHaveBeenCalledWith("https://dental.bio/dr-alex");
  expect(
    screen.getByRole("link", { name: /WhatsApp/ }).getAttribute("href"),
  ).toContain(
    "api.whatsapp.com",
  );
  expect(screen.getByText(/QR code is not offered/)).toBeTruthy();
});
