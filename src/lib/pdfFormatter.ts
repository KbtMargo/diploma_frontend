import type { ProfessionalReport } from './reportFormatter';

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function trendClass(val: string): string {
  const v = String(val);
  if (v.includes('зростання') || v.includes('Зростання') || v.includes('Позитивна') || v.includes('(+)') || v.includes('(++)'))
    return 'trend-up';
  if (v.includes('падіння') || v.includes('Падіння') || v.includes('Потребує') || v.includes('(--)') || v.includes('(-)'))
    return 'trend-down';
  if (v.includes('Стабільність') || v.includes('стабільно') || v.includes('(=)'))
    return 'trend-stable';
  return '';
}

function sectionAccent(idx: number): string {
  const palettes = [
    { header: '#4f46e5', light: '#eef2ff', border: '#6366f1' },
    { header: '#059669', light: '#ecfdf5', border: '#10b981' },
    { header: '#7c3aed', light: '#f5f3ff', border: '#8b5cf6' },
    { header: '#d97706', light: '#fffbeb', border: '#f59e0b' },
    { header: '#0284c7', light: '#f0f9ff', border: '#0ea5e9' },
    { header: '#dc2626', light: '#fff1f2', border: '#f87171' },
  ];
  return JSON.stringify(palettes[idx % palettes.length]);
}

export function generateReportHTML(report: ProfessionalReport): string {
  const sections = report.sections.filter(s => s.rows.length > 0);

  const summaryRows = report.summary
    ? Object.entries(report.summary).map(([k, v]) => `
      <tr>
        <td class="sum-key">${escapeHtml(k)}</td>
        <td class="sum-val">${escapeHtml(String(v))}</td>
      </tr>`).join('')
    : '';

  const sectionBlocks = sections.map((section, idx) => {
    const palette = JSON.parse(sectionAccent(idx));
    const keys = Array.from(new Set(section.rows.flatMap(r => Object.keys(r))));
    const thead = keys.map(k => `<th>${escapeHtml(k)}</th>`).join('');
    const tbody = section.rows.map((row, ri) => {
      const cells = keys.map(k => {
        const v = String(row[k] ?? '');
        const cls = trendClass(v);
        return `<td${cls ? ` class="${cls}"` : ''}>${escapeHtml(v)}</td>`;
      }).join('');
      return `<tr class="${ri % 2 === 0 ? 'row-even' : 'row-odd'}">${cells}</tr>`;
    }).join('');

    return `
    <div class="section" style="--sec-header:${palette.header};--sec-light:${palette.light};--sec-border:${palette.border}">
      <div class="section-header">
        <span class="section-title">${escapeHtml(section.title.toUpperCase())}</span>
        <span class="section-count">${section.rows.length} записів</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>${thead}</tr></thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(report.title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', Arial, sans-serif;
      font-size: 13px;
      color: #1f2937;
      background: #f3f4f6;
      padding: 24px;
    }

    .page {
      max-width: 960px;
      margin: 0 auto;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,.08);
      overflow: hidden;
    }

    /* ── Header ── */
    .header {
      background: linear-gradient(135deg, #312e81 0%, #4f46e5 50%, #7c3aed 100%);
      padding: 36px 40px 28px;
      color: #fff;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: -40px; right: -40px;
      width: 220px; height: 220px;
      background: rgba(255,255,255,.06);
      border-radius: 50%;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: -60px; left: 30%;
      width: 160px; height: 160px;
      background: rgba(255,255,255,.04);
      border-radius: 50%;
    }
    .header-badge {
      display: inline-block;
      background: rgba(255,255,255,.15);
      border: 1px solid rgba(255,255,255,.25);
      border-radius: 20px;
      padding: 3px 14px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: .5px;
      text-transform: uppercase;
      margin-bottom: 14px;
    }
    .header h1 {
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -.3px;
      margin-bottom: 8px;
      position: relative;
    }
    .header-subtitle {
      font-size: 13px;
      opacity: .8;
      margin-bottom: 18px;
      position: relative;
    }
    .header-meta {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    .meta-chip {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,.12);
      border-radius: 8px;
      padding: 5px 12px;
      font-size: 11.5px;
      position: relative;
    }

    /* ── Print button (hidden in print) ── */
    .print-bar {
      background: #1e1b4b;
      padding: 10px 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .print-bar span {
      color: #a5b4fc;
      font-size: 12px;
    }
    .btn-print {
      background: #4f46e5;
      color: #fff;
      border: none;
      padding: 8px 22px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background .15s;
    }
    .btn-print:hover { background: #4338ca; }

    /* ── Summary ── */
    .body { padding: 28px 40px; }
    .summary {
      background: #f0fdf4;
      border-left: 4px solid #16a34a;
      border-radius: 0 10px 10px 0;
      padding: 18px 22px;
      margin-bottom: 28px;
    }
    .summary-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .6px;
      color: #15803d;
      margin-bottom: 12px;
    }
    .summary table { width: 100%; border-collapse: collapse; }
    .sum-key {
      width: 45%;
      padding: 5px 0;
      color: #374151;
      font-size: 12.5px;
      border-bottom: 1px solid #dcfce7;
      vertical-align: top;
    }
    .sum-val {
      padding: 5px 0;
      font-weight: 600;
      color: #111827;
      font-size: 12.5px;
      border-bottom: 1px solid #dcfce7;
    }

    /* ── Sections ── */
    .section {
      margin-bottom: 24px;
      border-radius: 10px;
      border: 1px solid #e5e7eb;
      overflow: hidden;
    }
    .section-header {
      background: var(--sec-light);
      border-bottom: 2px solid var(--sec-border);
      padding: 11px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--sec-header);
      letter-spacing: .4px;
    }
    .section-count {
      font-size: 11px;
      color: #9ca3af;
      background: #fff;
      border-radius: 12px;
      padding: 2px 10px;
      border: 1px solid #e5e7eb;
    }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead th {
      background: #f9fafb;
      padding: 9px 12px;
      text-align: left;
      font-weight: 600;
      font-size: 11.5px;
      color: #4b5563;
      border-bottom: 1px solid #e5e7eb;
      white-space: nowrap;
    }
    td {
      padding: 8px 12px;
      border-bottom: 1px solid #f3f4f6;
      color: #374151;
      vertical-align: middle;
    }
    .row-even td { background: #fff; }
    .row-odd td { background: #fafafa; }
    .trend-up { color: #059669; font-weight: 600; }
    .trend-down { color: #dc2626; font-weight: 600; }
    .trend-stable { color: #d97706; font-weight: 600; }

    /* ── Footer ── */
    .footer {
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      padding: 14px 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .footer-left { font-size: 11.5px; color: #6b7280; }
    .footer-right { font-size: 11px; color: #9ca3af; }

    /* ── Print styles ── */
    @media print {
      body { background: #fff; padding: 0; }
      .page { box-shadow: none; border-radius: 0; max-width: 100%; }
      .print-bar { display: none !important; }
      .header { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .section { break-inside: avoid; }
      thead { display: table-header-group; }
      .table-wrap { overflow: visible; }
    }
  </style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="header-badge">📊 StartWay Analytics</div>
    <h1>${escapeHtml(report.title)}</h1>
    <p class="header-subtitle">${escapeHtml(report.subtitle)}</p>
    <div class="header-meta">
      <div class="meta-chip">📅 ${escapeHtml(report.generatedAt)}</div>
      ${report.dateRange ? `<div class="meta-chip">📆 Період: ${escapeHtml(report.dateRange.from)} — ${escapeHtml(report.dateRange.to)}</div>` : ''}
    </div>
  </div>

  <div class="print-bar">
    <span>Звіт готовий · Оберіть «Зберегти як PDF» у діалозі друку</span>
    <button class="btn-print" onclick="window.print()">🖨️ Зберегти PDF</button>
  </div>

  <div class="body">
    ${summaryRows ? `
    <div class="summary">
      <div class="summary-title">📌 Ключові показники</div>
      <table><tbody>${summaryRows}</tbody></table>
    </div>` : ''}

    ${sectionBlocks}
  </div>

  <div class="footer">
    <span class="footer-left">✨ Згенеровано StartWay Analytics Platform</span>
    <span class="footer-right">${new Date().toLocaleDateString('uk-UA', { dateStyle: 'long' })}</span>
  </div>

</div>
<script>
  // Auto-open print dialog after fonts load
  window.addEventListener('load', function() {
    setTimeout(function() { window.print(); }, 600);
  });
</script>
</body>
</html>`;
}

export function openReportAsPDF(report: ProfessionalReport): void {
  const html = generateReportHTML(report);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    // Fallback: direct download if popup blocked
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.toLowerCase().replace(/\s+/g, '_')}.html`;
    a.click();
  }
  // Revoke after enough time for the new window to load
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
