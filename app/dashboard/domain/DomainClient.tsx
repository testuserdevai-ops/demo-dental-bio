"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowClockwise, Plugs, Trash } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { Skeleton } from "@/app/components/ui/skeleton";
import { apiClient } from "@/services/apiClient";
import { CopyValue } from "./CopyValue";
import { connectDomainSchema, type ConnectDomainInput } from "./_lib/schemas";

type DnsRecord = { type: "A" | "CNAME"; name: string; value: string };
type Verification = { type: string; domain: string; value: string };
type DomainStatus = {
  domain: string | null;
  verified: boolean;
  misconfigured?: boolean;
  records?: DnsRecord[];
  verification?: Verification[];
};

const domainKey = ["dashboard", "custom-domain"] as const;

export default function DomainClient() {
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: domainKey,
    queryFn: () => apiClient.get<DomainStatus>("/api/user/domain"),
    retry: false,
  });
  const form = useForm<ConnectDomainInput>({
    resolver: zodResolver(connectDomainSchema),
    defaultValues: { domain: "" },
  });
  const connect = useMutation({
    mutationFn: (value: ConnectDomainInput) =>
      apiClient.post<DomainStatus>("/api/user/domain", value),
    retry: false,
    onSuccess: (data) => {
      queryClient.setQueryData(domainKey, data);
      form.reset();
      toast.success("Domain connected. Configure the DNS record below.");
    },
    onError: (error) =>
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Failed to add domain",
      }),
  });
  const recheck = useMutation({
    mutationFn: async () => {
      await apiClient.put("/api/user/domain").catch(() => undefined);
      const data = await apiClient.get<DomainStatus>("/api/user/domain");
      queryClient.setQueryData(domainKey, data);
      return data;
    },
    retry: false,
    onSuccess: () => toast.success("Domain status refreshed"),
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Status refresh failed",
      ),
  });
  const remove = useMutation({
    mutationFn: () => apiClient.delete<DomainStatus>("/api/user/domain"),
    retry: false,
    onSuccess: (data) => {
      queryClient.setQueryData(domainKey, { ...data, verified: false });
      toast.success("Domain disconnected");
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Failed to remove domain",
      ),
  });

  if (status.isPending) {
    return (
      <div
        className="space-y-4 rounded-3xl border border-border bg-white p-5 shadow-sm sm:p-6"
        aria-label="Loading custom domain"
        data-testid="domain-manager"
      >
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-11 w-full" />
      </div>
    );
  }

  if (status.isError) {
    return (
      <Alert variant="destructive" role="alert" data-testid="domain-manager">
        <AlertTitle>Custom domain could not be loaded</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          <span>{status.error.message}</span>
          <Button
            type="button"
            variant="outline"
            onClick={() => status.refetch()}
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!status.data.domain) {
    const rootError = form.formState.errors.root?.message;
    return (
      <form
        noValidate
        data-testid="domain-manager"
        onSubmit={form.handleSubmit((value) => connect.mutate(value))}
        className="space-y-4 rounded-3xl border border-border bg-white p-5 shadow-sm sm:p-6"
      >
        <div>
          <h3 className="text-lg font-semibold">Connect your domain</h3>
          <p className="text-sm text-muted-foreground">
            Use your root domain or a dedicated subdomain for this bio.
          </p>
        </div>
        <Field
          id="custom-domain"
          invalid={Boolean(form.formState.errors.domain)}
        >
          <FieldLabel>Your domain</FieldLabel>
          <Input
            placeholder="example.com or links.example.com"
            autoCapitalize="none"
            autoCorrect="off"
            {...form.register("domain")}
          />
          {form.formState.errors.domain && (
            <FieldError assertive>
              {form.formState.errors.domain.message}
            </FieldError>
          )}
        </Field>
        {rootError && (
          <p role="alert" className="text-sm text-destructive">
            {rootError}
          </p>
        )}
        <Button type="submit" isPending={connect.isPending}>
          <Plugs aria-hidden="true" className="size-5" />
          Connect domain
        </Button>
      </form>
    );
  }

  const verified = status.data.verified;
  return (
    <section
      data-testid="domain-manager"
      className="space-y-5 rounded-3xl border border-border bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-dark">
            {status.data.domain}
          </h3>
          <span
            className={`mt-1 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
              verified
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {verified ? "Active" : "Pending DNS configuration"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => recheck.mutate()}
            isPending={recheck.isPending}
          >
            <ArrowClockwise aria-hidden="true" className="size-5" />
            Re-check
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive">
                <Trash aria-hidden="true" className="size-5" />
                Remove
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect custom domain?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your public profile will no longer be reachable from this
                  domain.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => remove.mutate()}>
                  Disconnect domain
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {!verified ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add this DNS record at your registrar. SSL is provisioned after the
            record propagates, which may take a few minutes or several hours.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <div className="min-w-[440px] p-4">
              <div className="grid grid-cols-[60px_120px_1fr] gap-4 pb-2 text-sm text-muted-foreground">
                <span>Type</span>
                <span>Name / Host</span>
                <span>Value</span>
              </div>
              {(status.data.records ?? []).map((record) => (
                <div
                  key={`${record.type}-${record.name}-${record.value}`}
                  className="grid grid-cols-[60px_120px_1fr] items-center gap-4 border-t border-border py-3"
                >
                  <span className="font-mono">{record.type}</span>
                  <span className="font-mono">{record.name}</span>
                  <CopyValue value={record.value} />
                </div>
              ))}
            </div>
          </div>
          {(status.data.verification ?? []).length > 0 && (
            <div className="space-y-2">
              <p className="font-semibold text-dark">
                Add this TXT record to verify ownership:
              </p>
              {status.data.verification!.map((record) => (
                <div key={`${record.type}-${record.domain}-${record.value}`}>
                  <span className="text-sm font-mono text-muted-foreground">
                    {record.type} · {record.domain}
                  </span>
                  <CopyValue value={record.value} />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Your profile is live at{" "}
          <a
            href={`https://${status.data.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            https://{status.data.domain}
          </a>
          .
        </p>
      )}
    </section>
  );
}
