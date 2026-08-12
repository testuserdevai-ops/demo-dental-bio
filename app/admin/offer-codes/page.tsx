import { requireAdminPageCapability } from "@/lib/admin/actor";
import OfferCodeManagement from "../components/OfferCodeManagement";

export default async function AdminOfferCodesPage() {
  await requireAdminPageCapability("marketing:manage");
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Offer Code Management
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
          Find and maintain the university offer codes available during account
          registration.
        </p>
      </header>
      <OfferCodeManagement />
    </div>
  );
}
