'use client'
import { useState } from "react";
import { ShieldWarning, UserMinus, WifiHigh, Fingerprint, Globe, ArrowLeft, UsersIcon, ClockCounterClockwise } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import SecurityLogs from "./SecurityLogs";
import ProfileAuditLogs from "./ProfileAuditLogs";
import SecurityUsersManagement from "./SecurityUsersManagement";
import BlockedUsersManagement from "./BlockedUsersManagement";
import BlockedIpsManagement from "./BlockedIpsManagement";
import BlockedFingerprintsManagement from "./BlockedFingerprintsManagement";
import BlockedDomainsManagement from "./BlockedDomainsManagement";

const tabs = [
  { id: 'logs',        label: 'Activity Logs',        icon: ShieldWarning         },
  { id: 'profile',     label: 'Profile Activity',     icon: ClockCounterClockwise },
  { id: 'sec-users',   label: 'Users',                icon: UsersIcon             },
  { id: 'users',       label: 'Blocked Users',        icon: UserMinus             },
  { id: 'ips',         label: 'Blocked IPs',          icon: WifiHigh              },
  { id: 'devices',     label: 'Device Fingerprints',  icon: Fingerprint           },
  { id: 'domains',     label: 'Blocked Domains',      icon: Globe                 },
];

const SecurityDashboard = ({ role }: { role: string }) => {
  const [activeTab, setActiveTab] = useState('logs');
  const backHref  = role === 'admin' ? '/admin' : '/dashboard';
  const backLabel = role === 'admin' ? 'Back to Admin' : 'Back to Dashboard';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Dark header ─────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 pt-8 pb-0">
          {/* Back link */}
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm mb-6 group"
          >
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            {backLabel}
          </Link>

          {/* Title row */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center shrink-0">
              <ShieldWarning size={24} weight="fill" className="text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Security Dashboard</h1>
              <p className="text-slate-400 text-sm mt-0.5">Monitor and manage blocked entities &amp; security events</p>
            </div>
          </div>

          {/* ── Tab bar (flush to bottom of header) ────────────────────── */}
          <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-xl whitespace-nowrap transition-all
                    ${active
                      ? 'bg-gray-50 text-slate-900 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/8'}
                  `}
                >
                  <Icon size={15} weight={active ? 'fill' : 'regular'} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content area ────────────────────────────────────────────────── */}
      <div className="bg-gray-50 min-h-[calc(100vh-220px)]">
        {activeTab === 'logs'      && <SecurityLogs />}
        {activeTab === 'profile'   && <ProfileAuditLogs />}
        {activeTab === 'sec-users' && <SecurityUsersManagement />}
        {activeTab === 'users'     && <BlockedUsersManagement />}
        {activeTab === 'ips'     && <BlockedIpsManagement />}
        {activeTab === 'devices' && <BlockedFingerprintsManagement />}
        {activeTab === 'domains' && <BlockedDomainsManagement />}
      </div>
    </div>
  );
};

export default SecurityDashboard;
