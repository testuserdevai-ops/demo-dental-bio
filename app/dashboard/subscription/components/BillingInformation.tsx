"use client";

import React, { useState, useEffect } from "react";
import { User, Envelope, Phone, MapPin, Building } from "@phosphor-icons/react";
import LabeledInput from "@/app/dashboard/components/LabeledInput";
import SaveButton from "@/app/dashboard/components/SaveButton";
import { apiClient } from "@/services/apiClient";

interface BillingInfo {
  email: string;
  name: string | null;
  phone: string | null;
  address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
  } | null;
  tax: {
    type: string | null;
    value: string | null;
  } | null;
}

interface BillingInformationProps {
  targetUserId?: string;
}

export default function BillingInformation({
  targetUserId,
}: BillingInformationProps) {
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingInfo();
  }, []);

  const fetchBillingInfo = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<BillingInfo>(
        "/api/subscription/billing-info",
      );

      setBillingInfo(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);

      const updateData: any = {
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        address: {
          line1: formData.get("address_line1") as string,
          line2: formData.get("address_line2") as string,
          city: formData.get("city") as string,
          state: formData.get("state") as string,
          postal_code: formData.get("postal_code") as string,
          country: formData.get("country") as string,
        },
        tax: {
          type: formData.get("tax_type") as string,
          value: formData.get("tax_value") as string,
        },
      };

      // Remove empty fields
      Object.keys(updateData).forEach((key) => {
        if (
          updateData[key] === null ||
          updateData[key] === "" ||
          (typeof updateData[key] === "object" &&
            Object.values(updateData[key]).every((v) => !v))
        ) {
          delete updateData[key];
        }
      });

      if (updateData.address) {
        Object.keys(updateData.address).forEach((key) => {
          if (!updateData.address[key]) {
            delete updateData.address[key];
          }
        });
        if (Object.keys(updateData.address).length === 0) {
          delete updateData.address;
        }
      }

      if (updateData.tax) {
        Object.keys(updateData.tax).forEach((key) => {
          if (!updateData.tax[key]) {
            delete updateData.tax[key];
          }
        });
        if (Object.keys(updateData.tax).length === 0) {
          delete updateData.tax;
        }
      }

      await apiClient.put("/api/subscription/billing-info", updateData);

      await fetchBillingInfo();
      alert("Billing information updated successfully!");
    } catch (err: any) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-1"></div>
      </div>
    );
  }

  if (error && !billingInfo) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-[26px] p-6 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[26px] p-6 border border-neutral-200">
      <h4 className="text-lg font-semibold text-dark mb-6">
        Billing Information
      </h4>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-[20px] text-red-600 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <LabeledInput
            name="name"
            label="Full Name"
            defaultValue={billingInfo?.name || ""}
            placeholder="Enter your full name"
            disabled={saving}
          >
            <User
              size={24}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500"
            />
          </LabeledInput>
        </div>

        {/* Email */}
        <div>
          <LabeledInput
            name="email"
            label="Email"
            type="email"
            defaultValue={billingInfo?.email || ""}
            placeholder="Enter your email"
            disabled={saving}
          >
            <Envelope
              size={24}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500"
            />
          </LabeledInput>
        </div>

        {/* Phone */}
        <div>
          <LabeledInput
            name="phone"
            label="Phone Number"
            type="tel"
            defaultValue={billingInfo?.phone || ""}
            placeholder="Enter your phone number"
            disabled={saving}
          >
            <Phone
              size={24}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500"
            />
          </LabeledInput>
        </div>

        {/* Address */}
        <div className="pt-4 border-t border-neutral-200">
          <h5 className="text-base font-semibold text-dark mb-4 flex items-center gap-2">
            <MapPin size={20} />
            Address
          </h5>
          <div className="space-y-4">
            <LabeledInput
              name="address_line1"
              label="Address Line 1"
              defaultValue={billingInfo?.address?.line1 || ""}
              placeholder="Street address"
              disabled={saving}
            />
            <LabeledInput
              name="address_line2"
              label="Address Line 2 (Optional)"
              defaultValue={billingInfo?.address?.line2 || ""}
              placeholder="Apartment, suite, etc."
              disabled={saving}
            />
            <div className="grid grid-cols-2 gap-4">
              <LabeledInput
                name="city"
                label="City"
                defaultValue={billingInfo?.address?.city || ""}
                placeholder="City"
                disabled={saving}
              />
              <LabeledInput
                name="state"
                label="State/Province"
                defaultValue={billingInfo?.address?.state || ""}
                placeholder="State or Province"
                disabled={saving}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <LabeledInput
                name="postal_code"
                label="Postal Code"
                defaultValue={billingInfo?.address?.postal_code || ""}
                placeholder="Postal code"
                disabled={saving}
              />
              <LabeledInput
                name="country"
                label="Country"
                defaultValue={billingInfo?.address?.country || ""}
                placeholder="Country"
                disabled={saving}
              />
            </div>
          </div>
        </div>

        {/* Tax Information */}
        <div className="pt-4 border-t border-neutral-200">
          <h5 className="text-base font-semibold text-dark mb-4 flex items-center gap-2">
            <Building size={20} />
            Tax Information (Optional)
          </h5>
          <div className="grid grid-cols-2 gap-4">
            <LabeledInput
              name="tax_type"
              label="Tax ID Type"
              defaultValue={billingInfo?.tax?.type || ""}
              placeholder="e.g., VAT, GST"
              disabled={saving}
            />
            <LabeledInput
              name="tax_value"
              label="Tax ID Number"
              defaultValue={billingInfo?.tax?.value || ""}
              placeholder="Enter tax ID"
              disabled={saving}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 flex justify-end">
          <SaveButton text="Save Billing Information" disabled={saving} />
        </div>
      </form>
    </div>
  );
}
