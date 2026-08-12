"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowSquareOut, Copy } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { applyActionResult } from "@/app/components/forms/action-result";
import { Button } from "@/app/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import {
  buildManagedCampaignUrl,
  validateManagedCampaign,
} from "@/lib/analytics/campaign-url";
import type { LinkViewModel } from "../_lib/queries";
import { linkFormInputSchema, type CreateLinkInput } from "../_lib/schemas";
import {
  LINK_IMAGE_ACCEPT,
  linkImagePath,
  removeLinkImages,
  uploadLinkImage,
  validateLinkImage,
} from "../_lib/uploads";
import { ErrorAlert } from "./ErrorAlert";
import type { LinkMutations } from "./links-manager-shared";

type FormValues = Omit<CreateLinkInput, "linkGroupId">;

export function LinkForm({
  groupId,
  link,
  mutations,
  afterSuccess,
  onCancel,
  userId,
}: {
  groupId: string;
  link?: LinkViewModel;
  mutations: LinkMutations;
  afterSuccess(): void;
  onCancel?(): void;
  userId: string;
}) {
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState<File>();
  const [previewUrl, setPreviewUrl] = useState(link?.imageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(linkFormInputSchema),
    defaultValues: {
      title: link?.title ?? "",
      url: link?.destinationUrl ?? link?.url ?? "https://",
      isActive: link?.isActive ?? true,
      imageUrl: link?.imageUrl ?? null,
      imageVariant: link?.imageVariant ?? "none",
      imageAlt: link?.imageAlt ?? null,
      imageDecorative: link?.imageDecorative ?? true,
      isFeatured: link?.isFeatured ?? false,
      campaignEnabled: link?.campaignEnabled ?? false,
      campaignSource: link?.campaignSource ?? "",
      campaignMedium: link?.campaignMedium ?? "",
      campaignName: link?.campaignName ?? "",
      campaignContent: link?.campaignContent ?? "",
      campaignTerm: link?.campaignTerm ?? "",
    },
  });
  const mutation = link ? mutations.updateLink : mutations.createLink;
  const variant = useWatch({ control: form.control, name: "imageVariant" });
  const decorative = useWatch({
    control: form.control,
    name: "imageDecorative",
  });
  const imageUrl = useWatch({ control: form.control, name: "imageUrl" });
  const previewTitle =
    useWatch({ control: form.control, name: "title" }) || "Link title";
  const previewAlt =
    useWatch({ control: form.control, name: "imageAlt" }) ?? "";
  const featured = useWatch({ control: form.control, name: "isFeatured" });
  const destination = useWatch({ control: form.control, name: "url" });
  const campaignFields = useWatch({ control: form.control });
  const campaignEnabled = campaignFields.campaignEnabled ?? false;
  const campaignValidation = validateManagedCampaign(
    destination,
    campaignFields as FormValues,
  );
  let finalCampaignUrl = "";
  try {
    finalCampaignUrl = buildManagedCampaignUrl(
      destination,
      campaignFields as FormValues,
    );
  } catch {
    finalCampaignUrl = "";
  }

  useEffect(
    () => () => {
      if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const chooseVariant = (next: FormValues["imageVariant"]) => {
    form.setValue("imageVariant", next, { shouldValidate: true });
    if (next === "none") {
      form.setValue("imageUrl", null, { shouldValidate: true });
      form.setValue("imageAlt", null, { shouldValidate: true });
      form.setValue("imageDecorative", true, { shouldValidate: true });
      setImageFile(undefined);
      setPreviewUrl("");
    }
  };

  const submit = async (values: FormValues) => {
    setError("");
    let uploadedPath: string | null = null;
    let image = values.imageUrl;
    try {
      if (values.imageVariant !== "none" && !imageFile && !image) {
        form.setError("imageUrl", {
          type: "validate",
          message: "Upload an image for this layout",
        });
        setError("Upload an image before saving this link");
        return;
      }
      if (values.imageVariant !== "none" && imageFile) {
        setUploading(true);
        const upload = await uploadLinkImage(userId, imageFile);
        setUploading(false);
        if (!upload.ok) {
          setError(upload.formError ?? "Link image could not be uploaded");
          return;
        }
        uploadedPath = upload.data.objectPath;
        image = upload.data.publicUrl;
      }
      const payload = {
        ...values,
        imageUrl: values.imageVariant === "none" ? null : image,
        imageAlt: values.imageDecorative ? null : values.imageAlt,
      };
      const result = link
        ? await mutations.updateLink.mutateAsync({
            linkGroupId: groupId,
            linkId: link.id,
            ...payload,
          })
        : await mutations.createLink.mutateAsync({
            linkGroupId: groupId,
            ...payload,
          });
      if (!result.ok) {
        if (uploadedPath) await removeLinkImages([uploadedPath]);
        applyActionResult(result, form, [
          "title",
          "url",
          "imageUrl",
          "imageVariant",
          "imageAlt",
          "campaignName",
          "campaignSource",
          "campaignMedium",
        ]);
        setError(result.formError ?? "Unable to save link");
        return;
      }
      if (link?.imageUrl && link.imageUrl !== image) {
        const stale = linkImagePath(link.imageUrl, userId);
        if (stale) await removeLinkImages([stale]);
      }
      form.reset();
      afterSuccess();
    } catch {
      if (uploadedPath) await removeLinkImages([uploadedPath]);
      setUploading(false);
      setError("Link image could not be uploaded");
    }
  };

  return (
    <form onSubmit={form.handleSubmit(submit)} className="min-w-0 space-y-5">
      <Field invalid={Boolean(form.formState.errors.title)}>
        <FieldLabel>{link ? "Link title" : "New link title"}</FieldLabel>
        <Input {...form.register("title", { onChange: () => setError("") })} />
        {form.formState.errors.title && (
          <FieldError assertive>
            {form.formState.errors.title.message}
          </FieldError>
        )}
      </Field>
      <Field invalid={Boolean(form.formState.errors.url)}>
        <FieldLabel>URL</FieldLabel>
        <Input
          type="text"
          inputMode="url"
          {...form.register("url", { onChange: () => setError("") })}
        />
        {form.formState.errors.url && (
          <FieldError assertive>{form.formState.errors.url.message}</FieldError>
        )}
      </Field>

      <fieldset className="min-w-0 space-y-4 rounded-2xl border bg-background p-4">
        <legend className="px-1 font-semibold">Campaign and UTM</legend>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">Add campaign tracking</p>
            <p className="text-sm leading-5 text-muted-foreground">
              Build a tagged destination without replacing existing query
              parameters or the page fragment.
            </p>
          </div>
          <Switch
            checked={campaignEnabled}
            onCheckedChange={(checked) => {
              setCopied(false);
              form.setValue("campaignEnabled", checked, {
                shouldValidate: true,
              });
            }}
            aria-label="Add campaign tracking"
          />
        </div>

        {campaignEnabled ? (
          <div className="min-w-0 space-y-4">
            <div>
              <p className="text-sm font-medium">Quick presets</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(
                  [
                    ["Google Ads", "google", "cpc"],
                    ["Instagram", "instagram", "paid_social"],
                    ["Email", "newsletter", "email"],
                    ["QR code", "qr", "offline"],
                  ] as const
                ).map(([label, source, medium]) => (
                  <Button
                    key={label}
                    type="button"
                    variant="outline"
                    className="min-h-11 whitespace-normal px-2"
                    onClick={() => {
                      form.setValue("campaignSource", source, {
                        shouldValidate: true,
                      });
                      form.setValue("campaignMedium", medium, {
                        shouldValidate: true,
                      });
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <Field invalid={Boolean(form.formState.errors.campaignSource)}>
                <FieldLabel>Source</FieldLabel>
                <Input
                  placeholder="instagram"
                  {...form.register("campaignSource")}
                />
                {form.formState.errors.campaignSource ? (
                  <FieldError assertive>
                    {form.formState.errors.campaignSource.message}
                  </FieldError>
                ) : null}
              </Field>
              <Field invalid={Boolean(form.formState.errors.campaignMedium)}>
                <FieldLabel>Medium</FieldLabel>
                <Input
                  placeholder="paid_social"
                  {...form.register("campaignMedium")}
                />
                {form.formState.errors.campaignMedium ? (
                  <FieldError assertive>
                    {form.formState.errors.campaignMedium.message}
                  </FieldError>
                ) : null}
              </Field>
              <Field invalid={Boolean(form.formState.errors.campaignName)}>
                <FieldLabel>Campaign</FieldLabel>
                <Input
                  placeholder="summer-smiles"
                  {...form.register("campaignName")}
                />
                {form.formState.errors.campaignName || campaignValidation ? (
                  <FieldError assertive>
                    {form.formState.errors.campaignName?.message ??
                      campaignValidation}
                  </FieldError>
                ) : null}
              </Field>
              <Field invalid={Boolean(form.formState.errors.campaignContent)}>
                <FieldLabel>Content (optional)</FieldLabel>
                <Input
                  placeholder="profile-card"
                  {...form.register("campaignContent")}
                />
                {form.formState.errors.campaignContent ? (
                  <FieldError assertive>
                    {form.formState.errors.campaignContent.message}
                  </FieldError>
                ) : null}
              </Field>
              <Field invalid={Boolean(form.formState.errors.campaignTerm)}>
                <FieldLabel>Term (optional)</FieldLabel>
                <Input
                  placeholder="clear-aligners"
                  {...form.register("campaignTerm")}
                />
                {form.formState.errors.campaignTerm ? (
                  <FieldError assertive>
                    {form.formState.errors.campaignTerm.message}
                  </FieldError>
                ) : null}
              </Field>
            </div>
            <div className="min-w-0 rounded-xl border bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Final URL preview
              </p>
              <p
                className="mt-1 break-all text-sm leading-5"
                data-testid="campaign-url-preview"
              >
                {finalCampaignUrl || "Complete the required campaign fields"}
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!finalCampaignUrl}
                  className="min-h-11 flex-1"
                  onClick={async () => {
                    if (!finalCampaignUrl) return;
                    await navigator.clipboard.writeText(finalCampaignUrl);
                    setCopied(true);
                  }}
                >
                  <Copy aria-hidden="true" className="size-4" />
                  {copied ? "Copied" : "Copy campaign link"}
                </Button>
                {finalCampaignUrl ? (
                  <a
                    href={finalCampaignUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <ArrowSquareOut aria-hidden="true" className="size-4" />
                    Test link
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </fieldset>

      <fieldset className="space-y-3 rounded-2xl border bg-background p-4">
        <legend className="px-1 font-semibold">Image layout</legend>
        <p className="text-sm text-muted-foreground">
          Use a square image for a small icon or a wide image for a large card.
          Missing images fall back to a text-only link.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              ["none", "No image"],
              ["small-icon", "Small icon"],
              ["large-image", "Large image"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border bg-white px-3 py-2 has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary/20"
            >
              <input
                type="radio"
                name={`image-variant-${groupId}-${link?.id ?? "new"}`}
                value={value}
                checked={variant === value}
                onChange={() => chooseVariant(value)}
              />
              <span className="text-sm font-medium">{label}</span>
            </label>
          ))}
        </div>

        {variant !== "none" && (
          <div className="space-y-4">
            <Field invalid={Boolean(form.formState.errors.imageUrl)}>
              <FieldLabel>
                {imageUrl || imageFile ? "Replace image" : "Upload image"}
              </FieldLabel>
              <Input
                type="file"
                accept={LINK_IMAGE_ACCEPT}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const validation = validateLinkImage(file);
                  if (validation) {
                    setError(validation);
                    event.target.value = "";
                    return;
                  }
                  setError("");
                  setImageFile(file);
                  setPreviewUrl((current) => {
                    if (current.startsWith("blob:"))
                      URL.revokeObjectURL(current);
                    return URL.createObjectURL(file);
                  });
                }}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                JPEG, PNG, or WebP, up to 6 MB. Keep important content centred
                for responsive cropping.
              </p>
              {form.formState.errors.imageUrl && (
                <FieldError assertive>
                  {form.formState.errors.imageUrl.message}
                </FieldError>
              )}
            </Field>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">Decorative image</p>
                <p className="text-sm text-muted-foreground">
                  Turn this off when the image adds information not in the link
                  title.
                </p>
              </div>
              <Switch
                checked={decorative}
                onCheckedChange={(checked) => {
                  form.setValue("imageDecorative", checked, {
                    shouldValidate: true,
                  });
                  if (checked)
                    form.setValue("imageAlt", null, { shouldValidate: true });
                }}
                aria-label="Decorative image"
              />
            </div>
            {!decorative && (
              <Field invalid={Boolean(form.formState.errors.imageAlt)}>
                <FieldLabel>Image description</FieldLabel>
                <Input
                  maxLength={180}
                  {...form.register("imageAlt", {
                    setValueAs: (value) => value || null,
                  })}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Describe only what the image contributes; do not repeat the
                  link title.
                </p>
                {form.formState.errors.imageAlt && (
                  <FieldError assertive>
                    {form.formState.errors.imageAlt.message}
                  </FieldError>
                )}
              </Field>
            )}
          </div>
        )}
      </fieldset>

      <div className="space-y-2">
        <p className="text-sm font-semibold">Link preview</p>
        <div
          className={`mx-auto w-full max-w-md overflow-hidden rounded-2xl border bg-white shadow-sm ${
            featured ? "border-2 border-primary ring-2 ring-primary/15" : ""
          } ${variant === "small-icon" ? "flex items-center gap-3 p-2" : ""}`}
          data-testid="link-editor-preview"
          data-link-image-variant={variant}
          data-link-featured={featured ? "true" : "false"}
        >
          {variant !== "none" && previewUrl ? (
            // Dashboard-only preview of an explicitly owner-selected image.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={decorative ? "" : previewAlt}
              className={
                variant === "small-icon"
                  ? "size-12 shrink-0 rounded-xl object-cover"
                  : "block aspect-video w-full object-cover"
              }
            />
          ) : null}
          <p
            className={`break-words text-center font-semibold ${
              variant === "large-image" ? "p-4" : "flex-1 px-3 py-2"
            }`}
          >
            {previewTitle}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl border p-4">
        <div>
          <p className="font-medium">Feature this link</p>
          <p className="text-sm text-muted-foreground">
            Adds restrained emphasis. Up to three links per group can be
            featured.
          </p>
        </div>
        <Switch
          checked={featured}
          onCheckedChange={(checked) =>
            form.setValue("isFeatured", checked, { shouldValidate: true })
          }
          aria-label="Feature this link"
        />
      </div>

      <ErrorAlert title="Could not save link" message={error} />
      <p className="sr-only" aria-live="polite">
        {uploading ? "Uploading link image" : ""}
      </p>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          isPending={mutation.isPending || uploading}
          disabled={uploading}
        >
          {link ? "Update link" : "Add link"}
        </Button>
      </div>
    </form>
  );
}
