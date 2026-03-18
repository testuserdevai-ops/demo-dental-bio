'use client'
import { useEffect, useState } from "react";
import ReactPaginate from 'react-paginate';
import { CaretDown, ShieldWarning } from "@phosphor-icons/react/dist/ssr";
import FullRoundedButton from "../../../components/Button/FullRoundedButton";
import LabeledInput from "../../../dashboard/components/LabeledInput";

interface SecurityLog {
  id: number;
  event_type: string;
  email: string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  fingerprint: string | null;
  country: string | null;
  location: string | null;
  route: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

const EVENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  blocked_domain: { label: 'Domain', color: 'bg-orange-500' },
  blocked_fingerprint: { label: 'Fingerprint', color: 'bg-red-500' },
  blocked_ip: { label: 'IP', color: 'bg-red-600' },
  blocked_user: { label: 'User', color: 'bg-purple-500' },
};

const SecurityLogs: React.FC = () => {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ event_type: '', email: '', ip: '' });
  const [draftFilters, setDraftFilters] = useState({ event_type: '', email: '', ip: '' });

  const pageSizeOptions = [10, 25, 50, 100];

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters.event_type && { event_type: filters.event_type }),
        ...(filters.email && { email: filters.email }),
        ...(filters.ip && { ip: filters.ip }),
      });

      const response = await fetch(`/api/admin/security-logs?${params}`, { method: 'GET' });
      const result = await response.json();
      setLogs(result.data || []);
      setTotal(result.count || 0);
    } catch (error) {
      console.error('Failed to fetch security logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, limit, filters]);

  const applyFilters = () => {
    setFilters(draftFilters);
    setPage(1);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    const empty = { event_type: '', email: '', ip: '' };
    setDraftFilters(empty);
    setFilters(empty);
    setPage(1);
    setIsFilterOpen(false);
  };

  const totalPages = Math.ceil(total / limit);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ShieldWarning size={28} />
          Security Logs
          {total > 0 && <span className="text-sm font-normal text-gray-500">({total} events)</span>}
        </h2>

        <div className="flex items-center gap-4">
          <div className="relative">
            <FullRoundedButton
              onClick={() => {
                setIsFilterOpen(!isFilterOpen);
                if (!isFilterOpen) setDraftFilters(filters);
              }}
              className="shadow-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
              Filters
            </FullRoundedButton>

            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-surface-alt border rounded-[26px] shadow-xl z-10">
                <div className="p-4 space-y-3">
                  <h3 className="font-semibold mb-2 text-gray-700">Filter Logs</h3>

                  <div className="relative">
                    <select
                      value={draftFilters.event_type}
                      onChange={(e) => setDraftFilters(prev => ({ ...prev, event_type: e.target.value }))}
                      className="w-full appearance-none p-2 rounded-[26px] h-[50px] py-2 text-base px-3 text-neutral-800 pr-10 outline-none cursor-pointer"
                    >
                      <option value="">All Event Types</option>
                      <option value="blocked_domain">Blocked Domain</option>
                      <option value="blocked_fingerprint">Blocked Fingerprint</option>
                      <option value="blocked_ip">Blocked IP</option>
                      <option value="blocked_user">Blocked User</option>
                    </select>
                    <CaretDown size={20} weight="bold" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500 pointer-events-none" />
                  </div>

                  <LabeledInput
                    label="Email"
                    name="email"
                    type="text"
                    value={draftFilters.email}
                    onChange={(e: any) => setDraftFilters(prev => ({ ...prev, email: e.target.value }))}
                  />
                  <LabeledInput
                    label="IP Address"
                    name="ip"
                    type="text"
                    value={draftFilters.ip}
                    onChange={(e: any) => setDraftFilters(prev => ({ ...prev, ip: e.target.value }))}
                  />
                </div>
                <div className="border-t p-4 flex justify-end space-x-2 bg-gray-50 rounded-b-[26px]">
                  <FullRoundedButton onClick={clearFilters} buttonType="danger">
                    Clear
                  </FullRoundedButton>
                  <FullRoundedButton onClick={applyFilters}>
                    Apply
                  </FullRoundedButton>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">Rows per page:</label>
            <div className="relative">
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                className="w-24 appearance-none p-2 rounded-[26px] h-[50px] py-2 text-base px-3 text-neutral-800 pr-10 outline-none cursor-pointer"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <CaretDown size={20} weight="bold" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500 pointer-events-none" />
            </div>
          </div>

          <ReactPaginate
            previousLabel="<"
            nextLabel=">"
            breakLabel="..."
            pageCount={totalPages}
            marginPagesDisplayed={1}
            pageRangeDisplayed={3}
            onPageChange={({ selected }) => setPage(selected + 1)}
            forcePage={page - 1}
            containerClassName="flex items-center gap-1 min-w-fit mb-0"
            pageClassName="px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer"
            activeClassName="!bg-primary-1 hover:!bg-primary-2 text-white cursor-pointer"
            previousClassName="px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer no-underline pagination-ctrl-btn"
            nextClassName="px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer no-underline pagination-ctrl-btn"
            disabledClassName="opacity-50 cursor-not-allowed hover:bg-transparent"
            breakClassName="px-3 py-2"
          />
        </div>
      )}

      {/* Logs table */}
      <div className="overflow-x-auto rounded-[26px] border border-gray-200 shadow-xl pb-1">
        <table className="w-full min-w-[1200px]">
          <thead className="bg-primary-1 text-white">
            <tr>
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">#</th>
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">Event</th>
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">Email</th>
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">Name</th>
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">IP Address</th>
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">Fingerprint</th>
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">Country</th>
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">Route</th>
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">Details</th>
              <th className="border-b px-4 py-3 text-center text-sm font-semibold">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              Array.from({ length: Math.min(limit, 10) }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  {Array.from({ length: 10 }).map((_, cellIndex) => (
                    <td key={`skeleton-cell-${cellIndex}`} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <ShieldWarning size={48} className="mb-4 opacity-50" />
                    <p className="text-xl font-semibold">No security events</p>
                    <p className="text-sm mt-1">Blocked attempts will appear here</p>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log, index) => {
                const eventConfig = EVENT_TYPE_LABELS[log.event_type] || { label: log.event_type, color: 'bg-gray-500' };
                return (
                  <tr key={log.id} className="hover:bg-gray-50 text-sm text-gray-700">
                    <td className="px-4 py-3">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white ${eventConfig.color}`}>
                        {eventConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">{log.email || '-'}</td>
                    <td className="px-4 py-3 text-xs">
                      {log.first_name || log.last_name
                        ? `${log.first_name || ''} ${log.last_name || ''}`.trim()
                        : '-'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{log.ip_address || '-'}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {log.fingerprint
                        ? <span title={log.fingerprint}>{log.fingerprint.substring(0, 10)}...</span>
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs">{log.country || '-'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{log.route || '-'}</td>
                    <td className="px-4 py-3 text-xs max-w-[200px] truncate" title={log.details ? JSON.stringify(log.details) : ''}>
                      {log.details ? Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(', ') : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-center whitespace-nowrap">{formatDate(log.created_at)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom pagination controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">Rows per page:</label>
            <div className="relative">
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                className="w-24 appearance-none p-2 rounded-[26px] h-[50px] py-2 text-base px-3 text-neutral-800 pr-10 outline-none cursor-pointer"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <CaretDown size={20} weight="bold" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500 pointer-events-none" />
            </div>
          </div>

          <ReactPaginate
            previousLabel="<"
            nextLabel=">"
            breakLabel="..."
            pageCount={totalPages}
            marginPagesDisplayed={1}
            pageRangeDisplayed={3}
            onPageChange={({ selected }) => setPage(selected + 1)}
            forcePage={page - 1}
            containerClassName="flex items-center gap-1 min-w-fit mb-0"
            pageClassName="px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer"
            activeClassName="!bg-primary-1 hover:!bg-primary-2 text-white cursor-pointer"
            previousClassName="px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer no-underline pagination-ctrl-btn"
            nextClassName="px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer no-underline pagination-ctrl-btn"
            disabledClassName="opacity-50 cursor-not-allowed hover:bg-transparent"
            breakClassName="px-3 py-2"
          />
        </div>
      )}
    </div>
  );
};

export default SecurityLogs;
