import { beforeEach, describe, expect, it, mock } from "bun:test";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

mock.module("next/image", () => ({ default: () => null }));
mock.module("server-only", () => ({}));
mock.module("../_lib/hooks", () => ({
  useProductAggregate: () => ({}),
  useProductMutations: () => ({}),
}));
const removeProductImages = mock(async () => {});
mock.module("../_lib/uploads", () => ({
  uploadProductImage: mock(async () => ({
    ok: true as const,
    data: {
      objectPath: "owner/products/new.webp",
      publicUrl: "https://example.com/new.webp",
    },
  })),
  removeProductImages,
  retryProductImageCleanup: mock(async () => {}),
  productImagePath: () => null,
}));
const triggerReload = mock(() => {});
mock.module("@/app/contexts/PreviewContext", () => ({
  usePreview: () => ({ triggerReload }),
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
const secondProduct = { ...product, id: 2, name: "Second kit", rank: 2 };

type Scenario = {
  name: string;
  mutation: string;
  products?: (typeof product)[];
  successData: unknown;
  act(): void;
  expectedArgument?: unknown;
};

const scenarios: Scenario[] = [
  {
    name: "product create",
    mutation: "createProduct",
    successData: secondProduct,
    act() {
      fireEvent.click(screen.getByRole("button", { name: "Add product" }));
      fireEvent.change(screen.getByLabelText("Product name"), {
        target: { value: "Second kit" },
      });
      fireEvent.change(screen.getByLabelText("Price"), {
        target: { value: "19.99" },
      });
      fireEvent.change(screen.getByLabelText("Platform"), {
        target: { value: "Shop" },
      });
      fireEvent.change(screen.getByLabelText("Product URL"), {
        target: { value: secondProduct.link },
      });
      fireEvent.input(screen.getByLabelText("Product image"), {
        target: { files: [new File(["image"], "product.webp")] },
      });
      fireEvent.click(screen.getByRole("button", { name: "Add product" }));
    },
  },
  {
    name: "product edit",
    mutation: "updateProduct",
    successData: { ...product, name: "Updated kit" },
    act() {
      fireEvent.click(screen.getByRole("button", { name: "Edit Care kit" }));
      fireEvent.change(screen.getByLabelText("Product name"), {
        target: { value: "Updated kit" },
      });
      fireEvent.input(
        screen.getByLabelText("Replace product image (optional)"),
        { target: { files: [new File(["image"], "replacement.webp")] } },
      );
      fireEvent.click(screen.getByRole("button", { name: "Update product" }));
    },
  },
  {
    name: "product toggle",
    mutation: "updateProduct",
    successData: { ...product, enabled: false },
    act() {
      fireEvent.click(screen.getByRole("switch", { name: "Hide Care kit" }));
    },
    expectedArgument: expect.objectContaining({ enabled: false }),
  },
  {
    name: "product delete",
    mutation: "deleteProduct",
    successData: undefined,
    act() {
      fireEvent.click(screen.getByRole("button", { name: "Delete Care kit" }));
      fireEvent.click(
        within(
          screen.getByRole("alertdialog", { name: "Delete product?" }),
        ).getByRole("button", { name: "Delete" }),
      );
    },
    expectedArgument: { id: 1 },
  },
  {
    name: "product reorder",
    mutation: "reorderProducts",
    products: [product, secondProduct],
    successData: undefined,
    act() {
      fireEvent.click(
        screen.getByRole("button", { name: "Move Care kit down" }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Save product order" }),
      );
    },
    expectedArgument: { orderedIds: [2, 1] },
  },
];

function renderScenario(scenario: Scenario, mutation: ReturnType<typeof mock>) {
  render(
    <ProductManager
      products={scenario.products ?? [product]}
      loading={false}
      enabled
      userId="owner"
      mutations={{ [scenario.mutation]: { mutateAsync: mutation } } as never}
    />,
  );
}

describe("ProductManager preview reload contract", () => {
  beforeEach(() => {
    removeProductImages.mockClear();
    triggerReload.mockClear();
  });

  for (const scenario of scenarios) {
    it(`${scenario.name} reloads exactly once after authoritative success`, async () => {
      const mutation = mock(async () => ({
        ok: true as const,
        data: scenario.successData,
      }));
      renderScenario(scenario, mutation);

      scenario.act();

      await waitFor(() => expect(mutation).toHaveBeenCalledTimes(1));
      if (scenario.expectedArgument) {
        expect(mutation).toHaveBeenCalledWith(scenario.expectedArgument);
      }
      await waitFor(() => expect(triggerReload).toHaveBeenCalledTimes(1));
    });

    it(`${scenario.name} keeps authoritative state and never reloads after rejection`, async () => {
      const mutation = mock(async () => ({
        ok: false as const,
        code: "MUTATION_FAILED",
        formError: "Could not save",
      }));
      renderScenario(scenario, mutation);

      scenario.act();

      await waitFor(() => expect(mutation).toHaveBeenCalledTimes(1));
      expect(triggerReload).not.toHaveBeenCalled();
      if (scenario.name.includes("delete")) {
        expect(screen.getByRole("alertdialog")).toBeTruthy();
      } else {
        expect(screen.getByRole("alert").textContent).toContain(
          "Could not save",
        );
      }
    });
  }

  it("retains a rejected edit draft and skips preview reload", async () => {
    const updateProduct = mock(async () => ({
      ok: false as const,
      code: "UPDATE_FAILED",
      formError: "Could not save product",
    }));
    renderScenario(scenarios[1]!, updateProduct);
    fireEvent.click(screen.getByRole("button", { name: "Edit Care kit" }));
    fireEvent.change(screen.getByLabelText("Product name"), {
      target: { value: "Draft kit" },
    });
    fireEvent.input(screen.getByLabelText("Replace product image (optional)"), {
      target: { files: [new File(["image"], "replacement.webp")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update product" }));
    await waitFor(() => expect(updateProduct).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
    expect(
      (screen.getByLabelText("Product name") as HTMLInputElement).value,
    ).toBe("Draft kit");
    expect(triggerReload).not.toHaveBeenCalled();
  });

  it("rejects validation and delete cancellation without preview reload", async () => {
    renderScenario(
      scenarios[0]!,
      mock(async () => ({ ok: true as const })),
    );
    expect(screen.getByRole("article").className).toContain("max-h-40");
    fireEvent.click(screen.getByRole("button", { name: "Add product" }));
    fireEvent.click(screen.getByRole("button", { name: "Add product" }));
    await waitFor(() =>
      expect(
        screen.getByLabelText("Product name").getAttribute("aria-invalid"),
      ).toBe("true"),
    );
    expect(triggerReload).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Delete Care kit" }));
    fireEvent.click(
      within(
        screen.getByRole("alertdialog", { name: "Delete product?" }),
      ).getByRole("button", { name: "Cancel" }),
    );
    expect(screen.getByRole("button", { name: "Edit Care kit" })).toBeTruthy();
    expect(triggerReload).not.toHaveBeenCalled();
  });
});
