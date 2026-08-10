"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CaretDown,
  CaretUp,
  PencilSimple,
  Trash,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { applyActionResult } from "@/app/components/forms/action-result";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import BlogImage from "@/app/components/Image/BlogImage";
import { usePreview } from "@/app/contexts/PreviewContext";
import { currencies } from "@/utils/global_constants";
import { formatCurrency } from "@/utils/functions/formatCurrency";
import { useProductMutations } from "../_lib/hooks";
import type { ProductViewModel } from "../_lib/queries";
import { updateProductSchema } from "../_lib/schemas";
import {
  productImagePath,
  removeProductImages,
  retryProductImageCleanup,
  uploadProductImage,
} from "../_lib/uploads";
type Mutations = ReturnType<typeof useProductMutations>;
type Editor = { product?: ProductViewModel };
const productFormSchema = updateProductSchema.omit({ id: true });
type ProductFormInput = z.input<typeof productFormSchema>;
type ProductFormValues = z.output<typeof productFormSchema>;
function move<T>(items: T[], index: number, direction: -1 | 1) {
  const next = index + direction;
  if (next < 0 || next >= items.length) return items;
  const changed = [...items];
  const [item] = changed.splice(index, 1);
  changed.splice(next, 0, item);
  return changed;
}
function same(a: { id: number }[], b: { id: number }[]) {
  return a.map((x) => x.id).join() === b.map((x) => x.id).join();
}
import { MoveButtons } from "./MoveButtons";
import { ProductForm } from "./ProductForm";
export default function ProductManager({
  products,
  loading,
  enabled,
  userId,
  mutations,
}: {
  products: ProductViewModel[];
  loading: boolean;
  enabled: boolean;
  userId: string;
  mutations: Mutations;
}) {
  const { triggerReload } = usePreview();
  const [draft, setDraft] = useState(products);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleting, setDeleting] = useState<ProductViewModel | null>(null);
  const [error, setError] = useState("");
  useEffect(() => setDraft(products), [products]);
  useEffect(() => {
    void retryProductImageCleanup(userId);
  }, [userId]);
  const reorder = async () => {
    const result = await mutations.reorderProducts.mutateAsync({
      orderedIds: draft.map((x) => x.id),
    });
    if (!result.ok) {
      setDraft(products);
      setError(result.formError ?? "Could not save product order");
      return;
    }
    triggerReload();
  };
  const toggle = async (product: ProductViewModel) => {
    const result = await mutations.updateProduct.mutateAsync({
      id: product.id,
      name: product.name,
      link: product.link,
      platform: product.platform,
      imageUrl: product.imageUrl,
      price: product.price,
      currency: product.currency,
      enabled: !product.enabled,
    });
    if (!result.ok) {
      setError(result.formError ?? "Could not update product");
      return;
    }
    setDraft((current) =>
      current.map((item) =>
        item.id === product.id
          ? { ...item, enabled: result.data.enabled }
          : item,
      ),
    );
    triggerReload();
  };
  const remove = async () => {
    if (!deleting) return;
    const result = await mutations.deleteProduct.mutateAsync({
      id: deleting.id,
    });
    if (!result.ok) {
      setError(result.formError ?? "Could not delete product");
      return;
    }
    const path = productImagePath(deleting.imageUrl, userId);
    if (path) await removeProductImages([path]);
    setDeleting(null);
    triggerReload();
  };
  if (loading) return <p aria-live="polite">Loading products</p>;
  return (
    <section className="space-y-4" data-testid="product-manager">
      <div className="flex flex-wrap justify-end gap-2">
        {!same(draft, products) && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDraft(products)}
            >
              Cancel product order
            </Button>
            <Button type="button" onClick={() => void reorder()}>
              Save product order
            </Button>
          </>
        )}
        <Button type="button" disabled={!enabled} onClick={() => setEditor({})}>
          Add product
        </Button>
      </div>
      {draft.length ? (
        draft.map((product, index) => (
          <article
            key={product.id}
            className="flex max-h-40 items-center gap-3 overflow-hidden rounded-3xl border bg-white p-4 shadow-sm"
          >
            <MoveButtons
              label={product.name}
              index={index}
              total={draft.length}
              disabled={!enabled}
              onMove={(direction) =>
                setDraft((current) => move(current, index, direction))
              }
            />
            <BlogImage
              src={product.imageUrl}
              alt=""
              className="size-20 shrink-0 rounded-2xl bg-muted object-cover"
            />
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold text-primary">
                {product.name}
              </h3>
              <p className="truncate text-sm text-muted-foreground">
                {product.platform}
              </p>
              <p className="text-sm font-medium">
                {formatCurrency(product.currency)}
                {product.price}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <a
                href={product.link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${product.name}`}
                className="inline-flex size-10 items-center justify-center rounded-2xl hover:bg-muted"
              >
                <ArrowSquareOut aria-hidden="true" className="size-5" />
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Edit ${product.name}`}
                disabled={!enabled}
                onClick={() => setEditor({ product })}
              >
                <PencilSimple aria-hidden="true" className="size-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Delete ${product.name}`}
                disabled={!enabled}
                onClick={() => setDeleting(product)}
              >
                <Trash aria-hidden="true" className="size-5" />
              </Button>
              <Switch
                checked={product.enabled}
                disabled={!enabled}
                aria-label={`${product.enabled ? "Hide" : "Show"} ${product.name}`}
                onCheckedChange={() => void toggle(product)}
              />
            </div>
          </article>
        ))
      ) : (
        <p className="rounded-3xl border border-dashed bg-white p-8 text-center text-muted-foreground">
          No products yet
        </p>
      )}
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Could not manage products</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Dialog
        open={Boolean(editor)}
        onOpenChange={(open) => !open && setEditor(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editor?.product ? "Edit" : "Add"} product
            </DialogTitle>
            <DialogDescription>
              Changes appear on the public profile after a successful save.
            </DialogDescription>
          </DialogHeader>
          {editor && (
            <ProductForm
              editor={editor}
              userId={userId}
              mutations={mutations}
              onDone={() => {
                setEditor(null);
                triggerReload();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {deleting?.name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
export { ProductClient } from "./ProductClient";
