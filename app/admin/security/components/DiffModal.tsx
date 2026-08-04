import { X } from "@phosphor-icons/react/dist/ssr";

import {
  formatUser,
  OPERATION_STYLES,
  type AuditLog,
} from "./ProfileAuditLogs.types";

export function DiffModal({
  log,
  onClose,
}: {
  log: AuditLog;
  onClose: () => void;
}) {
  const op = OPERATION_STYLES[log.operation] ?? {
    bg: "bg-gray-100",
    text: "text-gray-600",
  };
  const keysToShow =
    log.operation === "UPDATE"
      ? log.changed_keys
      : log.operation === "INSERT"
        ? Object.keys(log.new_values ?? {})
        : Object.keys(log.old_values ?? {});

  const renderRow = (key: string) => {
    const oldValue = log.old_values?.[key];
    const newValue = log.new_values?.[key];

    return (
      <div
        key={key}
        className="grid grid-cols-[140px_1fr_1fr] gap-3 py-2 border-b border-gray-100 last:border-b-0"
      >
        <div className="font-mono text-xs text-slate-700 font-semibold pt-0.5">
          {key}
        </div>
        <div className="bg-rose-50 border border-rose-100 rounded-md px-2.5 py-1.5 text-xs text-rose-900 font-mono break-all">
          {oldValue === undefined ? (
            <span className="text-gray-300">—</span>
          ) : (
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(oldValue, null, 0)}
            </pre>
          )}
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-md px-2.5 py-1.5 text-xs text-emerald-900 font-mono break-all">
          {newValue === undefined ? (
            <span className="text-gray-300">—</span>
          ) : (
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(newValue, null, 0)}
            </pre>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${op.bg} ${op.text}`}
            >
              {log.operation}
            </span>
            <span className="font-mono text-sm text-gray-700">
              {log.table_name}
            </span>
            <span className="text-xs text-gray-400">·</span>
            <span className="font-mono text-xs text-gray-500">
              {log.record_id}
            </span>
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
            <div className="text-slate-500 font-semibold uppercase tracking-wider mb-0.5">
              Subject
            </div>
            <div className="text-gray-800">
              {formatUser(log.subject) || log.user_id}
            </div>
          </div>
          <div>
            <div className="text-slate-500 font-semibold uppercase tracking-wider mb-0.5">
              Actor
            </div>
            <div className="text-gray-800">
              {log.actor_role && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-white border border-gray-200 text-[10px] mr-2">
                  {log.actor_role}
                </span>
              )}
              {formatUser(log.actor) || (log.actor_id ?? "—")}
            </div>
          </div>
          <div>
            <div className="text-slate-500 font-semibold uppercase tracking-wider mb-0.5">
              When
            </div>
            <div className="text-gray-800">
              {new Date(log.created_at).toLocaleString("en-GB")}
            </div>
          </div>
          <div>
            <div className="text-slate-500 font-semibold uppercase tracking-wider mb-0.5">
              Origin
            </div>
            <div className="text-gray-800 font-mono">
              {log.ip_address || "—"}
            </div>
            {log.user_agent && (
              <div
                className="text-[10px] text-gray-500 truncate"
                title={log.user_agent}
              >
                {log.user_agent}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-4 flex-1">
          {keysToShow.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">
              No field-level details captured.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-[140px_1fr_1fr] gap-3 pb-2 mb-1 border-b border-gray-200">
                <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  Field
                </div>
                <div className="text-[10px] text-rose-600 font-semibold uppercase tracking-wider">
                  Before
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">
                  After
                </div>
              </div>
              {keysToShow.map(renderRow)}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
