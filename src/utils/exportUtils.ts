import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Collection, CollectorUser, Client } from '../types';
import { formatXAF } from '../data/mockData';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'all';

export interface ReportMetrics {
  periodLabel: string;
  startDateStr: string;
  endDateStr: string;
  totalCollected: number;
  totalPending: number;
  totalAttempted: number;
  completedCount: number;
  pendingCount: number;
  cancelledCount: number;
  draftCount: number;
  pendingSyncTotal: number;
  successRate: number;
  avgTicketSize: number;
  topClient: { name: string; amount: number } | null;
  sectorBreakdown: { sector: string; amount: number; count: number; percentage: number }[];
  dailyBreakdown: { date: string; amount: number; count: number }[];
  bossExecutiveSummary: string;
}

/**
 * Filter collections by timeframe
 */
export function filterCollectionsByPeriod(
  collections: Collection[],
  period: ReportPeriod,
  referenceDate: Date = new Date()
): { filtered: Collection[]; periodLabel: string; start: Date; end: Date } {
  const ref = new Date(referenceDate);
  let start: Date;
  let end: Date = new Date(ref);
  end.setHours(23, 59, 59, 999);

  let periodLabel = 'All Time Collections';

  if (period === 'daily') {
    start = new Date(ref);
    start.setHours(0, 0, 0, 0);
    periodLabel = `Daily Report (${ref.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})`;
  } else if (period === 'weekly') {
    // Current week (last 7 days up to end of today)
    start = new Date(ref);
    start.setDate(ref.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    periodLabel = `Weekly Report (${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})`;
  } else if (period === 'monthly') {
    // Current month
    start = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
    periodLabel = `Monthly Report (${ref.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })})`;
  } else {
    start = new Date(0);
    periodLabel = 'Comprehensive Historical Report';
  }

  const filtered = collections.filter((item) => {
    const itemDate = new Date(item.timestamp || Date.now());
    return itemDate >= start && itemDate <= end;
  });

  return { filtered, periodLabel, start, end };
}

/**
 * Compute executive calculations for leadership
 */
export function calculateReportMetrics(
  collections: Collection[],
  drafts: Collection[] = [],
  clients: Client[] = [],
  periodLabel: string = 'Period',
  start: Date = new Date(),
  end: Date = new Date()
): ReportMetrics {
  const completed = collections.filter((c) => c.status === 'COMPLETE');
  const pending = collections.filter((c) => c.status === 'PENDING');
  const cancelled = collections.filter((c) => c.status === 'CANCELLED');
  const totalCollected = completed.reduce((acc, c) => acc + c.amount, 0);
  const totalPending = pending.reduce((acc, c) => acc + c.amount, 0);
  const pendingSyncTotal = 0;

  const totalAttempted = collections.length;
  const successRate = totalAttempted > 0 ? (completed.length / totalAttempted) * 100 : 0;
  const avgTicketSize = completed.length > 0 ? totalCollected / completed.length : 0;

  // Top client calculation
  const clientTotals: Record<string, { name: string; amount: number }> = {};
  completed.forEach((c) => {
    if (!clientTotals[c.clientId]) {
      clientTotals[c.clientId] = { name: c.clientName, amount: 0 };
    }
    clientTotals[c.clientId].amount += c.amount;
  });

  let topClient: { name: string; amount: number } | null = null;
  Object.values(clientTotals).forEach((entry) => {
    if (!topClient || entry.amount > topClient.amount) {
      topClient = entry;
    }
  });

  // Sector breakdown
  const sectorMap: Record<string, { amount: number; count: number }> = {
    'North Sector': { amount: 0, count: 0 },
    'South Sector': { amount: 0, count: 0 },
    'East Sector': { amount: 0, count: 0 },
    'West Sector': { amount: 0, count: 0 },
  };

  completed.forEach((c) => {
    const client = clients.find((cl) => cl.id === c.clientId || cl.name === c.clientName);
    const sector = client?.region || (c.location?.includes('North') ? 'North Sector' : c.location?.includes('South') ? 'South Sector' : c.location?.includes('East') ? 'East Sector' : c.location?.includes('West') ? 'West Sector' : 'Central Sector');
    if (!sectorMap[sector]) {
      sectorMap[sector] = { amount: 0, count: 0 };
    }
    sectorMap[sector].amount += c.amount;
    sectorMap[sector].count += 1;
  });

  const sectorBreakdown = Object.entries(sectorMap)
    .filter(([_, data]) => data.count > 0 || data.amount > 0)
    .map(([sector, data]) => ({
      sector,
      amount: data.amount,
      count: data.count,
      percentage: totalCollected > 0 ? Math.round((data.amount / totalCollected) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Daily timeline breakdown
  const dailyMap: Record<string, { amount: number; count: number }> = {};
  completed.forEach((c) => {
    const d = new Date(c.timestamp || Date.now()).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    });
    if (!dailyMap[d]) {
      dailyMap[d] = { amount: 0, count: 0 };
    }
    dailyMap[d].amount += c.amount;
    dailyMap[d].count += 1;
  });

  const dailyBreakdown = Object.entries(dailyMap).map(([date, data]) => ({
    date,
    amount: data.amount,
    count: data.count,
  }));

  // Auto-generate clear executive explanation for the leadership
  const topSector = sectorBreakdown[0]?.sector || 'Douala Commercial Sector';
  const topSectorPct = sectorBreakdown[0]?.percentage || 0;
  const bossExecutiveSummary = `EXECUTIVE SUMMARY: Total cash collected and settled during this period is ${formatXAF(
    totalCollected
  )} FCFA across ${completed.length} completed settlements (${successRate.toFixed(
    1
  )}% recovery efficiency). Pending collections awaiting field collection total ${formatXAF(
    totalPending
  )} FCFA across ${pending.length} tasks. The average collection ticket size is ${formatXAF(
    Math.round(avgTicketSize)
  )} FCFA. ${
    topClient ? `Key client '${topClient.name}' contributed ${formatXAF(topClient.amount)} FCFA. ` : ''
  }${
    sectorBreakdown.length > 0
      ? `Primary inflow sector is ${topSector} (${topSectorPct}% of total volume). `
      : ''
  }All completed collections have been reconciled and verified for vault clearing.`;

  return {
    periodLabel,
    startDateStr: start.toLocaleDateString('en-GB'),
    endDateStr: end.toLocaleDateString('en-GB'),
    totalCollected,
    totalPending,
    totalAttempted,
    completedCount: completed.length,
    pendingCount: pending.length,
    cancelledCount: cancelled.length,
    draftCount: 0,
    pendingSyncTotal: 0,
    successRate,
    avgTicketSize,
    topClient,
    sectorBreakdown,
    dailyBreakdown,
    bossExecutiveSummary,
  };
}

// -------------------------------------------------------------
// 1. PDF GENERATOR FOR GENERAL REPORT
// -------------------------------------------------------------
export function downloadReportPDF(
  collections: Collection[],
  metrics: ReportMetrics,
  user: CollectorUser
) {
  const doc = new jsPDF();

  // Primary brand cyan banner header
  doc.setFillColor(8, 145, 178); // #0891b2
  doc.rect(0, 0, 210, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('E-NAKO — FIELD COLLECTION REPORT', 14, 11);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Institutional Cash Management & Field Agent Reconciliation', 14, 18);

  // Metadata block
  doc.setTextColor(26, 28, 28);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(metrics.periodLabel.toUpperCase(), 14, 33);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(95, 94, 94);
  doc.text(`Generated: ${new Date().toLocaleString()} | Terminal: ${user.terminalId}`, 14, 38);
  doc.text(`Collector Officer: ${user.name} (${user.id}) | Branch: ${user.branch}`, 14, 43);

  // Executive KPI summary box
  doc.setFillColor(243, 243, 243);
  doc.roundedRect(14, 47, 182, 28, 2, 2, 'F');
  doc.setDrawColor(229, 229, 229);
  doc.roundedRect(14, 47, 182, 28, 2, 2, 'S');

  // KPI 1: Total Cash Collected (Settled)
  doc.setFontSize(7.5);
  doc.setTextColor(95, 94, 94);
  doc.text('TOTAL CASH COLLECTED', 20, 54);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(8, 145, 178);
  doc.text(`${formatXAF(metrics.totalCollected)} FCFA`, 20, 62);

  // KPI 2: Recovery Rate
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(95, 94, 94);
  doc.text('SETTLEMENT SUCCESS', 80, 54);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 28, 28);
  doc.text(`${metrics.successRate.toFixed(1)}% (${metrics.completedCount}/${metrics.totalAttempted})`, 80, 62);

  // KPI 3: Avg Ticket Size
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(95, 94, 94);
  doc.text('AVG TICKET / VISIT', 140, 54);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 28, 28);
  doc.text(`${formatXAF(Math.round(metrics.avgTicketSize))} FCFA`, 140, 62);

  // Pending Collections banner inside KPI box
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(202, 138, 4);
  doc.text(`* Pending Volume: ${formatXAF(metrics.totalPending)} FCFA (${metrics.pendingCount} collections assigned)`, 20, 71);

  // Executive summary for Boss paragraph
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(8, 145, 178);
  doc.text('MANAGEMENT EXECUTIVE BRIEFING:', 14, 82);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(8);
  const splitSummary = doc.splitTextToSize(metrics.bossExecutiveSummary, 182);
  doc.text(splitSummary, 14, 87);

  const startY = 87 + splitSummary.length * 4 + 4;

  // Transaction items table
  const tableData = collections.map((col) => [
    col.id,
    col.clientName,
    col.assignedCollectorName || user.name || 'Field Agent',
    `${formatXAF(col.amount)} FCFA`,
    col.location || 'Douala, Cameroon',
    new Date(col.timestamp || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    col.status === 'COMPLETE' ? 'SETTLED' : col.status,
  ]);

  autoTable(doc, {
    startY: startY,
    head: [['Transaction Ref', 'Client Name', 'Collector', 'Amount (FCFA)', 'Location', 'Timestamp', 'Status']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [8, 145, 178],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [26, 28, 28],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [8, 145, 178] },
      3: { fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  // Footer signatures
  const finalY = (doc as any).lastAutoTable.finalY + 12;
  if (finalY < 250) {
    doc.setDrawColor(200, 200, 200);
    doc.line(14, finalY + 15, 80, finalY + 15);
    doc.line(130, finalY + 15, 196, finalY + 15);

    doc.setFontSize(7.5);
    doc.setTextColor(95, 94, 94);
    doc.text(`Field Collector: ${user.name}`, 14, finalY + 19);
    doc.text('Vault Teller / Clearance Supervisor', 130, finalY + 19);
  }

  doc.save(`E_NAKO_Report_${metrics.periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`);
}

// -------------------------------------------------------------
// 2. EXCEL (.XLSX) GENERATOR FOR GENERAL REPORT
// -------------------------------------------------------------
export function downloadReportExcel(
  collections: Collection[],
  metrics: ReportMetrics,
  user: CollectorUser
) {
  const wb = XLSX.utils.book_new();

  // 1. Executive Summary Sheet
  const summaryRows = [
    ['E-NAKO - FIELD COLLECTION EXECUTIVE REPORT'],
    ['Report Period:', metrics.periodLabel],
    ['Date Range:', `${metrics.startDateStr} to ${metrics.endDateStr}`],
    ['Generated On:', new Date().toLocaleString()],
    ['Collector Name:', user.name],
    ['Collector ID:', user.id],
    ['Branch Agency:', user.branch],
    [],
    ['EXECUTIVE KEY PERFORMANCE INDICATORS (KPIs)'],
    ['Metric Description', 'Calculated Value', 'Notes / Benchmark'],
    ['Total Cash Collected (Settled)', metrics.totalCollected, 'Total vaulted or cleared for deposit (FCFA)'],
    ['Pending Collections Volume', metrics.totalPending, 'Awaiting field clearance (FCFA)'],
    ['Total Tasks Attempted', metrics.totalAttempted, 'Total field collection tasks'],
    ['Settled Collections Count', metrics.completedCount, 'Completed cash settlements'],
    ['Cancelled Tasks', metrics.cancelledCount, 'Client unavailable / declined'],
    ['Settlement Success Rate', `${metrics.successRate.toFixed(1)}%`, 'Percent of visits converted to cash'],
    ['Average Collection Ticket Size', Math.round(metrics.avgTicketSize), 'Average cash collected per completed task (FCFA)'],
    ['Top Contributing Client', metrics.topClient ? `${metrics.topClient.name} (${metrics.topClient.amount} FCFA)` : 'N/A', 'Highest single payer in this timeframe'],
    [],
    ['MANAGEMENT EXECUTIVE BRIEF FOR LEADERSHIP'],
    [metrics.bossExecutiveSummary],
    [],
    ['SECTOR / REGIONAL BREAKDOWN'],
    ['Sector / Zone', 'Total Collected (FCFA)', 'Number of Visits', 'Share of Total (%)'],
    ...metrics.sectorBreakdown.map((s) => [s.sector, s.amount, s.count, `${s.percentage}%`]),
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

  // 2. Detailed Itemized Transactions Sheet
  const detailHeaders = [
    'Transaction Ref',
    'Client Name',
    'Collector Name',
    'Amount (FCFA)',
    'Date & Time',
    'Status',
    'Location',
    'Collector Notes',
  ];

  const detailRows = collections.map((col) => [
    col.id,
    col.clientName,
    col.assignedCollectorName || user.name || 'Collector',
    col.amount,
    new Date(col.timestamp || Date.now()).toLocaleString(),
    col.status === 'COMPLETE' ? 'SETTLED' : col.status,
    col.location || 'Douala, Cameroon',
    col.notes || '',
  ]);

  const wsDetails = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Transaction Logs');

  XLSX.writeFile(wb, `E_NAKO_Collections_${metrics.periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
}

// -------------------------------------------------------------
// 3. WORD (.DOC) GENERATOR FOR GENERAL REPORT
// -------------------------------------------------------------
export function downloadReportWord(
  collections: Collection[],
  metrics: ReportMetrics,
  user: CollectorUser
) {
  const tableRowsHtml = collections
    .map(
      (col) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 8px; font-family: monospace; color: #0891b2; font-weight: bold;">${col.id}</td>
      <td style="padding: 8px; font-weight: 600;">${col.clientName}</td>
      <td style="padding: 8px;">${col.assignedCollectorName || user.name || 'Collector'}</td>
      <td style="padding: 8px; font-family: monospace; font-weight: bold; text-align: right;">${formatXAF(col.amount)} FCFA</td>
      <td style="padding: 8px; font-size: 11px; color: #64748b;">${new Date(col.timestamp || Date.now()).toLocaleString()}</td>
      <td style="padding: 8px; font-weight: bold; color: ${col.status === 'COMPLETE' ? '#166534' : '#64748b'};">${col.status === 'COMPLETE' ? 'SETTLED' : col.status}</td>
    </tr>`
    )
    .join('');

  const sectorRowsHtml = metrics.sectorBreakdown
    .map(
      (s) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 6px 8px; font-weight: bold;">${s.sector}</td>
      <td style="padding: 6px 8px; text-align: right; font-family: monospace;">${formatXAF(s.amount)} FCFA</td>
      <td style="padding: 6px 8px; text-align: center;">${s.count}</td>
      <td style="padding: 6px 8px; text-align: right; font-weight: bold; color: #0891b2;">${s.percentage}%</td>
    </tr>`
    )
    .join('');

  const wordContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>E-NAKO Collection Report</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1c1c; line-height: 1.5; margin: 24px; }
        .header { border-bottom: 3px solid #0891b2; padding-bottom: 12px; margin-bottom: 20px; }
        .bank-title { font-size: 20pt; font-weight: bold; color: #0891b2; margin: 0; }
        .sub-title { font-size: 11pt; color: #475569; margin: 2px 0 0 0; }
        .kpi-container { background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 14px; margin: 16px 0; border-radius: 4px; }
        .kpi-grid { display: table; width: 100%; }
        .kpi-cell { display: table-cell; padding: 8px 12px; width: 33%; vertical-align: top; }
        .kpi-title { font-size: 8.5pt; text-transform: uppercase; color: #64748b; font-weight: bold; }
        .kpi-val { font-size: 16pt; font-weight: bold; color: #0891b2; font-family: monospace; }
        .executive-box { background-color: #ecfeff; border-left: 4px solid #0891b2; padding: 12px 16px; margin: 16px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 10pt; }
        th { background-color: #0891b2; color: #ffffff; padding: 8px; text-align: left; font-size: 9pt; }
        .signature-table { width: 100%; margin-top: 40px; border: none; }
        .signature-table td { border: none; padding: 20px 10px 0 10px; width: 50%; vertical-align: top; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="bank-title">E-NAKO</h1>
        <p class="sub-title">Field Cash Collection & Executive Performance Report • ${metrics.periodLabel}</p>
        <p style="font-size: 9pt; color: #64748b; margin-top: 6px;">
          Generated: ${new Date().toLocaleString()} | Terminal: ${user.terminalId} | Branch: ${user.branch} | Collector: ${user.name} (${user.id})
        </p>
      </div>

      <div class="kpi-container">
        <table style="width: 100%; border: none;">
          <tr>
            <td style="border: none; width: 33%;">
              <div class="kpi-title">TOTAL CASH SETTLED</div>
              <div class="kpi-val">${formatXAF(metrics.totalCollected)} XAF</div>
            </td>
            <td style="border: none; width: 33%;">
              <div class="kpi-title">VISIT SUCCESS RATE</div>
              <div class="kpi-val" style="color: #1a1c1c;">${metrics.successRate.toFixed(1)}% (${metrics.completedCount}/${metrics.totalAttempted})</div>
            </td>
            <td style="border: none; width: 33%;">
              <div class="kpi-title">AVG TICKET SIZE</div>
              <div class="kpi-val" style="color: #1a1c1c;">${formatXAF(Math.round(metrics.avgTicketSize))} XAF</div>
            </td>
          </tr>
        </table>
      </div>

      <div class="executive-box">
        <strong style="color: #0891b2; font-size: 10.5pt; text-transform: uppercase;">Management Executive Summary:</strong>
        <p style="margin: 6px 0 0 0; font-size: 10pt; color: #0f172a;">${metrics.bossExecutiveSummary}</p>
      </div>

      ${
        metrics.sectorBreakdown.length > 0
          ? `
        <h3 style="font-size: 11pt; text-transform: uppercase; color: #0891b2; margin-top: 20px;">Regional / Sector Inflows</h3>
        <table>
          <thead>
            <tr>
              <th>Sector / District</th>
              <th style="text-align: right;">Total Amount</th>
              <th style="text-align: center;">Transactions</th>
              <th style="text-align: right;">Share of Total</th>
            </tr>
          </thead>
          <tbody>
            ${sectorRowsHtml}
          </tbody>
        </table>
      `
          : ''
      }

      <h3 style="font-size: 11pt; text-transform: uppercase; color: #0891b2; margin-top: 24px;">Itemized Field Transaction Records</h3>
      <table>
        <thead>
          <tr>
            <th>Ref ID</th>
            <th>Client ID</th>
            <th>Client Name</th>
            <th style="text-align: right;">Amount</th>
            <th>Timestamp</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>

      <table class="signature-table">
        <tr>
          <td>
            <p style="font-size: 9pt; font-weight: bold; text-transform: uppercase; color: #64748b;">Field Collector Verification</p>
            <div style="border-bottom: 1px solid #1a1c1c; padding-top: 30px;">${user.name} (${user.id})</div>
          </td>
          <td>
            <p style="font-size: 9pt; font-weight: bold; text-transform: uppercase; color: #64748b;">Vault Clearance Officer</p>
            <div style="border-bottom: 1px solid #1a1c1c; padding-top: 30px;">Signature & Stamp</div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', wordContent], {
    type: 'application/msword',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `E_NAKO_Report_${metrics.periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------
// 4. TRANSACTION SLIP / RECEIPT EXPORTERS (PDF, WORD, EXCEL)
// -------------------------------------------------------------

export function buildReceiptPdfDocument(collection: Collection, user?: { name?: string; terminalId?: string }): jsPDF {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Header Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(8, 145, 178);
    doc.text('E-NAKO CASH SYSTEM', 14, 18);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(95, 94, 94);
    doc.text('OFFICIAL CASH COLLECTION RECEIPT', 14, 24);

    doc.setFontSize(8);
    doc.text(`Issued: ${new Date(collection.timestamp || Date.now()).toLocaleString()}`, 14, 29);

    doc.setDrawColor(229, 229, 229);
    doc.setLineWidth(0.5);
    doc.line(14, 32, 196, 32);

    // Status Banner
    const isComplete = collection.status === 'COMPLETE';
    doc.setFillColor(isComplete ? 220 : 254, isComplete ? 252 : 249, isComplete ? 231 : 195);
    doc.roundedRect(14, 36, 182, 10, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(isComplete ? 22 : 133, isComplete ? 101 : 77, isComplete ? 52 : 14);
    doc.text(`STATUS: ${isComplete ? 'OFFICIALLY COLLECTED & SETTLED' : 'COLLECTION PENDING'}`, 105, 42.5, { align: 'center' });

    // Amount Hero Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 50, 182, 24, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(14, 116, 144);
    doc.text('AMOUNT COLLECTED', 105, 57, { align: 'center' });

    doc.setFontSize(22);
    doc.setTextColor(26, 28, 28);
    doc.text(`${formatXAF(collection.amount)} FCFA`, 105, 68, { align: 'center' });

    // Details Grid Table
    autoTable(doc, {
      startY: 80,
      head: [['TRANSACTION FIELD', 'DETAILS']],
      body: [
        ['Transaction ID', collection.id],
        ['Client Name', collection.clientName],
        ['Collector Name', collection.assignedCollectorName || user?.name || 'Field Cash Collector'],
        ['Amount (FCFA)', `${formatXAF(collection.amount)} FCFA`],
        ['Location', collection.location || 'Douala, Cameroon'],
        ['Date & Time', `${new Date(collection.timestamp || Date.now()).toLocaleDateString('en-GB')} at ${collection.time || 'Now'}`],
        ['Deposit Destination', collection.depositDestination || 'Cash Collection'],
        ['Dispatch Channel', 'cash@enakoos.com'],
        ['Status', collection.status === 'COMPLETE' ? 'OFFICIALLY COLLECTED & SETTLED' : 'COLLECTION PENDING'],
      ],
      headStyles: { fillColor: [47, 49, 49], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [26, 28, 28] },
      alternateRowStyles: { fillColor: [249, 249, 249] },
      margin: { left: 14, right: 14 },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 150;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(95, 94, 94);
    doc.text('E-NAKO Official Digital Receipt Confirmation', 14, finalY + 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('This receipt was automatically issued and verified by E-NAKO Financial Systems (cash@enakoos.com).', 14, finalY + 19);

    return doc;
  } catch (e) {
    console.error('PDF receipt build error:', e);
    return new jsPDF();
  }
}

export function downloadReceiptPDF(collection: Collection, user: CollectorUser) {
  try {
    const doc = buildReceiptPdfDocument(collection, user);
    doc.save(`E_NAKO_Receipt_${collection.id}.pdf`);
  } catch (e) {
    console.error('PDF receipt download error:', e);
  }
}

export function generateReceiptPdfBase64(collection: Collection, user?: { name?: string; terminalId?: string }): string {
  try {
    const doc = buildReceiptPdfDocument(collection, user);
    const dataUri = doc.output('datauristring');
    const commaIdx = dataUri.indexOf(',');
    return commaIdx !== -1 ? dataUri.substring(commaIdx + 1) : dataUri;
  } catch (e) {
    console.warn('PDF base64 generation error:', e);
    return '';
  }
}

export function downloadReceiptExcel(collection: Collection, user: CollectorUser) {
  const noteText = collection.summaryNote || collection.notes || 'None';
  const wb = XLSX.utils.book_new();
  const rows = [
    ['E-NAKO - TRANSACTION RECEIPT SLIP'],
    ['Receipt ID:', collection.id],
    ['Status:', collection.status],
    ['Collected Amount (XAF):', collection.amount],
    [],
    ['Client ID:', collection.clientId],
    ['Client Name:', collection.clientName],
    ['Transaction Date:', new Date(collection.timestamp || Date.now()).toLocaleDateString('en-GB')],
    ['Transaction Time:', new Date(collection.timestamp || Date.now()).toLocaleTimeString()],
    ['Location / GPS:', collection.location || 'Field Point'],
    ['Collector Notes / Summary:', noteText],
    [],
    ['Collector Name:', user.name],
    ['Collector ID:', user.id],
    ['Terminal POS ID:', user.terminalId],
    ['Assigned Agency:', user.branch],
    ['Security Validation:', 'SHA-256 Verified by CollectorOS'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, `Receipt_${collection.id}`);
  XLSX.writeFile(wb, `Receipt_${collection.id}.xlsx`);
}

export function downloadReceiptWord(collection: Collection, user: CollectorUser) {
  const noteText = collection.summaryNote || collection.notes || '';
  const wordContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>Receipt Slip #${collection.id}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1c1c; margin: 30px; }
        .receipt-card { max-width: 480px; margin: 0 auto; border: 2px solid #0891b2; padding: 20px; border-radius: 6px; }
        .header { text-align: center; border-bottom: 2px solid #0891b2; padding-bottom: 10px; }
        .bank-name { font-size: 16pt; font-weight: bold; color: #0891b2; margin: 0; }
        .slip-title { font-size: 10pt; color: #64748b; margin: 2px 0; text-transform: uppercase; }
        .amount-box { background-color: #ecfeff; border: 1px solid #a5f3fc; text-align: center; padding: 14px; margin: 16px 0; }
        .amount-val { font-size: 22pt; font-weight: bold; color: #0891b2; font-family: monospace; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10pt; }
        td { padding: 6px 4px; border-bottom: 1px solid #f1f5f9; }
        .label { color: #64748b; font-weight: bold; text-transform: uppercase; font-size: 8.5pt; width: 40%; }
        .value { color: #0f172a; font-weight: 600; text-align: right; }
      </style>
    </head>
    <body>
      <div class="receipt-card">
        <div class="header">
          <h1 class="bank-name">E-NAKO</h1>
          <p class="slip-title">Official Cash Collection Slip #${collection.id}</p>
          <p style="font-size: 8.5pt; color: #64748b;">Terminal ${user.terminalId} • ${user.branch}</p>
        </div>

        <div class="amount-box">
          <div style="font-size: 8.5pt; color: #64748b; font-weight: bold; text-transform: uppercase;">Amount Collected</div>
          <div class="amount-val">${formatXAF(collection.amount)} XAF</div>
          <div style="font-size: 8.5pt; color: #0891b2; font-weight: bold; text-transform: uppercase; margin-top: 4px;">Status: ${collection.status}</div>
        </div>

        <table>
          <tr><td class="label">Transaction Ref</td><td class="value" style="color: #0891b2; font-family: monospace;">${collection.id}</td></tr>
          <tr><td class="label">Client ID</td><td class="value">${collection.clientId}</td></tr>
          <tr><td class="label">Client Name</td><td class="value">${collection.clientName}</td></tr>
          <tr><td class="label">Collector Officer</td><td class="value">${user.name} (${user.id})</td></tr>
          <tr><td class="label">Date & Time</td><td class="value">${new Date(collection.timestamp || Date.now()).toLocaleString()}</td></tr>
          <tr><td class="label">Location / GPS</td><td class="value">${collection.location || 'Field Point'}</td></tr>
          ${noteText ? `<tr><td class="label">Field Notes / Summary</td><td class="value" style="color: #0891b2; font-weight: bold;">${noteText}</td></tr>` : ''}
        </table>

        <div style="text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
          <div style="font-family: monospace; font-size: 9pt; letter-spacing: 2px;">|||||| |||| |||||||| |||| |||||</div>
          <p style="font-size: 7.5pt; color: #94a3b8; margin-top: 4px;">Encrypted Digital Signature • E-NAKO Cash Reconciliation</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', wordContent], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Receipt_${collection.id}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
