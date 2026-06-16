export interface ReportSection {
  title: string;
  rows: Record<string, any>[];
  metadata?: {
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
  };
}

export interface ProfessionalReport {
  title: string;
  subtitle: string;
  generatedAt: string;
  dateRange?: { from: string; to: string };
  sections: ReportSection[];
  summary?: Record<string, any>;
}

export function generateProfessionalCSV(report: ProfessionalReport): string {
  const lines: string[] = [];

  lines.push(`"${report.title}"`);
  lines.push(`"${report.subtitle}"`);
  lines.push(`"Дата генерації: ${report.generatedAt}"`);
  if (report.dateRange) {
    lines.push(`"Період: ${report.dateRange.from} - ${report.dateRange.to}"`);
  }
  lines.push('');

  if (report.summary && Object.keys(report.summary).length > 0) {
    lines.push('"КЛЮЧОВІ ПОКАЗНИКИ"');
    lines.push('"Показник","Значення"');
    for (const [key, value] of Object.entries(report.summary)) {
      const formatted = typeof value === 'object' ? JSON.stringify(value) : String(value);
      lines.push(`"${key}","${formatted}"`);
    }
    lines.push('');
  }

  for (const section of report.sections) {
    if (section.rows.length === 0) continue;

    lines.push(`"=== ${section.title.toUpperCase()} ==="`);

    const allKeys = new Set<string>();
    for (const row of section.rows) {
      for (const key of Object.keys(row)) allKeys.add(key);
    }
    const headers = Array.from(allKeys);

    lines.push(headers.map(h => `"${h}"`).join(','));

    for (const row of section.rows) {
      const values = headers.map(header => {
        const value = formatCellValue(row[header] ?? '', header);
        return escapeCSV(String(value));
      });
      lines.push(values.join(','));
    }

    lines.push('');
  }

  lines.push(`"Звіт згенеровано: StartWay Analytics, ${new Date().toLocaleString('uk-UA')}"`);

  return lines.join('\n');
}

function formatCellValue(value: any, header: string): any {
  if (value === null || value === undefined) return '-';

  if (typeof value === 'string' && value.includes('%') && header.includes('зміна')) {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      const sign = num > 0 ? '+' : '';
      return `${sign}${value}`;
    }
  }

  if (typeof value === 'number') {
    if (Number.isInteger(value)) return value.toLocaleString('uk-UA');
    return value.toFixed(2).replace('.', ',');
  }

  return value;
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function generateProfessionalJSON(report: ProfessionalReport): any {
  return {
    metadata: {
      title: report.title,
      subtitle: report.subtitle,
      generatedAt: report.generatedAt,
      dateRange: report.dateRange,
      platform: 'StartWay',
      version: '2.0',
    },
    summary: report.summary,
    sections: report.sections.map(section => ({
      name: section.title,
      data: section.rows,
    })),
    footer: {
      exportedBy: 'StartWay Admin Panel',
      exportTimestamp: new Date().toISOString(),
    },
  };
}
