"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { applyActionResult } from "@/app/components/forms/action-result";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { currencies } from "@/utils/global_constants";
import { useProductMutations } from "../_lib/hooks";
import type { ProductViewModel } from "../_lib/queries";
import { updateProductSchema } from "../_lib/schemas";
import {
  productImagePath,
  removeProductImages,
  uploadProductImage,
} from "../_lib/uploads";

type Mutations = ReturnType<typeof useProductMutations>;
type Editor = { product?: ProductViewModel };
const productFormSchema = updateProductSchema.omit({ id: true });
type ProductFormInput = z.input<typeof productFormSchema>;
type ProductFormValues = z.output<typeof productFormSchema>;

function ProductForm({
  editor,
  userId,
  mutations,
  onDone,
}: {
  editor: Editor;
  userId: string;
  mutations: Mutations;
  onDone(): void;
}) {
  const product = editor.product;
  const [error, setError] = useState("");
  const [file, setFile] = useState<File>();
  const form = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product
      ? { ...product }
      : {
          name: "",
          link: "",
          platform: "",
          price: 0,
          currency: "GBP(£)",
          enabled: true,
          imageUrl: "",
        },
  });
  const submit = async (values: ProductFormValues) => {
    setError("");
    const uploaded: string[] = [];
    let imageUrl = product?.imageUrl ?? "";
    if (file) {
      const result = await uploadProductImage(userId, file);
      if (!result.ok) {
        setError(result.formError ?? "Product image could not be uploaded");
        return;
      }
      uploaded.push(result.data.objectPath);
      imageUrl = result.data.publicUrl;
    }
    if (!imageUrl) {
      form.setError("imageUrl", { message: "Product image is required" });
      return;
    }
    const payload = {
      name: values.name,
      link: values.link,
      platform: values.platform,
      price: Number(values.price),
      currency: values.currency,
      enabled: product?.enabled ?? true,
      imageUrl,
    };
    const result = product
      ? await mutations.updateProduct.mutateAsync({
          ...payload,
          id: product.id,
        })
      : await mutations.createProduct.mutateAsync(payload);
    if (!result.ok) {
      await removeProductImages(uploaded);
      applyActionResult(result, form, [
        "name",
        "price",
        "currency",
        "link",
        "platform",
        "imageUrl",
      ]);
      setError(result.formError ?? "Could not save product");
      return;
    }
    if (product && file) {
      const stale = productImagePath(product.imageUrl, userId);
      if (stale) await removeProductImages([stale]);
    }
    onDone();
  };
  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(submit)} noValidate>
      <Field invalid={Boolean(form.formState.errors.name)}>
        <FieldLabel>Product name</FieldLabel>
        <Input {...form.register("name")} />
        {form.formState.errors.name && (
          <FieldError assertive>
            {form.formState.errors.name.message}
          </FieldError>
        )}
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field invalid={Boolean(form.formState.errors.price)}>
          <FieldLabel>Price</FieldLabel>
          <Input
            type="number"
            min="0"
            step="0.01"
            {...form.register("price")}
          />
          {form.formState.errors.price && (
            <FieldError assertive>
              {form.formState.errors.price.message}
            </FieldError>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="product-currency">Currency</FieldLabel>
          <select
            id="product-currency"
            className="h-12 w-full rounded-2xl border bg-white px-3"
            {...form.register("currency")}
          >
            {currencies.map((currency) => (
              <option key={currency}>{currency}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field invalid={Boolean(form.formState.errors.platform)}>
        <FieldLabel>Platform</FieldLabel>
        <Input {...form.register("platform")} />
        {form.formState.errors.platform && (
          <FieldError assertive>
            {form.formState.errors.platform.message}
          </FieldError>
        )}
      </Field>
      <Field invalid={Boolean(form.formState.errors.link)}>
        <FieldLabel>Product URL</FieldLabel>
        <Input type="url" {...form.register("link")} />
        {form.formState.errors.link && (
          <FieldError assertive>
            {form.formState.errors.link.message}
          </FieldError>
        )}
      </Field>
      <Field invalid={Boolean(form.formState.errors.imageUrl)}>
        <FieldLabel>
          {product ? "Replace product image (optional)" : "Product image"}
        </FieldLabel>
        <Input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onInput={(event) => {
            const selected = (event.currentTarget as HTMLInputElement)
              .files?.[0];
            setFile(selected);
            form.setValue(
              "imageUrl",
              selected
                ? "https://upload.pending.invalid/product"
                : (product?.imageUrl ?? ""),
              { shouldValidate: true },
            );
          }}
        />
        {form.formState.errors.imageUrl && (
          <FieldError assertive>
            {form.formState.errors.imageUrl.message}
          </FieldError>
        )}
      </Field>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Could not save product</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" isPending={form.formState.isSubmitting}>
        {product ? "Update" : "Add"} product
      </Button>
    </form>
  );
}

export { ProductForm };
