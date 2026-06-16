import type { ProfessionalReport } from './reportFormatter';

export function generateExcelHTML(report: ProfessionalReport): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${report.title}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; background: #f9fafb; }
    .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
    .header { background: linear-gradient(135deg,#667eea,#764ba2); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
    .header h1 { margin: 0 0 8px; font-size: 26px; }
    .header p { margin: 4px 0; opacity: .9; font-size: 13px; }
    .summary { background: #f0fdf4; padding: 20px; margin: 20px; border-radius: 8px; border-left: 4px solid #22c55e; }
    .summary h3 { margin: 0 0 12px; color: #166534; }
    .section { margin: 20px; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
    .section h2 { margin: 0 0 14px; color: #374151; font-size: 17px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f3f4f6; padding: 10px 12px; text-align: left; font-weight: 600; color: #374151; border: 1px solid #e5e7eb; }
    td { padding: 9px 12px; border: 1px solid #e5e7eb; color: #4b5563; }
    tr:hover td { background: #f9fafb; }
    .up { color: #10b981; font-weight: 600; }
    .down { color: #ef4444; font-weight: 600; }
    .stable { color: #f59e0b; font-weight: 600; }
    .footer { background: #f9fafb; padding: 14px; text-align: center; font-size: 11px; color: #6b7280; border-radius: 0 0 12px 12px; }
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>${report.title}</h1>
    <p>${report.subtitle}</p>
    <p>📅 ${report.generatedAt}</p>
    ${report.dateRange ? `<p>📆 Період: ${report.dateRange.from} — ${report.dateRange.to}</p>` : ''}
  </div>

  ${report.summary && Object.keys(report.summary).length > 0 ? `
  <div class="summary">
    <h3>📊 Ключові показники</h3>
    <table>
      ${Object.entries(report.summary).map(([k, v]) => `
      <tr><th style="background:#f0fdf4;width:220px">${k}</th><td><strong>${v}</strong></td></tr>
      `).join('')}
    </table>
  </div>` : ''}

  ${report.sections.filter(s => s.rows.length > 0).map(section => {
    const keys = Array.from(new Set(section.rows.flatMap(r => Object.keys(r))));
    return `
  <div class="section">
    <h2>${section.title}</h2>
    <table>
      <thead><tr>${keys.map(k => `<th>${k}</th>`).join('')}</tr></thead>
      <tbody>
        ${section.rows.map(row => `
        <tr>${keys.map(k => {
          const v = String(row[k] ?? '');
          const cls = v.includes('зростання') || v.includes('📈') ? 'up'
            : v.includes('спадання') || v.includes('📉') ? 'down'
            : v.includes('стабільно') || v.includes('➡️') ? 'stable'
            : '';
          return `<td${cls ? ` class="${cls}"` : ''}>${v}</td>`;
        }).join('')}</tr>`).join('')}
      </tbody>
    </table>
  </div>`;
  }).join('')}

  <div class="footer">✨ Звіт згенеровано за допомогою StartWay Analytics Platform</div>
</div>
</body>
</html>`;
}

export function triggerHTMLDownload(report: ProfessionalReport, filename: string) {
  const html = generateExcelHTML(report);
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
