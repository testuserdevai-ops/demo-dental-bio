'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getTrialStatus } from '@/utils/trialManagement';

interface TrialStatusCardProps {
  userId: string;
}

export default function TrialStatusCard({ userId }: TrialStatusCardProps) {
  const [trialStatus, setTrialStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrialStatus = async () => {
      try {
        const status = await getTrialStatus(userId);
        setTrialStatus(status);
      } catch (error) {
        console.error('Error fetching trial status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrialStatus();
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (!trialStatus) {
    return null;
  }

  const getStatusColor = () => {
    if (trialStatus.isExpired) return 'text-red-600 bg-red-50';
    if (trialStatus.isEndingSoon) return 'text-orange-600 bg-orange-50';
    if (trialStatus.isActive) return 'text-green-600 bg-green-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getStatusText = () => {
    if (trialStatus.isExpired) return 'Trial Expired';
    if (trialStatus.isEndingSoon) return 'Trial Ending Soon';
    if (trialStatus.isActive) return 'Trial Active';
    return 'No Trial';
  };

  const getProgressColor = () => {
    if (trialStatus.isExpired) return 'bg-red-500';
    if (trialStatus.isEndingSoon) return 'bg-orange-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Trial Status</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      {trialStatus.isActive && (
        <>
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Days Remaining</span>
              <span>{trialStatus.daysRemaining} days</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getProgressColor()}`}
                style={{
                  width: `${Math.max(0, Math.min(100, (trialStatus.daysRemaining / 90) * 100))}%`
                }}
              ></div>
            </div>
          </div>

          {trialStatus.trialEndDate && (
            <p className="text-sm text-gray-600 mb-4">
              Trial ends on: {new Date(trialStatus.trialEndDate).toLocaleDateString()}
            </p>
          )}

          {trialStatus.isEndingSoon && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-orange-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-orange-800 font-medium">
                  Your trial is ending soon! Upgrade to continue using all features.
                </span>
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <Link
              href="/upgrade"
              target="_blank"
              className="flex-1 bg-blue-600 text-white text-center py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Upgrade Now
            </Link>
            <Link
              href="/dashboard/referral"
              className="flex-1 bg-gray-100 text-gray-700 text-center py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Get 1 Month Free
            </Link>
          </div>
        </>
      )}

      {trialStatus.isExpired && (
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800 font-medium">
                Your trial has expired
              </span>
            </div>
          </div>
          <Link
            href="/upgrade"
            target="_blank"
            className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Upgrade to Continue
          </Link>
        </div>
      )}
    </div>
  );
} 