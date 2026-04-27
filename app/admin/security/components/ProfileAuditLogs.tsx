'use client'
import { useEffect, useState } from "react";
import ReactPaginate from 'react-paginate';
import { CaretDown, ClockCounterClockwise, FunnelSimple, X, Eye } from "@phosphor-icons/react/dist/ssr";
import LabeledInput from "../../../dashboard/components/LabeledInput";

interface UserStub {
  id: string;
  email: string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface AuditLog {
  id: number;
  user_id: string;
  actor_id: string | null;
  actor_role: 'self' | 'admin' | 'system' | null;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_keys: string[];
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  subject: UserStub | null;
  actor: UserStub | null;
}

const TABLE_OPTIONS = [
  { value: '',                   label: 'All Tables'        },
  { value: 'users',              label: 'Users'             },
  { value: 'dentistries',        label: 'Dentistries'       },
  { value: 'socials',            label: 'Socials'           },
  { value: 'link_groups',        label: 'Link Groups'       },
  { value: 'links',              label: 'Links'             },
  { value: 'dentistry_links',    label: 'Link Junctions'    },
  { value: 'galleries',          label: 'Galleries'         },
  { value: 'general_galleries',  label: 'General Galleries' },
  { value: 'reviews',            label: 'Reviews'           },
];

const OPERATION_STYLES: Record<string, { bg: string; text: string }> = {
  INSERT: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  UPDATE: { bg: 'bg-amber-100',   text: 'text-amber-700'   },
  DELETE: { bg: 'bg-rose-100',    text: 'text-rose-700'    },
};

const ACTOR_STYLES: Record<string, { bg: string; text: string }> = {
  self:   { bg: 'bg-slate-100',   text: 'text-slate-700'   },
  admin:  { bg: 'bg-violet-100',  text: 'text-violet-700'  },
  system: { bg: 'bg-sky-100',     text: 'text-sky-700'     },
};

const formatUser = (u: UserStub | null) => {
  if (!u) return null;
  return u.email || u.username || `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.id;
};

const ProfileAuditLogs: React.FC = () => {
  const [logs,         setLogs]         = useState<AuditLog[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [page,         setPage]         = useState(1);
  const [limit,        setLimit]        = useState(25);
  const [total,        setTotal]        = useState(0);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters,      setFilters]      = useState({ table_name: '', operation: '', actor_role: '', email: '' });
  const [draftFilters, setDraftFilters] = useState({ table_name: '', operation: '', actor_role: '', email: '' });
  const [detailLog,    setDetailLog]    = useState<AuditLog | null>(null);

  const pageSizeOptions = [10, 25, 50, 100];
  const totalPages = Math.ceil(total / limit);
  const activeFilterCount =
    [filters.table_name, filters.operation, filters.actor_role, filters.email].filter(Boolean).length;

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters.table_name && { table_name: filters.table_name }),
        ...(filters.operation  && { operation:  filters.operation  }),
        ...(filters.actor_role && { actor_role: filters.actor_role }),
        ...(filters.email      && { email:      filters.email      }),
      });
      const res = await fetch(`/api/admin/profile-audit-log?${params}`);
      const result = await res.json();
      setLogs(result.data  || []);
      setTotal(result.count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [page, limit, filters]);

  const applyFilters = () => {
    setFilters(draftFilters);
    setPage(1);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    const empty = { table_name: '', operation: '', actor_role: '', email: '' };
    setDraftFilters(empty);
    setFilters(empty);
    setPage(1);
    setIsFilterOpen(false);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

  return (
    <div className="max-w-[1400px] mx-auto px-6 sm:px-8 py-8">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* ── Section header ──────────────────────────────────────────── */}
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
              <ClockCounterClockwise size={20} weight="fill" className="text-slate-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Profile Activity</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {isLoading ? 'Loading…' : `${total.toLocaleString()} change${total !== 1 ? 's' : ''} recorded`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setIsFilterOpen(!isFilterOpen); if (!isFilterOpen) setDraftFilters(filters); }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                activeFilterCount > 0
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FunnelSimple size={15} />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-white/20 text-white text-xs flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Filter panel ─────────────────────────────────────────────── */}
        {isFilterOpen && (
          <div className="px-6 py-5 border-b border-gray-100 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Filter Activity</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <select
                  value={draftFilters.table_name}
                  onChange={(e) => setDraftFilters(prev => ({ ...prev, table_name: e.target.value }))}
                  className="w-full appearance-none bg-white border border-gray-200 rounded-xl h-11 px-3 pr-9 text-sm text-gray-800 outline-none focus:border-slate-400 cursor-pointer"
                >
                  {TABLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <CaretDown size={14} weight="bold" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={draftFilters.operation}
                  onChange={(e) => setDraftFilters(prev => ({ ...prev, operation: e.target.value }))}
                  className="w-full appearance-none bg-white border border-gray-200 rounded-xl h-11 px-3 pr-9 text-sm text-gray-800 outline-none focus:border-slate-400 cursor-pointer"
                >
                  <option value="">All Operations</option>
                  <option value="INSERT">Insert</option>
                  <option value="UPDATE">Update</option>
                  <option value="DELETE">Delete</option>
                </select>
                <CaretDown size={14} weight="bold" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={draftFilters.actor_role}
                  onChange={(e) => setDraftFilters(prev => ({ ...prev, actor_role: e.target.value }))}
                  className="w-full appearance-none bg-white border border-gray-200 rounded-xl h-11 px-3 pr-9 text-sm text-gray-800 outline-none focus:border-slate-400 cursor-pointer"
                >
                  <option value="">All Actors</option>
                  <option value="self">Self</option>
                  <option value="admin">Admin</option>
                  <option value="system">System</option>
                </select>
                <CaretDown size={14} weight="bold" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <LabeledInput
                label="User Email"
                name="email"
                type="text"
                value={draftFilters.email}
                onChange={(e: any) => setDraftFilters(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <X size={14} />
                Clear
              </button>
              <button
                onClick={applyFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* ── Table ────────────────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide w-10">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Operation</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Table</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Profile (subject)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Changed Fields</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Actor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">IP Address</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Time</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: Math.min(limit, 8) }).map((_, i) => (
                  <tr key={i} className="bg-white">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 bg-gray-100 rounded-full animate-pulse" style={{ width: `${60 + (j * 17) % 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center bg-white">
                    <ClockCounterClockwise size={40} className="mx-auto mb-3 text-gray-300" weight="fill" />
                    <p className="font-medium text-gray-500">No activity recorded</p>
                    <p className="text-xs text-gray-400 mt-1">Profile changes will appear here as they happen</p>
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => {
                  const op    = OPERATION_STYLES[log.operation] ?? { bg: 'bg-gray-100', text: 'text-gray-600' };
                  const role  = log.actor_role ? ACTOR_STYLES[log.actor_role] : null;
                  const subj  = formatUser(log.subject);
                  const actor = formatUser(log.actor);
                  return (
                    <tr key={log.id} className="bg-white hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-400">{(page - 1) * limit + i + 1}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${op.bg} ${op.text}`}>
                          {log.operation}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{log.table_name}</td>
                      <td className="px-4 py-3 text-xs text-gray-700">
                        {subj || <span className="text-gray-300 font-mono">{log.user_id.slice(0, 8)}…</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-[240px]">
                        {log.changed_keys.length > 0 ? (
                          <div className="flex flex-wrap gap-1" title={log.changed_keys.join(', ')}>
                            {log.changed_keys.slice(0, 3).map((k) => (
                              <span key={k} className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                                {k}
                              </span>
                            ))}
                            {log.changed_keys.length > 3 && (
                              <span className="text-[10px] text-gray-400">+{log.changed_keys.length - 3}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {log.actor_role ? (
                          <div className="flex flex-col gap-0.5">
                            <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${role!.bg} ${role!.text}`}>
                              {log.actor_role}
                            </span>
                            {actor && log.actor_role !== 'self' && (
                              <span className="text-[10px] text-gray-500 truncate max-w-[160px]" title={actor}>{actor}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">
                        {log.ip_address || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 text-right whitespace-nowrap">{formatDate(log.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setDetailLog(log)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="View diff"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination footer ─────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Rows per page:</span>
              <div className="relative">
                <select
                  value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  className="appearance-none bg-white border border-gray-200 rounded-lg h-8 pl-2.5 pr-7 text-sm text-gray-700 outline-none focus:border-slate-400 cursor-pointer"
                >
                  {pageSizeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <CaretDown size={12} weight="bold" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <span className="text-gray-400">· {total.toLocaleString()} total</span>
            </div>
            <ReactPaginate
              previousLabel="‹"
              nextLabel="›"
              breakLabel="…"
              pageCount={totalPages}
              marginPagesDisplayed={1}
              pageRangeDisplayed={3}
              onPageChange={({ selected }) => setPage(selected + 1)}
              forcePage={page - 1}
              containerClassName="flex items-center gap-1"
              pageClassName="w-8 h-8 flex items-center justify-center rounded-lg text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
              activeClassName="!bg-slate-900 !text-white hover:!bg-slate-700"
              previousClassName="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer text-lg"
              nextClassName="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer text-lg"
              disabledClassName="opacity-30 cursor-not-allowed hover:bg-transparent"
              breakClassName="w-8 h-8 flex items-center justify-center text-gray-400"
            />
          </div>
        )}
      </div>

      {/* ── Diff modal ─────────────────────────────────────────────────── */}
      {detailLog && (
        <DiffModal log={detailLog} onClose={() => setDetailLog(null)} />
      )}
    </div>
  );
};

const DiffModal: React.FC<{ log: AuditLog; onClose: () => void }> = ({ log, onClose }) => {
  const op = OPERATION_STYLES[log.operation] ?? { bg: 'bg-gray-100', text: 'text-gray-600' };

  // For UPDATEs, only render the keys that actually changed so the diff stays focused.
  // For INSERT we show new_values; for DELETE we show old_values.
  const renderRow = (key: string) => {
    const oldV = log.old_values?.[key];
    const newV = log.new_values?.[key];
    return (
      <div key={key} className="grid grid-cols-[140px_1fr_1fr] gap-3 py-2 border-b border-gray-100 last:border-b-0">
        <div className="font-mono text-xs text-slate-700 font-semibold pt-0.5">{key}</div>
        <div className="bg-rose-50 border border-rose-100 rounded-md px-2.5 py-1.5 text-xs text-rose-900 font-mono break-all">
          {oldV === undefined ? <span className="text-gray-300">—</span> : <pre className="whitespace-pre-wrap">{JSON.stringify(oldV, null, 0)}</pre>}
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-md px-2.5 py-1.5 text-xs text-emerald-900 font-mono break-all">
          {newV === undefined ? <span className="text-gray-300">—</span> : <pre className="whitespace-pre-wrap">{JSON.stringify(newV, null, 0)}</pre>}
        </div>
      </div>
    );
  };

  const keysToShow =
    log.operation === 'UPDATE' ? log.changed_keys :
    log.operation === 'INSERT' ? Object.keys(log.new_values ?? {}) :
                                 Object.keys(log.old_values ?? {});

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${op.bg} ${op.text}`}>
              {log.operation}
            </span>
            <span className="font-mono text-sm text-gray-700">{log.table_name}</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="font-mono text-xs text-gray-500">{log.record_id}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-b border-gray-100 grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Subject</div>
            <div className="text-gray-800">{formatUser(log.subject) || log.user_id}</div>
          </div>
          <div>
            <div className="text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Actor</div>
            <div className="text-gray-800">
              {log.actor_role && <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-white border border-gray-200 text-[10px] mr-2">{log.actor_role}</span>}
              {formatUser(log.actor) || (log.actor_id ?? '—')}
            </div>
          </div>
          <div>
            <div className="text-slate-500 font-semibold uppercase tracking-wider mb-0.5">When</div>
            <div className="text-gray-800">{new Date(log.created_at).toLocaleString('en-GB')}</div>
          </div>
          <div>
            <div className="text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Origin</div>
            <div className="text-gray-800 font-mono">{log.ip_address || '—'}</div>
            {log.user_agent && <div className="text-[10px] text-gray-500 truncate" title={log.user_agent}>{log.user_agent}</div>}
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-4 flex-1">
          {keysToShow.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No field-level details captured.</p>
          ) : (
            <>
              <div className="grid grid-cols-[140px_1fr_1fr] gap-3 pb-2 mb-1 border-b border-gray-200">
                <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Field</div>
                <div className="text-[10px] text-rose-600 font-semibold uppercase tracking-wider">Before</div>
                <div className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">After</div>
              </div>
              {keysToShow.map(renderRow)}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileAuditLogs;
