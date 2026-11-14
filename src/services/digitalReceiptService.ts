import { BRAND_LOGO } from '../data/mockData';

export interface DigitalReceiptItem {
  name: string;
  sellerName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sku?: string;
  ecoTypes?: string[];
}

export interface DigitalReceiptData {
  orderNumber: string;
  orderId?: string;
  invoiceNumber?: string;
  invoiceDate: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  shippingAddress?: {
    fullName?: string;
    streetAddress: string;
    area?: string;
    upazila?: string;
    district: string;
    division: string;
    phone?: string;
  } | string;
  paymentMethod: string;
  paymentProvider?: string;
  paymentStatus: string;
  transactionId?: string;
  trackingNumber?: string;
  courierName?: string;
  items: DigitalReceiptItem[];
  subtotal: number;
  discount?: number;
  discountCode?: string;
  shippingFee: number;
  grandTotal: number;
  isRefunded?: boolean;
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
  }, 500);
}

/**
 * Loads an image safely with anonymous crossOrigin to prevent canvas tainting.
 */
function loadImageSafely(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    // Only set crossOrigin for remote URLs
    if (!src.startsWith('data:') && !src.startsWith('/') && !src.startsWith(window.location.origin)) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Try local logo as reliable fallback
      if (src !== '/sunno-logo.png') {
        const localImg = new Image();
        localImg.onload = () => resolve(localImg);
        localImg.onerror = () => resolve(null);
        localImg.src = '/sunno-logo.png';
      } else {
        resolve(null);
      }
    };
    img.src = src;
  });
}

/**
 * Draws the vector SUNNO logo / emblem as fallback or primary clean emblem on canvas
 */
function drawVectorSunnoLogo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  ctx.save();
  ctx.translate(x, y);

  // Background rounded container
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, 12);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#c1c9be';
  ctx.stroke();

  // Draw circular eco wreath / sun rays
  const center = size / 2;
  const radius = size * 0.36;

  // Outer glow / circle
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#002c11';
  ctx.fill();

  // Sun core
  ctx.beginPath();
  ctx.arc(center, center, radius * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = '#f59e0b';
  ctx.fill();

  // Green sprout leaf inside
  ctx.beginPath();
  ctx.moveTo(center, center + radius * 0.35);
  ctx.bezierCurveTo(
    center + radius * 0.4,
    center - radius * 0.1,
    center + radius * 0.3,
    center - radius * 0.4,
    center,
    center - radius * 0.4
  );
  ctx.bezierCurveTo(
    center - radius * 0.3,
    center - radius * 0.4,
    center - radius * 0.4,
    center - radius * 0.1,
    center,
    center + radius * 0.35
  );
  ctx.fillStyle = '#10b981';
  ctx.fill();

  ctx.restore();
}

/**
 * Formats a currency amount safely, preventing undefined toLocaleString errors.
 */
export function formatMoney(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return '0';
  const num = Number(amount);
  return isNaN(num) ? '0' : num.toLocaleString('en-BD');
}

/**
 * Normalizes and sanitizes receipt data to guarantee all fields, totals,
 * and item rows are fully populated valid structures.
 */
export function normalizeReceiptData(raw: DigitalReceiptData): DigitalReceiptData {
  if (!raw) {
    return {
      orderNumber: 'ORD-SUNNO',
      invoiceDate: new Date().toLocaleDateString('en-GB'),
      customerName: 'Conscious Buyer',
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      items: [],
      subtotal: 0,
      discount: 0,
      shippingFee: 0,
      grandTotal: 0,
    };
  }

  const items = (raw.items || []).map((it) => {
    const qty = Math.max(1, Number(it?.quantity || 1));
    const unit = Number(it?.unitPrice || 0);
    const total = Number(it?.totalPrice ?? unit * qty);
    return {
      ...it,
      name: it?.name || 'Artisan Handcrafted Item',
      sellerName: it?.sellerName || 'Rural Bangladesh Artisan',
      quantity: isNaN(qty) ? 1 : qty,
      unitPrice: isNaN(unit) ? 0 : unit,
      totalPrice: isNaN(total) ? 0 : total,
    };
  });

  const rawSubtotal = Number(
    raw.subtotal ?? (raw as any).subTotal ?? items.reduce((acc, curr) => acc + curr.totalPrice, 0)
  );
  const subtotal = isNaN(rawSubtotal) ? 0 : rawSubtotal;

  const rawDiscount = Number(raw.discount ?? (raw as any).discountAmount ?? 0);
  const discount = isNaN(rawDiscount) ? 0 : rawDiscount;

  const rawShipping = Number(raw.shippingFee ?? (raw as any).deliveryFee ?? 0);
  const shippingFee = isNaN(rawShipping) ? 0 : rawShipping;

  const rawGrandTotal = Number(
    raw.grandTotal ??
    (raw as any).totalAmount ??
    (raw as any).total ??
    Math.max(0, subtotal - discount + shippingFee)
  );
  const grandTotal = isNaN(rawGrandTotal) ? 0 : rawGrandTotal;

  return {
    ...raw,
    customerName: raw.customerName || 'Conscious Buyer',
    orderNumber: raw.orderNumber || (raw as any).id || (raw as any).orderId || 'ORD-SUNNO',
    invoiceDate: raw.invoiceDate || new Date().toLocaleDateString('en-GB'),
    paymentMethod: raw.paymentMethod || 'cod',
    paymentStatus: raw.paymentStatus || 'pending',
    items,
    subtotal,
    discount,
    shippingFee,
    grandTotal,
  };
}

/**
 * Formats a shipping address into a clean multi-line string.
 */
function formatAddressString(addr: DigitalReceiptData['shippingAddress']): string[] {
  if (!addr) return ['Address on file with courier'];
  if (typeof addr === 'string') return [addr];

  const lines: string[] = [];
  if (addr.fullName || addr.phone) {
    lines.push(`${addr.fullName || ''} ${addr.phone ? `(${addr.phone})` : ''}`.trim());
  }
  const street = [addr.streetAddress, addr.area, addr.upazila].filter(Boolean).join(', ');
  if (street) lines.push(street);
  const region = [addr.district, addr.division ? `(${addr.division})` : ''].filter(Boolean).join(' ');
  if (region) lines.push(region);

  return lines.length > 0 ? lines : ['Address details available in system'];
}

/**
 * Generates a high-resolution, crystal-clear digital receipt image (PNG)
 * and initiates direct download to user's device.
 */
export async function downloadDigitalReceiptImage(rawData: DigitalReceiptData): Promise<void> {
  const data = normalizeReceiptData(rawData);
  const scale = 2; // Retina 2x scale for 300dpi-equivalent sharpness
  const width = 800;
  const itemRowHeight = 44;
  const itemsHeight = Math.max(data.items.length, 1) * itemRowHeight;
  const minHeight = 740 + itemsHeight;
  const height = minHeight;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas rendering context not available');

  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(0, 0, width, height);

  // Card Container
  const cardX = 24;
  const cardY = 24;
  const cardWidth = width - cardX * 2;
  const cardHeight = height - cardY * 2;
  const cardRadius = 18;

  // Shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardWidth, cardHeight, cardRadius);
  ctx.fill();
  ctx.restore();

  // Header Banner (#002c11)
  const headerHeight = 110;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardWidth, headerHeight, [cardRadius, cardRadius, 0, 0]);
  ctx.fillStyle = '#002c11';
  ctx.fill();
  ctx.restore();

  // Load logo image or use vector fallback
  const logoSize = 64;
  const logoX = cardX + 24;
  const logoY = cardY + 23;
  let logoDrawn = false;

  try {
    const logoImg = await loadImageSafely(BRAND_LOGO);
    if (logoImg) {
      // White container for logo
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(logoX, logoY, logoSize, logoSize, 12);
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.stroke();

      ctx.drawImage(logoImg, logoX + 6, logoY + 6, logoSize - 12, logoSize - 12);
      logoDrawn = true;
    }
  } catch {
    logoDrawn = false;
  }

  if (!logoDrawn) {
    drawVectorSunnoLogo(ctx, logoX, logoY, logoSize);
  }

  // Brand Name & Tagline
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('SUNNO', logoX + logoSize + 16, logoY + 28);

  // Badge "TAX / SALES INVOICE"
  const tagText = 'TAX / SALES INVOICE';
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const tagWidth = ctx.measureText(tagText).width + 16;
  const tagX = logoX + logoSize + 120;
  const tagY = logoY + 12;

  ctx.fillStyle = '#1b6d24';
  ctx.beginPath();
  ctx.roundRect(tagX, tagY, tagWidth, 20, 10);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillText(tagText, tagX + 8, tagY + 14);

  // Subtitle
  ctx.fillStyle = '#a7f3d0';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('100% Sustainable Artisanal Bangladesh Marketplace', logoX + logoSize + 16, logoY + 48);

  ctx.fillStyle = '#9ca3af';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('BIN: 00482910-0102 • Registered Eco-Craft Cluster Network', logoX + logoSize + 16, logoY + 65);

  // Top-Right Order & Date
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('ORIGINAL DIGITAL COPY', cardX + cardWidth - 24, cardY + 36);

  ctx.fillStyle = '#e5e7eb';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(data.invoiceDate, cardX + cardWidth - 24, cardY + 54);

  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#34d399';
  ctx.fillText(data.orderNumber, cardX + cardWidth - 24, cardY + 74);
  ctx.textAlign = 'left';

  // Content Area
  let currentY = cardY + headerHeight + 20;

  // Status Banner
  const isPaid =
    data.paymentStatus === 'SUCCESS' ||
    data.paymentStatus === 'paid' ||
    data.paymentStatus === 'completed';
  const isRefunded = data.isRefunded || data.paymentStatus === 'REFUNDED';

  const bannerHeight = 44;
  ctx.fillStyle = isPaid ? '#ecfdf5' : isRefunded ? '#eff6ff' : '#fffbeb';
  ctx.beginPath();
  ctx.roundRect(cardX + 24, currentY, cardWidth - 48, bannerHeight, 10);
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = isPaid ? '#a7f3d0' : isRefunded ? '#bfdbfe' : '#fde68a';
  ctx.stroke();

  ctx.fillStyle = isPaid ? '#065f46' : isRefunded ? '#1e40af' : '#92400e';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const statusLabel = isPaid
    ? '✓ Payment Verified & Completed'
    : isRefunded
    ? '↺ Payment Refunded'
    : '⏳ Cash on Delivery (Payment Pending)';
  ctx.fillText(statusLabel, cardX + 40, currentY + 27);

  ctx.textAlign = 'right';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(`৳${formatMoney(data.grandTotal)} BDT`, cardX + cardWidth - 40, currentY + 28);
  ctx.textAlign = 'left';

  currentY += bannerHeight + 20;

  // 2-Column Metadata Box
  const metaBoxHeight = 105;
  ctx.fillStyle = '#f9fafb';
  ctx.beginPath();
  ctx.roundRect(cardX + 24, currentY, cardWidth - 48, metaBoxHeight, 12);
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#e5e7eb';
  ctx.stroke();

  const colWidth = (cardWidth - 48) / 2;

  // Column 1: Customer & Shipping
  const col1X = cardX + 40;
  ctx.fillStyle = '#6b7280';
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('BILLED & SHIPPED TO', col1X, currentY + 22);

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(data.customerName || 'Conscious Buyer', col1X, currentY + 40);

  const addressLines = formatAddressString(data.shippingAddress);
  ctx.fillStyle = '#4b5563';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  addressLines.slice(0, 2).forEach((line, idx) => {
    ctx.fillText(line, col1X, currentY + 58 + idx * 16);
  });
  if (data.customerPhone) {
    ctx.fillText(`Contact: ${data.customerPhone}`, col1X, currentY + 90);
  }

  // Column 2: Payment & Logistics
  const col2X = cardX + 24 + colWidth + 16;
  ctx.fillStyle = '#6b7280';
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('PAYMENT & DISPATCH DETAILS', col2X, currentY + 22);

  ctx.fillStyle = '#111827';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    `Gateway: ${data.paymentMethod.toUpperCase()} ${data.paymentProvider ? `(${data.paymentProvider})` : ''}`,
    col2X,
    currentY + 40
  );

  ctx.fillStyle = '#1b6d24';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(`TrxID: ${data.transactionId || 'PENDING'}`, col2X, currentY + 58);

  ctx.fillStyle = '#4b5563';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Courier: ${data.courierName || 'SUNNO Eco-Fleet Express'}`, col2X, currentY + 74);
  if (data.trackingNumber) {
    ctx.fillText(`Consignment: ${data.trackingNumber}`, col2X, currentY + 90);
  }

  currentY += metaBoxHeight + 24;

  // Itemized Table Header
  const tableX = cardX + 24;
  const tableWidth = cardWidth - 48;
  const thHeight = 28;

  ctx.fillStyle = '#f3f4f6';
  ctx.beginPath();
  ctx.roundRect(tableX, currentY, tableWidth, thHeight, 6);
  ctx.fill();

  ctx.fillStyle = '#4b5563';
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('ITEM DESCRIPTION & ARTISAN WORKSHOP', tableX + 14, currentY + 18);

  ctx.textAlign = 'center';
  ctx.fillText('QTY', tableX + tableWidth - 190, currentY + 18);

  ctx.textAlign = 'right';
  ctx.fillText('UNIT PRICE', tableX + tableWidth - 100, currentY + 18);
  ctx.fillText('TOTAL (BDT)', tableX + tableWidth - 14, currentY + 18);
  ctx.textAlign = 'left';

  currentY += thHeight + 8;

  // Item Rows
  data.items.forEach((item, index) => {
    // Subtle alternate row background
    if (index % 2 === 1) {
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(tableX, currentY - 4, tableWidth, itemRowHeight);
    }

    ctx.fillStyle = '#111827';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const itemName = item.name.length > 38 ? `${item.name.slice(0, 36)}...` : item.name;
    ctx.fillText(itemName, tableX + 14, currentY + 14);

    ctx.fillStyle = '#6b7280';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Artisan: ${item.sellerName || 'Rural Bangladesh Guild'}`, tableX + 14, currentY + 28);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${item.quantity}`, tableX + tableWidth - 190, currentY + 18);

    ctx.textAlign = 'right';
    ctx.font = '12px monospace';
    ctx.fillStyle = '#4b5563';
    ctx.fillText(`৳${formatMoney(item.unitPrice)}`, tableX + tableWidth - 100, currentY + 18);

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#002c11';
    ctx.fillText(`৳${formatMoney(item.totalPrice)}`, tableX + tableWidth - 14, currentY + 18);
    ctx.textAlign = 'left';

    // Divider line
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tableX, currentY + itemRowHeight - 4);
    ctx.lineTo(tableX + tableWidth, currentY + itemRowHeight - 4);
    ctx.stroke();

    currentY += itemRowHeight;
  });

  currentY += 12;

  // Financial Summary Box
  const summaryBoxWidth = 320;
  const summaryBoxX = tableX + tableWidth - summaryBoxWidth;

  ctx.fillStyle = '#f9fafb';
  ctx.beginPath();
  ctx.roundRect(summaryBoxX, currentY, summaryBoxWidth, 116, 10);
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#e5e7eb';
  ctx.stroke();

  // Subtotal row
  ctx.fillStyle = '#4b5563';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Items Subtotal:', summaryBoxX + 16, currentY + 24);
  ctx.textAlign = 'right';
  ctx.font = '12px monospace';
  ctx.fillText(`৳${formatMoney(data.subtotal)}`, summaryBoxX + summaryBoxWidth - 16, currentY + 24);
  ctx.textAlign = 'left';

  // Discount row (if any)
  let ledgerY = currentY + 44;
  if (data.discount && data.discount > 0) {
    ctx.fillStyle = '#059669';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Coupon Discount (${data.discountCode || 'PROMO'}):`, summaryBoxX + 16, ledgerY);
    ctx.textAlign = 'right';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`-৳${formatMoney(data.discount)}`, summaryBoxX + summaryBoxWidth - 16, ledgerY);
    ctx.textAlign = 'left';
    ledgerY += 20;
  }

  // Delivery Fee row
  ctx.fillStyle = '#4b5563';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Eco Delivery Charge:', summaryBoxX + 16, ledgerY);
  ctx.textAlign = 'right';
  ctx.font = '12px monospace';
  const deliveryText = data.shippingFee === 0 ? 'FREE' : `৳${formatMoney(data.shippingFee)}`;
  ctx.fillText(deliveryText, summaryBoxX + summaryBoxWidth - 16, ledgerY);
  ctx.textAlign = 'left';

  // Grand Total separator
  ctx.strokeStyle = '#002c11';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(summaryBoxX + 16, ledgerY + 12);
  ctx.lineTo(summaryBoxX + summaryBoxWidth - 16, ledgerY + 12);
  ctx.stroke();

  // Grand Total row
  ctx.fillStyle = '#002c11';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Grand Total Payable:', summaryBoxX + 16, ledgerY + 34);
  ctx.textAlign = 'right';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(`৳${formatMoney(data.grandTotal)} BDT`, summaryBoxX + summaryBoxWidth - 16, ledgerY + 34);
  ctx.textAlign = 'left';

  // Left-hand side: Official SUNNO Seal & Guarantee Badge
  const sealX = tableX;
  const sealY = currentY;
  ctx.fillStyle = '#f0fdf4';
  ctx.beginPath();
  ctx.roundRect(sealX, sealY, tableWidth - summaryBoxWidth - 20, 116, 10);
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#bbf7d0';
  ctx.stroke();

  ctx.fillStyle = '#065f46';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('🌱 SUNNO 100% FAIR-TRADE GUARANTEE', sealX + 16, sealY + 28);

  ctx.fillStyle = '#374151';
  ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('• 100% Biodegradable / Zero-Plastic Dispatch Packing', sealX + 16, sealY + 48);
  ctx.fillText('• Direct artisan compensation with 0% predatory middlemen', sealX + 16, sealY + 66);
  ctx.fillText('• 7-Day Rural Craft Inspection Return & Replacement Guarantee', sealX + 16, sealY + 84);
  ctx.fillText('• Digital Token: SUNNO-AUTH-2026-BD', sealX + 16, sealY + 102);

  currentY += 134;

  // Footer Seal Bar
  ctx.strokeStyle = '#d1d5db';
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 24, currentY);
  ctx.lineTo(cardX + cardWidth - 24, currentY);
  ctx.stroke();
  ctx.setLineDash([]);

  currentY += 16;

  ctx.fillStyle = '#6b7280';
  ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    'This is a verified digital sales receipt issued by SUNNO Marketplace. Keep for warranty and tax filing.',
    cardX + 24,
    currentY + 10
  );

  ctx.textAlign = 'right';
  ctx.fillText('www.sunno.eco • Dhaka, Bangladesh', cardX + cardWidth - 24, currentY + 10);
  ctx.textAlign = 'left';

  // Export to high-res PNG digital receipt image & trigger download
  return new Promise((resolve, reject) => {
    const filename = `SUNNO-Digital-Receipt-${data.orderNumber}.png`;
    try {
      if (canvas.toBlob) {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              try {
                const dataUrl = canvas.toDataURL('image/png', 1.0);
                triggerDownload(dataUrl, filename);
                resolve();
              } catch (e) {
                reject(e);
              }
              return;
            }
            const url = URL.createObjectURL(blob);
            triggerDownload(url, filename);
            setTimeout(() => URL.revokeObjectURL(url), 4000);
            resolve();
          },
          'image/png',
          1.0
        );
      } else {
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        triggerDownload(dataUrl, filename);
        resolve();
      }
    } catch {
      try {
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        triggerDownload(dataUrl, filename);
        resolve();
      } catch (err2) {
        reject(err2);
      }
    }
  });
}

/**
 * Generates the clean inner HTML for the SUNNO Digital Receipt document.
 */
export function getPrintableReceiptContent(rawData: DigitalReceiptData): string {
  const data = normalizeReceiptData(rawData);
  const isPaid =
    data.paymentStatus === 'SUCCESS' ||
    data.paymentStatus === 'paid' ||
    data.paymentStatus === 'completed';
  const isRefunded = data.isRefunded || data.paymentStatus === 'REFUNDED';
  const addressLines = formatAddressString(data.shippingAddress);

  const itemsRows = data.items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 10px 12px; font-size: 12px; vertical-align: top;">
          <strong style="color: #002c11; display: block; font-size: 13px;">${item.name}</strong>
          <span style="font-size: 11px; color: #6b7280;">Artisan Workshop: ${item.sellerName || 'Rural Bangladesh Artisan'}</span>
          ${item.sku ? `<span style="font-size: 10px; color: #9ca3af; font-family: monospace; display: block;">SKU: ${item.sku}</span>` : ''}
        </td>
        <td style="padding: 10px 12px; text-align: center; font-size: 12px; font-family: monospace; font-weight: 600; vertical-align: top;">${item.quantity}</td>
        <td style="padding: 10px 12px; text-align: right; font-size: 12px; font-family: monospace; vertical-align: top;">৳${formatMoney(item.unitPrice)}</td>
        <td style="padding: 10px 12px; text-align: right; font-size: 12px; font-family: monospace; font-weight: 700; color: #002c11; vertical-align: top;">৳${formatMoney(item.totalPrice)}</td>
      </tr>
    `
    )
    .join('');

  return `
    <div class="sunno-receipt-card" style="max-width: 780px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937;">
      <!-- Header -->
      <div style="background: #002c11; color: #ffffff; padding: 24px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 52px; height: 52px; background: #ffffff; border-radius: 12px; padding: 4px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
            <img src="${BRAND_LOGO}" alt="SUNNO Logo" style="width: 100%; height: 100%; object-fit: contain;" />
          </div>
          <div>
            <div style="font-size: 24px; font-weight: 900; letter-spacing: 1px; color: #ffffff; display: flex; align-items: center; gap: 8px;">
              SUNNO
              <span style="font-size: 9px; background: #1b6d24; color: #fff; padding: 2px 8px; border-radius: 9999px; font-weight: 700; text-transform: uppercase;">
                Sales & Tax Invoice
              </span>
            </div>
            <div style="font-size: 11px; color: #a7f3d0; margin-top: 2px;">
              100% Sustainable Artisanal Bangladesh Marketplace • BIN: 00482910-0102
            </div>
          </div>
        </div>
        <div style="text-align: right; font-size: 11px; color: #d1d5db;">
          <div style="font-weight: 800; color: #ffffff; font-size: 12px;">ORIGINAL CUSTOMER COPY</div>
          <div>${data.invoiceDate}</div>
          <div style="font-family: monospace; font-size: 12px; color: #34d399; font-weight: 700; margin-top: 3px;">
            ORDER: ${data.orderNumber}
          </div>
        </div>
      </div>

      <div style="padding: 24px;">
        <!-- Status Banner -->
        <div style="background: ${isPaid ? '#ecfdf5' : isRefunded ? '#eff6ff' : '#fffbeb'}; border: 1px solid ${isPaid ? '#a7f3d0' : isRefunded ? '#bfdbfe' : '#fde68a'}; color: ${isPaid ? '#065f46' : isRefunded ? '#1e40af' : '#92400e'}; padding: 12px 18px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 700; margin-bottom: 20px;">
          <span>${isPaid ? '✓ PAYMENT VERIFIED & COMPLETED' : isRefunded ? '↺ PAYMENT REFUNDED' : '⏳ PAYMENT PENDING (Cash on Delivery)'}</span>
          <span style="font-family: monospace; font-size: 15px;">৳${formatMoney(data.grandTotal)} BDT</span>
        </div>

        <!-- Meta Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f9fafb; padding: 16px; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 20px; font-size: 12px; line-height: 1.5;">
          <div>
            <div style="font-size: 10px; font-weight: 800; color: #6b7280; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Billed & Shipped To</div>
            <div style="font-weight: 800; color: #111827; font-size: 13px;">${data.customerName || 'Conscious Buyer'}</div>
            ${addressLines.map((l) => `<div>${l}</div>`).join('')}
            ${data.customerPhone ? `<div style="margin-top: 4px; font-weight: 600;">Contact: ${data.customerPhone}</div>` : ''}
            ${data.customerEmail ? `<div style="color: #6b7280;">Email: ${data.customerEmail}</div>` : ''}
          </div>
          <div>
            <div style="font-size: 10px; font-weight: 800; color: #6b7280; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Payment & Dispatch Info</div>
            <div>Payment: <strong style="text-transform: uppercase;">${data.paymentMethod}</strong> ${data.paymentProvider ? `(${data.paymentProvider})` : ''}</div>
            <div style="font-family: monospace; color: #1b6d24; font-weight: 700; margin: 2px 0;">TrxID: ${data.transactionId || 'PENDING'}</div>
            <div>Courier Service: <strong>${data.courierName || 'SUNNO Eco-Fleet Express'}</strong></div>
            ${data.trackingNumber ? `<div style="font-family: monospace; color: #374151;">Tracking Code: <strong>${data.trackingNumber}</strong></div>` : ''}
          </div>
        </div>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr>
              <th style="background: #f3f4f6; padding: 10px 12px; font-size: 10px; text-transform: uppercase; font-weight: 800; color: #4b5563; text-align: left; border-radius: 6px 0 0 6px;">Product / Artisan Service</th>
              <th style="background: #f3f4f6; padding: 10px 12px; font-size: 10px; text-transform: uppercase; font-weight: 800; color: #4b5563; text-align: center;">Qty</th>
              <th style="background: #f3f4f6; padding: 10px 12px; font-size: 10px; text-transform: uppercase; font-weight: 800; color: #4b5563; text-align: right;">Unit Price</th>
              <th style="background: #f3f4f6; padding: 10px 12px; font-size: 10px; text-transform: uppercase; font-weight: 800; color: #4b5563; text-align: right; border-radius: 0 6px 6px 0;">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- Financial Summary -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
          <div style="width: 330px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb; padding: 16px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #4b5563;">
              <span>Subtotal:</span>
              <span style="font-family: monospace; font-weight: 600;">৳${formatMoney(data.subtotal)}</span>
            </div>
            ${
              data.discount && data.discount > 0
                ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #059669; font-weight: 600;">
                <span>Coupon Discount (${data.discountCode || 'PROMO'}):</span>
                <span style="font-family: monospace;">-৳${formatMoney(data.discount)}</span>
              </div>
            `
                : ''
            }
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #4b5563;">
              <span>Delivery Charge:</span>
              <span style="font-family: monospace; font-weight: 600;">${data.shippingFee === 0 ? 'FREE' : `৳${formatMoney(data.shippingFee)}`}</span>
            </div>
            <div style="border-top: 2px solid #002c11; padding-top: 10px; margin-top: 8px; display: flex; justify-content: space-between; font-weight: 900; font-size: 15px; color: #002c11;">
              <span>Grand Total:</span>
              <span style="font-family: monospace;">৳${formatMoney(data.grandTotal)} BDT</span>
            </div>
          </div>
        </div>

        <!-- Footer Seal -->
        <div style="border-top: 1px dashed #d1d5db; padding-top: 16px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #6b7280;">
          <div>
            <strong style="color: #002c11; font-size: 11px;">SUNNO Fair-Trade & Zero-Plastic Rural Guarantee</strong><br/>
            Direct artisan empowerment • 100% handcrafted in Bangladesh • 7-day inspection policy
          </div>
          <div style="text-align: right;">
            <strong style="color: #002c11; font-size: 11px;">www.sunno.eco</strong><br/>
            Central Hub: Savar & Sylhet Clusters • Dhaka, Bangladesh
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generates a full, standalone HTML page containing the receipt, custom toolbar, and auto-print trigger.
 */
export function getFullPrintableReceiptHtml(rawData: DigitalReceiptData, autoPrint: boolean = true): string {
  const data = normalizeReceiptData(rawData);
  const content = getPrintableReceiptContent(data);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>SUNNO Digital Tax Receipt - ${data.orderNumber}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #f3f4f6;
      color: #1f2937;
      padding: 24px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .toolbar {
      max-width: 780px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #002c11;
      padding: 12px 18px;
      border-radius: 12px;
      color: #fff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .toolbar button {
      background: #1b6d24;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s;
    }
    .toolbar button:hover {
      background: #238b2e;
    }
    .toolbar .btn-close {
      background: #374151;
    }
    .toolbar .btn-close:hover {
      background: #4b5563;
    }
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      .sunno-receipt-card {
        border: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        max-width: 100% !important;
      }
      @page {
        size: A4 portrait;
        margin: 10mm;
      }
    }
  </style>
  ${
    autoPrint
      ? `<script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.print();
        } catch (e) {
          console.warn('Auto print error:', e);
        }
      }, 350);
    });
  </script>`
      : ''
  }
</head>
<body>
  <div class="toolbar no-print">
    <div style="font-size: 13px; font-weight: 700;">
      📄 SUNNO Official Digital Receipt (${data.orderNumber})
    </div>
    <div style="display: flex; gap: 8px;">
      <button onclick="window.print()">
        🖨️ Print / Save as PDF
      </button>
      <button class="btn-close" onclick="window.close()">
        ✕ Close
      </button>
    </div>
  </div>

  ${content}
</body>
</html>`;
}

/**
 * Native, bulletproof print function for digital receipts.
 * 1. Populates the in-DOM `#sunno-print-container` with clean A4 printable markup.
 * 2. Attempts print via isolated hidden iframe (bypasses iframe sandboxing and hides outer UI).
 * 3. Falls back to window.print() or opening new printable tab if needed.
 */
export function printDigitalReceiptDocument(rawData: DigitalReceiptData): void {
  const data = normalizeReceiptData(rawData);
  // 1. Populate the in-DOM print container for standard Ctrl+P / Cmd+P
  try {
    let printContainer = document.getElementById('sunno-print-container');
    if (!printContainer) {
      printContainer = document.createElement('div');
      printContainer.id = 'sunno-print-container';
      document.body.appendChild(printContainer);
    }
    printContainer.innerHTML = getPrintableReceiptContent(data);
  } catch (err) {
    console.warn('Could not populate in-DOM print container:', err);
  }

  // 2. Primary print execution: use dedicated hidden iframe for isolated print
  try {
    const existingFrame = document.getElementById('sunno-isolated-print-frame');
    if (existingFrame && document.body.contains(existingFrame)) {
      document.body.removeChild(existingFrame);
    }

    const printFrame = document.createElement('iframe');
    printFrame.id = 'sunno-isolated-print-frame';
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '1px';
    printFrame.style.height = '1px';
    printFrame.style.opacity = '0.01';
    printFrame.style.border = '0';
    printFrame.style.pointerEvents = 'none';
    printFrame.setAttribute('aria-hidden', 'true');
    document.body.appendChild(printFrame);

    const fullHtml = getFullPrintableReceiptHtml(data, false);
    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;

    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(fullHtml);
      frameDoc.close();

      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } catch (iframeErr) {
          console.warn('Iframe print failed, falling back to window.print:', iframeErr);
          window.focus();
          window.print();
        } finally {
          setTimeout(() => {
            if (document.body.contains(printFrame)) {
              document.body.removeChild(printFrame);
            }
          }, 8000);
        }
      }, 350);
      return;
    }
  } catch (err) {
    console.warn('Isolated iframe print error, using window.print fallback:', err);
  }

  // 3. Direct window.print fallback
  try {
    window.focus();
    window.print();
  } catch (err) {
    console.warn('Main window.print encountered issue, launching dedicated new tab print:', err);
    openPrintableReceiptInNewTab(data);
  }
}

/**
 * Opens a dedicated printable receipt in a new tab without iframe or sandbox restrictions.
 * This guarantees printing works even on restricted browsers or embedded mobile iframes.
 */
export function openPrintableReceiptInNewTab(rawData: DigitalReceiptData): void {
  const data = normalizeReceiptData(rawData);
  try {
    const fullHtml = getFullPrintableReceiptHtml(data, true);
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);

    const win = window.open(blobUrl, '_blank');
    if (!win) {
      // If popup blocker intervened, trigger via anchor tag
      const a = document.createElement('a');
      a.href = blobUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  } catch (err) {
    console.error('Failed to open printable receipt in new tab:', err);
  }
}

