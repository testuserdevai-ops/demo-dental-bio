'use client'
import { useEffect, useState } from "react";
import FullRoundedButton from "../../components/Button/FullRoundedButton";
import LabeledInput from "../../dashboard/components/LabeledInput";
import ConfirmMessage from "../../components/Modal/ConfirmMessage";
import { useMessage } from "@/app/contexts/MessageContext";
import { WifiHigh, Trash, Plus } from "@phosphor-icons/react/dist/ssr";
import { formatDateAsDDMMYYYY } from "@/utils/formatDate";

interface AssociatedUser {
  email: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
}

interface BlockedIp {
  id: number;
  ip_address: string;
  reason: string | null;
  created_at: string;
  associated_users: AssociatedUser[];
}

const BlockedIpsManagement: React.FC = () => {
  const { setNotificationMessage } = useMessage();
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newIp, setNewIp] = useState('');
  const [newReason, setNewReason] = useState('');
  const [isAddingOpen, setIsAddingOpen] = useState(false);
  const [deleteIp, setDeleteIp] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const fetchBlockedIps = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/blocked-ips', { method: 'GET' });
      const data = await response.json();
      if (Array.isArray(data)) {
        setBlockedIps(data);
      }
    } catch (error) {
      console.error('Failed to fetch blocked IPs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockedIps();
  }, []);

  const handleAdd = async () => {
    if (!newIp.trim()) {
      setNotificationMessage({ message: 'IP address is required', type: 'error' });
      return;
    }

    try {
      const response = await fetch('/api/admin/blocked-ips', {
        method: 'POST',
        body: JSON.stringify({ ip_address: newIp.trim(), reason: newReason.trim() || null }),
      });

      if (response.ok) {
        setNotificationMessage({ message: 'IP blocked successfully', type: 'success' });
        setNewIp('');
        setNewReason('');
        setIsAddingOpen(false);
        fetchBlockedIps();
      } else {
        const data = await response.json();
        setNotificationMessage({ message: data.error || 'Failed to block IP', type: 'error' });
      }
    } catch {
      setNotificationMessage({ message: 'Failed to block IP', type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteIp) return;

    try {
      const response = await fetch('/api/admin/blocked-ips', {
        method: 'DELETE',
        body: JSON.stringify({ ip_address: deleteIp }),
      });

      if (response.ok) {
        setNotificationMessage({ message: 'IP unblocked successfully', type: 'success' });
        fetchBlockedIps();
      } else {
        setNotificationMessage({ message: 'Failed to unblock IP', type: 'error' });
      }
    } catch {
      setNotificationMessage({ message: 'Failed to unblock IP', type: 'error' });
    } finally {
      setIsConfirmOpen(false);
      setDeleteIp(null);
    }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <WifiHigh size={28} />
          Blocked IP Addresses
        </h2>
        <FullRoundedButton onClick={() => setIsAddingOpen(!isAddingOpen)} className="shadow-md">
          <Plus size={20} className="mr-1" />
          Block IP Address
        </FullRoundedButton>
      </div>

      {isAddingOpen && (
        <div className="bg-surface-alt border rounded-[26px] shadow-xl p-6 mb-6">
          <h3 className="font-semibold mb-4 text-gray-700">Block an IP Address</h3>
          <div className="space-y-3 max-w-md">
            <LabeledInput
              label="IP Address"
              name="ip_address"
              type="text"
              value={newIp}
              onChange={(e: any) => setNewIp(e.target.value)}
            />
            <LabeledInput
              label="Reason (optional)"
              name="reason"
              type="text"
              value={newReason}
              onChange={(e: any) => setNewReason(e.target.value)}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <FullRoundedButton onClick={() => setIsAddingOpen(false)} buttonType="danger">
              Cancel
            </FullRoundedButton>
            <FullRoundedButton onClick={handleAdd}>
              Block
            </FullRoundedButton>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-[26px] border border-gray-200 shadow-xl pb-1">
        <table className="w-full">
          <thead className="bg-primary-1 text-white">
            <tr>
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">#</th>
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">IP Address</th>
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">Reason</th>
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">Associated Users</th>
              <th className="border-b px-4 py-3 text-center text-sm font-semibold">Blocked At</th>
              <th className="border-b px-4 py-3 text-center text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  {Array.from({ length: 6 }).map((_, cellIndex) => (
                    <td key={`skeleton-cell-${cellIndex}`} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : blockedIps.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <WifiHigh size={48} className="mb-4 opacity-50" />
                    <p className="text-xl font-semibold">No blocked IPs</p>
                    <p className="text-sm mt-1">Block IP addresses from the user table above</p>
                  </div>
                </td>
              </tr>
            ) : (
              blockedIps.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50 text-sm text-gray-700">
                  <td className="px-4 py-3">{index + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs">{item.ip_address}</td>
                  <td className="px-4 py-3">{item.reason || '-'}</td>
                  <td className="px-4 py-3">
                    {item.associated_users && item.associated_users.length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        {item.associated_users.map((u, i) => (
                          <span key={i} className="text-xs text-gray-600">
                            @{u.username} <span className="text-gray-400">({u.email})</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">No linked accounts</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">{formatDateAsDDMMYYYY(item.created_at)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => {
                        setDeleteIp(item.ip_address);
                        setIsConfirmOpen(true);
                      }}
                      className="text-gray-600 hover:text-red-600 transition-colors inline-flex"
                      title="Unblock IP"
                    >
                      <Trash weight="fill" size={20} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmMessage
        title="Unblock IP?"
        description="Are you sure you want to unblock this IP address? Users from this IP will be able to register and sign in again."
        okText="Unblock"
        type="danger"
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setDeleteIp(null);
        }}
        onOk={handleDelete}
      />
    </div>
  );
};

export default BlockedIpsManagement;
