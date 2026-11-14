import React, { useState } from 'react';
import {
  X,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
  Leaf,
  FileText,
} from 'lucide-react';
import { Shipment, ShipmentStatus, ShipmentLog } from '../types';
import { updateShipmentStatus } from '../services/courierService';

interface TrackingModalProps {
  shipment: Shipment;
  onClose: () => void;
  onViewInvoice?: () => void;
  canManageStatus?: boolean;
}

export const TrackingModal: React.FC<TrackingModalProps> = ({
  shipment: initialShipment,
  onClose,
  onViewInvoice,
  canManageStatus = false,
}) => {
  const [shipment, setShipment] = useState<Shipment>(initialShipment);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newStatusNote, setNewStatusNote] = useState('');
  const [selectedNextStatus, setSelectedNextStatus] = useState<ShipmentStatus>(shipment.status);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const stages: { key: ShipmentStatus[]; label: string; description: string }[] = [
    {
      key: ['PENDING', 'READY_FOR_SHIPMENT'],
      label: 'Order Packaged',
      description: 'Artisan prepared with eco-wrap',
    },
    {
      key: ['PICKUP_REQUESTED', 'PICKED_UP'],
      label: 'Picked Up',
      description: 'Courier collected from workshop',
    },
    {
      key: ['IN_TRANSIT'],
      label: 'In Transit',
      description: 'Moving through logistics network',
    },
    {
      key: ['OUT_FOR_DELIVERY'],
      label: 'Out for Delivery',
      description: 'Rider en route to your address',
    },
    {
      key: ['DELIVERED'],
      label: 'Delivered',
      description: 'Successfully received',
    },
  ];

  const getStageIndex = (status: ShipmentStatus) => {
    if (status === 'DELIVERED') return 4;
    if (status === 'OUT_FOR_DELIVERY') return 3;
    if (status === 'IN_TRANSIT') return 2;
    if (status === 'PICKUP_REQUESTED' || status === 'PICKED_UP') return 1;
    if (status === 'READY_FOR_SHIPMENT' || status === 'PENDING') return 0;
    if (status.startsWith('RTO') || status.startsWith('RETURN')) return 3;
    return 0;
  };

  const currentStageIdx = getStageIndex(shipment.status);
  const isFailedOrRto =
    shipment.status === 'DELIVERY_FAILED' ||
    shipment.status.startsWith('RTO') ||
    shipment.status.startsWith('RETURN') ||
    shipment.status === 'CANCELLED';

  const handleCopyTracking = () => {
    navigator.clipboard.writeText(shipment.trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/courier/shipments/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courierId: shipment.courierId,
          trackingNumber: shipment.trackingNumber,
          consignmentId: shipment.consignmentId,
          shipmentId: shipment.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.historyLogs) {
          setShipment((prev) => ({
            ...prev,
            status: data.currentStatus || prev.status,
            statusLogs: data.historyLogs || prev.statusLogs,
          }));
        }
      }
    } catch (err) {
      console.warn('Track refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAdminStatusUpdate = async () => {
    if (!selectedNextStatus) return;
    setStatusUpdating(true);
    try {
      const updated = await updateShipmentStatus(
        shipment.id,
        selectedNextStatus,
        shipment.pickupAddress.district,
        newStatusNote || undefined,
        'Admin / Moderator'
      );
      if (updated) {
        setShipment(updated);
        setNewStatusNote('');
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setStatusUpdating(false);
    }
  };

  return (
    <div
      id="tracking-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="tracking-modal-container"
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-stone-900 text-white p-6 relative">
          <button
            id="close-tracking-modal-btn"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-emerald-700/80 rounded-xl text-emerald-100">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Live Consignment Tracking</h2>
              <p className="text-stone-300 text-xs">
                Courier: <span className="font-semibold text-emerald-400">{shipment.courierName}</span> • Order #{shipment.orderNumber}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-stone-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-stone-400">Tracking Code:</span>
              <span className="font-mono font-bold bg-stone-800 text-emerald-300 px-2 py-1 rounded">
                {shipment.trackingNumber}
              </span>
              <button
                id="copy-tracking-number-btn"
                onClick={handleCopyTracking}
                className="p-1 hover:bg-stone-800 rounded text-stone-300 hover:text-white transition-colors"
                title="Copy tracking code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <button
              id="refresh-tracking-btn"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              {isRefreshing ? 'Updating...' : 'Sync Live Status'}
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {/* Status Progress Indicator */}
          {!isFailedOrRto ? (
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
              <div className="relative flex justify-between items-start">
                {/* Connecting Line */}
                <div className="absolute top-4 left-6 right-6 h-1 bg-stone-200 -z-0">
                  <div
                    className="h-full bg-emerald-700 transition-all duration-500"
                    style={{
                      width: `${(currentStageIdx / (stages.length - 1)) * 100}%`,
                    }}
                  />
                </div>

                {stages.map((stage, idx) => {
                  const isCompleted = idx <= currentStageIdx;
                  const isCurrent = idx === currentStageIdx;
                  return (
                    <div key={idx} className="flex flex-col items-center text-center z-10 w-24">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                          isCurrent
                            ? 'bg-emerald-700 text-white ring-4 ring-emerald-100 shadow-md'
                            : isCompleted
                            ? 'bg-emerald-800 text-white'
                            : 'bg-white border-2 border-stone-300 text-stone-400'
                        }`}
                      >
                        {isCompleted && !isCurrent ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <span
                        className={`mt-2 text-xs font-semibold ${
                          isCurrent ? 'text-emerald-900' : isCompleted ? 'text-stone-800' : 'text-stone-400'
                        }`}
                      >
                        {stage.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-700 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  Special Status: {shipment.status.replace(/_/g, ' ')}
                </h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  {shipment.failureReason || shipment.returnReason || 'Consignment returned or holding at regional logistics facility.'}
                </p>
              </div>
            </div>
          )}

          {/* Package Details & Eco Packaging Badge */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-700 uppercase tracking-wider">
                <Package className="w-4 h-4 text-emerald-700" />
                Package Information
              </div>
              <div className="text-xs space-y-1 text-stone-600">
                <p><span className="text-stone-400">Weight:</span> {shipment.packageInfo?.weight || 0.8} kg</p>
                <p><span className="text-stone-400">Type:</span> {shipment.packageInfo?.packageType || 'Box'}</p>
                <p><span className="text-stone-400">Service:</span> {shipment.serviceType.toUpperCase()}</p>
                {shipment.codAmount > 0 && (
                  <p className="font-semibold text-emerald-800">
                    <span className="text-stone-400 font-normal">Cash on Delivery:</span> ৳{shipment.codAmount}
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 uppercase tracking-wider">
                <Leaf className="w-4 h-4 text-emerald-700" />
                Zero-Plastic Eco Packaging
              </div>
              <div className="text-xs space-y-1 text-emerald-800">
                <p className="font-medium capitalize">
                  {shipment.packageInfo?.ecoPackagingType?.replace(/_/g, ' ') || 'Banana Fiber Wrap'}
                </p>
                <p className="text-emerald-700 text-[11px]">
                  100% biodegradable artisan wrap. Reduced carbon footprint verified by SUNNO Cooperative.
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Route Addresses */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="font-bold text-stone-500 block mb-1">ORIGIN (ARTISAN WORKSHOP):</span>
              <p className="font-medium text-stone-900">{shipment.pickupAddress.fullName}</p>
              <p className="text-stone-600">{shipment.pickupAddress.streetAddress}</p>
              <p className="text-stone-500">{shipment.pickupAddress.district}, {shipment.pickupAddress.division}</p>
            </div>
            <div>
              <span className="font-bold text-stone-500 block mb-1">DESTINATION (RECIPIENT):</span>
              <p className="font-medium text-stone-900">{shipment.deliveryAddress.fullName}</p>
              <p className="text-stone-600">{shipment.deliveryAddress.streetAddress}</p>
              <p className="text-stone-500">{shipment.deliveryAddress.district}, {shipment.deliveryAddress.division}</p>
              <p className="text-stone-600 font-mono mt-0.5">{shipment.deliveryAddress.phone}</p>
            </div>
          </div>

          {/* Detailed Timeline Logs */}
          <div>
            <h4 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-stone-600" />
              Consignment Event History ({shipment.statusLogs?.length || 0})
            </h4>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
              {shipment.statusLogs && shipment.statusLogs.length > 0 ? (
                shipment.statusLogs
                  .slice()
                  .reverse()
                  .map((log, index) => (
                    <div key={index} className="relative group">
                      {/* Timeline Dot */}
                      <div
                        className={`absolute -left-6 top-1.5 w-4 h-4 rounded-full border-2 border-white ${
                          index === 0 ? 'bg-emerald-700 ring-2 ring-emerald-200' : 'bg-stone-400'
                        }`}
                      />
                      <div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-stone-900">{log.title}</p>
                          <span className="text-[10px] text-stone-400">
                            {new Date(log.timestamp).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 mt-0.5">{log.description}</p>
                        {log.location && (
                          <p className="text-[11px] text-stone-400 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3 text-stone-400" />
                            {log.location}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-xs text-stone-400">No events logged yet.</p>
              )}
            </div>
          </div>

          {/* Admin / Seller Quick Status Control (If privileged) */}
          {canManageStatus && (
            <div className="p-4 bg-stone-100 rounded-xl border border-stone-300 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800">
                  Dispatcher Manual Status Override
                </span>
                <span className="text-[11px] text-stone-500 font-mono">Role: Verified Operator</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  id="admin-change-status-select"
                  value={selectedNextStatus}
                  onChange={(e) => setSelectedNextStatus(e.target.value as ShipmentStatus)}
                  className="px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-medium text-stone-800"
                >
                  <option value="READY_FOR_SHIPMENT">READY_FOR_SHIPMENT</option>
                  <option value="PICKUP_REQUESTED">PICKUP_REQUESTED</option>
                  <option value="PICKED_UP">PICKED_UP</option>
                  <option value="IN_TRANSIT">IN_TRANSIT</option>
                  <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="DELIVERY_FAILED">DELIVERY_FAILED</option>
                  <option value="RTO_IN_TRANSIT">RTO_IN_TRANSIT</option>
                  <option value="RTO_DELIVERED">RTO_DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>

                <input
                  id="admin-status-note-input"
                  type="text"
                  placeholder="Optional log note / location..."
                  value={newStatusNote}
                  onChange={(e) => setNewStatusNote(e.target.value)}
                  className="px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <button
                id="apply-status-change-btn"
                onClick={handleAdminStatusUpdate}
                disabled={statusUpdating}
                className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {statusUpdating ? 'Updating...' : 'Post Status Update to Logistics Ledger'}
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3">
          {onViewInvoice && (
            <button
              id="view-invoice-from-tracking-btn"
              onClick={onViewInvoice}
              className="flex items-center gap-2 px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-semibold transition-colors"
            >
              <FileText className="w-4 h-4 text-stone-600" />
              View Official Invoice
            </button>
          )}

          {shipment.trackingUrl && (
            <a
              id="external-courier-tracking-link"
              href={shipment.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-colors ml-auto"
            >
              <span>Courier Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
