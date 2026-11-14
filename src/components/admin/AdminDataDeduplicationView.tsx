import React, { useState } from 'react';
import { DataCleanupPreview, DataCleanupResult } from '../../types';
import {
  scanForDuplicatesAndAnomalies,
  executeSafeCleanup,
} from '../../services/dataDeduplicationService';
import { useAuth } from '../../context/AuthContext';

export const AdminDataDeduplicationView: React.FC = () => {
  const { userProfile: currentAdmin } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState<DataCleanupPreview | null>(null);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<DataCleanupResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStartScan = async () => {
    setIsScanning(true);
    setErrorMsg(null);
    setCleanupResult(null);
    try {
      const preview = await scanForDuplicatesAndAnomalies();
      setScanPreview(preview);
    } catch (err: any) {
      setErrorMsg(err.message || 'Scan failed.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleExecuteCleanup = async () => {
    if (!scanPreview) return;
    setIsExecuting(true);
    setErrorMsg(null);
    try {
      const res = await executeSafeCleanup(
        confirmPhrase.trim(),
        scanPreview,
        currentAdmin?.email || 'admin@sunno.eco'
      );
      setCleanupResult(res);
      setScanPreview(null);
      setConfirmPhrase('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Cleanup execution failed.');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#c1c9be]/60 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#e8f5e9] text-[#1b6d24] rounded-full text-xs font-bold mb-2">
              <span className="material-symbols-outlined text-[16px]">fingerprint</span>
              Database Single Source of Truth &amp; Integrity Guard
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#002c11] font-heading">
              Data Deduplication &amp; Integrity Auditor
            </h2>
            <p className="text-xs text-stone-500 mt-1 max-w-2xl">
              Audit the canonical Firestore catalog for duplicate SKU codes, repeated product titles, orphaned review submissions, and mock relics. Performs non-destructive safe archival with full audit logging.
            </p>
          </div>

          <button
            onClick={handleStartScan}
            disabled={isScanning}
            className="px-5 py-3 bg-[#002c11] hover:bg-[#1b6d24] disabled:opacity-50 text-white rounded-2xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
          >
            {isScanning ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                <span>Auditing Database...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px] text-[#a0f399]">search_check</span>
                <span>Run Integrity Scan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-3xl text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {cleanupResult && (
        <div className="p-6 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-3xl space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <span className="material-symbols-outlined text-[20px] text-emerald-600">verified</span>
            <span>Cleanup Completed Successfully!</span>
          </div>
          <p className="text-xs">
            Soft-archived {cleanupResult.archivedProductsCount} duplicate product records. Zero customer orders or financial settlement records were altered.
          </p>
          <div className="pt-2 text-[11px] font-mono text-emerald-700">
            Permanent Audit ID: {cleanupResult.auditLogId} • Timestamp: {cleanupResult.timestamp}
          </div>
        </div>
      )}

      {/* Scan Results Preview */}
      {scanPreview && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-[#c1c9be]/60 shadow-xs space-y-1">
              <span className="text-stone-400 text-xs font-bold uppercase tracking-wider block">Duplicate Listings</span>
              <div className="text-2xl font-extrabold text-[#002c11] font-heading">
                {scanPreview.duplicateProducts.totalDuplicates}
              </div>
              <p className="text-[11px] text-stone-500">Across {scanPreview.duplicateProducts.groups.length} matching clusters</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-[#c1c9be]/60 shadow-xs space-y-1">
              <span className="text-stone-400 text-xs font-bold uppercase tracking-wider block">Orphaned Queue Submissions</span>
              <div className="text-2xl font-extrabold text-amber-700 font-heading">
                {scanPreview.orphanedSubmissions}
              </div>
              <p className="text-[11px] text-stone-500">Submissions without master product doc</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-[#c1c9be]/60 shadow-xs space-y-1">
              <span className="text-stone-400 text-xs font-bold uppercase tracking-wider block">Demo / Test Orders</span>
              <div className="text-2xl font-extrabold text-stone-700 font-heading">
                {scanPreview.testOrdersCount}
              </div>
              <p className="text-[11px] text-stone-500">Flagged test artifacts</p>
            </div>
          </div>

          {/* Group Details */}
          {scanPreview.duplicateProducts.groups.length > 0 ? (
            <div className="bg-white p-6 rounded-3xl border border-[#c1c9be]/60 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-[#002c11] font-heading">
                Detected Duplicate Groups (Preview Only — No Data Changed Yet)
              </h3>

              <div className="space-y-4">
                {scanPreview.duplicateProducts.groups.map((group, idx) => (
                  <div key={idx} className="p-4 bg-[#fbf9f8] rounded-2xl border border-stone-200/80 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#e8f5e9] text-[#1b6d24]">
                        Canonical: #{group.canonicalId}
                      </span>
                      <span className="text-xs text-stone-600 font-medium">{group.reason}</span>
                    </div>

                    <div className="space-y-2">
                      {group.duplicates.map((dup) => (
                        <div key={dup.id} className="p-3 bg-white rounded-xl border border-stone-200 text-xs flex justify-between items-center">
                          <div>
                            <span className="font-bold text-[#002c11]">{dup.title}</span>
                            <div className="text-[11px] text-stone-500 flex gap-2 mt-0.5">
                              <span>ID: {dup.id}</span>
                              <span>•</span>
                              <span>SKU: {dup.sku}</span>
                              <span>•</span>
                              <span>Stock: {dup.stock}</span>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[10px] font-bold">
                            Pending Safe Archive
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Execution Guard Box */}
              <div className="pt-4 border-t border-stone-100 p-4 bg-red-50/50 rounded-2xl border border-red-200/60 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-red-800 font-bold">
                  <span className="material-symbols-outlined text-[18px]">security</span>
                  <span>Explicit Super-Admin Confirmation Required</span>
                </div>
                <p className="text-stone-600">
                  To soft-archive these {scanPreview.duplicateProducts.totalDuplicates} duplicates, type <strong className="font-mono text-red-700">CLEANUP_CONFIRMED</strong> below:
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Type CLEANUP_CONFIRMED"
                    value={confirmPhrase}
                    onChange={(e) => setConfirmPhrase(e.target.value)}
                    className="bg-white border border-stone-300 rounded-xl px-3.5 py-2 font-mono outline-none focus:border-red-600 text-xs"
                  />
                  <button
                    onClick={handleExecuteCleanup}
                    disabled={confirmPhrase !== 'CLEANUP_CONFIRMED' || isExecuting}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isExecuting ? 'Archiving...' : 'Execute Non-Destructive Cleanup'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-3xl border border-[#c1c9be]/60 text-center space-y-2">
              <span className="material-symbols-outlined text-[36px] text-emerald-600">check_circle</span>
              <h3 className="font-bold text-sm text-[#002c11]">Clean Database!</h3>
              <p className="text-xs text-stone-500">
                No duplicate products or anomalies detected. Every listing adheres to the Single Source of Truth architecture.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
