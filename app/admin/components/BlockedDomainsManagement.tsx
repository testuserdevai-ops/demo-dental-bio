'use client'
import { useEffect, useState } from "react";
import FullRoundedButton from "../../components/Button/FullRoundedButton";
import LabeledInput from "../../dashboard/components/LabeledInput";
import ConfirmMessage from "../../components/Modal/ConfirmMessage";
import { useMessage } from "@/app/contexts/MessageContext";
import { Globe, Trash, Plus } from "@phosphor-icons/react/dist/ssr";
import { formatDateAsDDMMYYYY } from "@/utils/formatDate";

interface BlockedDomain {
  id: number;
  domain: string;
  is_active: boolean;
  created_at: string;
}

const BlockedDomainsManagement: React.FC = () => {
  const { setNotificationMessage } = useMessage();
  const [domains, setDomains] = useState<BlockedDomain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newDomain, setNewDomain] = useState('');
  const [isAddingOpen, setIsAddingOpen] = useState(false);
  const [deleteDomain, setDeleteDomain] = useState<BlockedDomain | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchDomains = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/blocked-domains', { method: 'GET' });
      const data = await response.json();
      if (Array.isArray(data)) {
        setDomains(data);
      }
    } catch (error) {
      console.error('Failed to fetch blocked domains:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleAdd = async () => {
    if (!newDomain.trim()) {
      setNotificationMessage({ message: 'Domain is required', type: 'error' });
      return;
    }

    try {
      const response = await fetch('/api/admin/blocked-domains', {
        method: 'POST',
        body: JSON.stringify({ domain: newDomain.trim() }),
      });

      if (response.ok) {
        setNotificationMessage({ message: 'Domain blocked successfully', type: 'success' });
        setNewDomain('');
        setIsAddingOpen(false);
        fetchDomains();
      } else {
        const data = await response.json();
        setNotificationMessage({ message: data.error || 'Failed to block domain', type: 'error' });
      }
    } catch {
      setNotificationMessage({ message: 'Failed to block domain', type: 'error' });
    }
  };

  const handleToggle = async (domain: BlockedDomain) => {
    setTogglingId(domain.id);
    try {
      const response = await fetch('/api/admin/blocked-domains', {
        method: 'PATCH',
        body: JSON.stringify({ id: domain.id, is_active: !domain.is_active }),
      });

      if (response.ok) {
        setDomains(prev =>
          prev.map(d => d.id === domain.id ? { ...d, is_active: !d.is_active } : d)
        );
        setNotificationMessage({
          message: `Domain ${!domain.is_active ? 'enabled' : 'disabled'} successfully`,
          type: 'success',
        });
      } else {
        setNotificationMessage({ message: 'Failed to update domain status', type: 'error' });
      }
    } catch {
      setNotificationMessage({ message: 'Failed to update domain status', type: 'error' });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteDomain) return;

    try {
      const response = await fetch('/api/admin/blocked-domains', {
        method: 'DELETE',
        body: JSON.stringify({ id: deleteDomain.id }),
      });

      if (response.ok) {
        setNotificationMessage({ message: 'Domain removed successfully', type: 'success' });
        fetchDomains();
      } else {
        setNotificationMessage({ message: 'Failed to remove domain', type: 'error' });
      }
    } catch {
      setNotificationMessage({ message: 'Failed to remove domain', type: 'error' });
    } finally {
      setIsConfirmOpen(false);
      setDeleteDomain(null);
    }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Globe size={28} />
          Blocked Domains
        </h2>
        <FullRoundedButton onClick={() => setIsAddingOpen(!isAddingOpen)} className="shadow-md">
          <Plus size={20} className="mr-1" />
          Block Domain
        </FullRoundedButton>
      </div>

      {isAddingOpen && (
        <div className="bg-surface-alt border rounded-[26px] shadow-xl p-6 mb-6">
          <h3 className="font-semibold mb-4 text-gray-700">Block an Email Domain</h3>
          <div className="space-y-3 max-w-md">
            <LabeledInput
              label="Domain"
              name="domain"
              type="text"
              value={newDomain}
              onChange={(e: any) => setNewDomain(e.target.value)}
              placeholder="example.com"
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
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">Domain</th>
              <th className="border-b px-4 py-3 text-center text-sm font-semibold">Status</th>
              <th className="border-b px-4 py-3 text-center text-sm font-semibold">Added At</th>
              <th className="border-b px-4 py-3 text-center text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  {Array.from({ length: 5 }).map((_, cellIndex) => (
                    <td key={`skeleton-cell-${cellIndex}`} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : domains.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <Globe size={48} className="mb-4 opacity-50" />
                    <p className="text-xl font-semibold">No blocked domains</p>
                    <p className="text-sm mt-1">Add email domains to block registration from them</p>
                  </div>
                </td>
              </tr>
            ) : (
              domains.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50 text-sm text-gray-700">
                  <td className="px-4 py-3">{index + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs">{item.domain}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggle(item)}
                      disabled={togglingId === item.id}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        item.is_active ? 'bg-green-500' : 'bg-gray-300'
                      } ${togglingId === item.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      title={item.is_active ? 'Click to disable' : 'Click to enable'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          item.is_active ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">{formatDateAsDDMMYYYY(item.created_at)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => {
                        setDeleteDomain(item);
                        setIsConfirmOpen(true);
                      }}
                      className="text-gray-600 hover:text-red-600 transition-colors inline-flex"
                      title="Remove domain"
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
        title="Remove Domain?"
        description={`Are you sure you want to remove "${deleteDomain?.domain}" from the blocked list? Users with this email domain will be able to register.`}
        okText="Remove"
        type="danger"
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setDeleteDomain(null);
        }}
        onOk={handleDelete}
      />
    </div>
  );
};

export default BlockedDomainsManagement;
