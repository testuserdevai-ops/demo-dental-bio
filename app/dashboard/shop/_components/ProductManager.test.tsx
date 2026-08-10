import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
mock.module("server-only", () => ({}));
mock.module("../_lib/hooks", () => ({
  useProductAggregate: () => ({}),
  useProductMutations: () => ({}),
}));
mock.module("../_lib/uploads", () => ({
  uploadProductImage: mock(async () => ({
    ok: true,
    data: {
      objectPath: "owner/products/new.webp",
      publicUrl: "https://example.com/new.webp",
    },
  })),
  removeProductImages: mock(async () => {}),
  retryProductImageCleanup: mock(async () => {}),
  productImagePath: () => null,
}));
mock.module("@/app/contexts/PreviewContext", () => ({
  usePreview: () => ({ triggerReload: () => {} }),
}));
const { default: ProductManager } = await import("./ProductManager");
const product = {
  id: 1,
  name: "Care kit",
  link: "https://example.com/product",
  platform: "Shop",
  imageUrl: "/previews/product.webp",
  price: 12.99,
  currency: "GBP(£)",
  enabled: true,
  rank: 1,
};
describe("ProductManager", () => {
  it("uses bounded cards and updates visibility after authoritative success", async () => {
    const updateProduct = mock(async () => ({
      ok: true as const,
      data: { ...product, enabled: false },
    }));
    render(
      <ProductManager
        products={[product]}
        loading={false}
        enabled
        userId="owner"
        mutations={{ updateProduct: { mutateAsync: updateProduct } } as never}
      />,
    );
    expect(screen.getByRole("article").className).toContain("max-h-40");
    fireEvent.click(screen.getByRole("switch", { name: "Hide Care kit" }));
    await waitFor(() =>
      expect(
        screen.getByRole("switch", { name: "Show Care kit" }),
      ).toBeTruthy(),
    );
  });
});
