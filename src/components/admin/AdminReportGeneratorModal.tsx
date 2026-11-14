import React, { useState } from 'react';
import {
  ReportType,
  AnalyticsDateRange,
  AdminReportConfig,
} from '../../types';
import { generateAdminReport } from '../../services/adminAnalyticsService';
import { BANGLADESH_DIVISIONS } from '../../data/bangladeshDistricts';

interface AdminReportGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialReportType?: ReportType;
}

export const AdminReportGeneratorModal: React.FC<AdminReportGeneratorModalProps> = ({
  isOpen,
  onClose,
  initialReportType = 'sales',
}) => {
  const [reportType, setReportType] = useState<ReportType>(initialReportType);
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>('last_30_days');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState<{
    headers: string[];
    rows: (string | number)[][];
    summaryMetrics: Record<string, string | number>;
  } | null>(null);

  if (!isOpen) return null;

  const REPORT_OPTIONS: { id: ReportType; label: string; description: string; icon: string }[] = [
    { id: 'sales', label: 'Sales & Revenue Summary', description: 'Gross sales, net revenue, platform commission & discounts', icon: 'trending_up' },
    { id: 'orders', label: 'Detailed Orders Ledger', description: 'All customer orders with shipping district, payment, and status', icon: 'shopping_bag' },
    { id: 'sellers', label: 'Artisan & Seller Performance', description: 'Seller sales, units sold, commission generated, and balance', icon: 'storefront' },
    { id: 'products', label: 'Product Catalog & Stock Velocity', description: 'Catalog listings, stock, price, units sold, and eco status', icon: 'inventory_2' },
    { id: 'districts', label: '64-District Geographic Report', description: 'Division & district level sales, orders, artisan coverage', icon: 'map' },
    { id: 'payments', label: 'Payment Gateway Reconciliation', description: 'bKash, Nagad, Rocket, COD & Card transaction success rates', icon: 'payments' },
    { id: 'couriers', label: 'Courier & Logistics SLA Report', description: 'Steadfast, Pathao, RedX delivery speed, RTO and failure rates', icon: 'local_shipping' },
    { id: 'returns', label: 'Returns & Defect Analysis', description: 'Customer return requests, category breakdown, and reasons', icon: 'keyboard_return' },
    { id: 'settlements', label: 'Seller Settlement Batch Report', description: 'Pending, processing and paid artisan disbursement ledger', icon: 'account_balance' },
    { id: 'commissions', label: 'Platform Commission Ledger', description: '8% artisan platform commission audit and fee deductions', icon: 'percent' },
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const config: AdminReportConfig = {
        reportType,
        dateRange,
        divisionFilter: divisionFilter === 'all' ? undefined : divisionFilter,
      };
      const res = await generateAdminReport(config);
      setGeneratedData(res);
    } catch (e) {
      console.error('Report generation failed:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCSV = () => {
    if (!generatedData) return;
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        generatedData.headers.map((h) => `"${h}"`).join(','),
        ...generatedData.rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SUNNO_REPORT_${reportType.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b1e12] text-[#e1e9e3] rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-[#1b482b] max-h-[92vh] overflow-y-auto space-y-6 animate-fadeIn">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#1b4329]">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#a0f399] text-[24px]">summarize</span>
              <h3 className="text-xl font-bold text-white font-heading">
                SUNNO Business Intelligence & Report Engine
              </h3>
            </div>
            <p className="text-xs text-[#7ea289] mt-0.5">
              Export verified database analytics, financial statements, and logistics data in CSV or print format.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#7ea289] hover:text-white rounded-full bg-[#122b1c] hover:bg-[#183a26] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Configuration Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#0e2417] p-5 rounded-2xl border border-[#1b4329]">
          {/* Report Type Select */}
          <div>
            <label className="text-[10px] font-bold text-[#a0f399] uppercase tracking-wider block mb-1.5">
              Select Report Subject
            </label>
            <select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value as ReportType);
                setGeneratedData(null);
              }}
              className="w-full bg-[#143220] border border-[#235636] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#a0f399]"
            >
              {REPORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Select */}
          <div>
            <label className="text-[10px] font-bold text-[#a0f399] uppercase tracking-wider block mb-1.5">
              Date Period
            </label>
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value as AnalyticsDateRange);
                setGeneratedData(null);
              }}
              className="w-full bg-[#143220] border border-[#235636] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#a0f399]"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days (Standard)</option>
              <option value="this_month">This Month (August 2026)</option>
              <option value="last_month">Last Month</option>
              <option value="this_year">This Fiscal Year (2026)</option>
            </select>
          </div>

          {/* Division Filter */}
          <div>
            <label className="text-[10px] font-bold text-[#a0f399] uppercase tracking-wider block mb-1.5">
              Division Scope
            </label>
            <select
              value={divisionFilter}
              onChange={(e) => {
                setDivisionFilter(e.target.value);
                setGeneratedData(null);
              }}
              className="w-full bg-[#143220] border border-[#235636] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#a0f399]"
            >
              <option value="all">All 8 Divisions (National)</option>
              {BANGLADESH_DIVISIONS.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name} Division
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Generate Action Button */}
        <div className="flex justify-between items-center">
          <div className="text-[11px] text-[#7ea289] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-emerald-400">verified_user</span>
            <span>Real Database Extraction • 0 Fake Values</span>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-6 py-2.5 bg-[#a0f399] hover:bg-[#8ee986] disabled:opacity-50 text-[#002204] text-xs font-black rounded-2xl shadow-lg transition-all flex items-center gap-2"
          >
            <span className={`material-symbols-outlined text-[18px] ${isGenerating ? 'animate-spin' : ''}`}>
              {isGenerating ? 'refresh' : 'play_arrow'}
            </span>
            {isGenerating ? 'Computing Dataset...' : 'Generate Live Report'}
          </button>
        </div>

        {/* Generated Report Live Preview */}
        {generatedData && (
          <div className="space-y-4 animate-fadeIn">
            {/* Summary Highlights */}
            {generatedData.summaryMetrics && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#0d2215] p-4 rounded-2xl border border-[#1b4329]">
                {Object.entries(generatedData.summaryMetrics).map(([key, val]) => (
                  <div key={key}>
                    <span className="text-[10px] uppercase font-bold text-[#7ca087] block">{key}</span>
                    <strong className="text-sm font-mono text-[#a0f399] font-black">{val}</strong>
                  </div>
                ))}
              </div>
            )}

            {/* Data Table */}
            <div className="bg-[#0e2115] border border-[#1b4128] rounded-2xl overflow-hidden shadow-inner max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-[#122b1c] border-b border-[#1b4128] text-[10px] font-bold uppercase text-[#7ca087]">
                  <tr>
                    {generatedData.headers.map((h, idx) => (
                      <th key={idx} className="py-2.5 px-4 font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#183a24]">
                  {generatedData.rows.slice(0, 50).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-[#132c1d]">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="py-2 px-4 text-[#e1e9e3]">
                          {typeof cell === 'number' ? cell.toLocaleString() : cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Export Toolbar */}
            <div className="flex items-center justify-between pt-3 border-t border-[#1b4329]">
              <span className="text-[11px] text-[#7ea289]">
                Showing {Math.min(50, generatedData.rows.length)} of {generatedData.rows.length} records in preview.
              </span>
              <div className="flex gap-3">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-[#143220] hover:bg-[#1c472d] text-[#e1e9e3] border border-[#235836] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  Print
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-5 py-2 bg-[#1b6d24] hover:bg-[#22832c] text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Download CSV
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
