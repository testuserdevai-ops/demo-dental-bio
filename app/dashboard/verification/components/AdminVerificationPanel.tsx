"use client";

import { useEffect, useState } from "react";
import {
  SealCheck,
  ShieldWarning,
  ArrowClockwise,
} from "@phosphor-icons/react";
import ConfirmMessage from "@/app/components/Modal/ConfirmMessage";
import { usePreview } from "@/app/contexts/PreviewContext";
import { apiClient } from "@/services/apiClient";

type AdminVerificationPanelProps = {
  targetUserId: string;
};

export default function AdminVerificationPanel({
  targetUserId,
}: AdminVerificationPanelProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userLabel, setUserLabel] = useState<string>("");
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [pendingNextState, setPendingNextState] = useState<boolean | null>(
    null,
  );
  const { triggerReload } = usePreview();

  const refresh = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await apiClient.post("/api/user", { targetUserId });
      if (!data) {
        throw new Error("Failed to load target user");
      }
      setIsVerified(Boolean(data.isVerified));
      const label = data.username || data.email || data.id || "Target user";
      setUserLabel(label);
    } catch (e: any) {
      setError(e.message || "Failed to load target user");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId]);

  const openConfirm = () => {
    const next = !isVerified;
    setPendingNextState(next);
    setConfirmOpen(true);
  };

  const onConfirm = async () => {
    if (pendingNextState === null) return;
    const next = pendingNextState;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiClient.post("/api/admin/verification", {
        targetUserId,
        isVerified: next,
      });
      setIsVerified(next);
      setSuccess(
        next
          ? "Verification has been granted."
          : "Verification has been removed.",
      );
    } catch (e: any) {
      setError(e.message || "Failed to update verification status");
    } finally {
      triggerReload();
      setSaving(false);
      setConfirmOpen(false);
      setPendingNextState(null);
    }
  };

  return (
    <div className="p-4 sm:p-5 bg-white rounded-[26px] border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="mb-1">Manage Account Verification</h4>
          <p className="text-sm text-gray-500">
            You are viewing another user's profile. You can grant or remove the
            verification badge for this account.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          disabled={loading}
          title="Refresh"
        >
          <ArrowClockwise size={18} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
      {success && <div className="mb-3 text-sm text-green-600">{success}</div>}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isVerified ? (
            <SealCheck size={28} weight="fill" color="#49ADF4" />
          ) : (
            <ShieldWarning size={28} />
          )}
          <div>
            <div className="text-sm text-gray-500">Account</div>
            <div className="font-semibold">{userLabel}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${isVerified ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-600"}`}
          >
            {isVerified ? "Verified" : "Not Verified"}
          </span>
          <button
            type="button"
            onClick={openConfirm}
            disabled={loading || saving}
            className={`${isVerified ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-primary-1 text-white hover:opacity-90"} px-4 py-2 rounded-full font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isVerified ? "Remove verification" : "Mark as verified"}
          </button>
        </div>
      </div>

      <ConfirmMessage
        title={
          pendingNextState
            ? "Mark account as verified?"
            : "Remove verification?"
        }
        description={
          pendingNextState
            ? "Are you sure you want to mark this account as verified? This grants a verification badge and may impact trust indicators across the platform."
            : "Are you sure you want to remove verification from this account? The verification badge will be removed immediately."
        }
        okText={pendingNextState ? "Mark as verified" : "Remove verification"}
        cancelText="Cancel"
        isOpen={confirmOpen}
        okLoading={saving}
        onClose={() => {
          setConfirmOpen(false);
          setPendingNextState(null);
        }}
        onOk={onConfirm}
      />
    </div>
  );
}
