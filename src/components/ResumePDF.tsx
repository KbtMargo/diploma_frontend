'use client';

import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Roboto Regular — has full Cyrillic support; the bold TTF subset from the same CDN is Latin-only
// so we use one weight and rely on size/color/layout for hierarchy.
Font.register({
  family: 'Roboto',
  src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf',
});

const c = {
  indigo: '#4f46e5',
  gray:   '#6b7280',
  dark:   '#111827',
  light:  '#9ca3af',
  border: '#e5e7eb',
  bgBlue: '#eef2ff',
  bgGreen:'#f0fdf4',
  green:  '#16a34a',
  body:   '#374151',
};

const s = StyleSheet.create({
  page:        { fontFamily: 'Roboto', fontSize: 10, color: c.dark, padding: '36 44', backgroundColor: '#fff' },

  // Header block
  header:      { marginBottom: 14, paddingBottom: 10, borderBottom: `2 solid ${c.indigo}` },
  name:        { fontSize: 20, color: c.indigo, marginBottom: 2 },
  role:        { fontSize: 10, color: c.gray,   marginBottom: 7 },
  contactRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  contactItem: { fontSize: 9,  color: c.gray },

  // Sections
  section:     { marginBottom: 11 },
  sectionLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 8 },
  sectionTitle:{ fontSize: 12, color: c.indigo },
  sectionRule: { flex: 1, borderBottom: `1 solid ${c.indigo}` },

  // Items
  item:        { marginBottom: 7 },
  row:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemTitle:   { fontSize: 10, color: c.dark  },
  itemSub:     { fontSize: 9,  color: c.indigo, marginTop: 1, marginBottom: 1 },
  itemDate:    { fontSize: 9,  color: c.light  },
  itemDesc:    { fontSize: 9,  color: c.body,   lineHeight: 1.5, marginTop: 2 },
  bullet:      { fontSize: 9,  color: c.body,   marginLeft: 10, marginTop: 1 },

  // Tags
  tagsRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  tagSkill:    { backgroundColor: c.bgBlue,  color: c.indigo, fontSize: 9, padding: '3 7', borderRadius: 4 },
  tagLang:     { backgroundColor: c.bgGreen, color: c.green,  fontSize: 9, padding: '3 7', borderRadius: 4 },

  summary:     { fontSize: 10, color: c.body, lineHeight: 1.5 },
});

const LOCALE_BCP47: Record<string, string> = { uk: 'uk-UA', en: 'en-US', de: 'de-DE', pl: 'pl-PL' };

const PDF_LABELS: Record<string, Record<string, string>> = {
  uk: { role: 'Шукач роботи', tel: 'Тел', summary: 'Про себе', work: 'Досвід роботи', present: 'по теперішній час', education: 'Освіта', grade: 'Оцінка', skills: 'Навички', languages: 'Мови', portfolio: 'Портфоліо' },
  en: { role: 'Job Seeker',   tel: 'Tel', summary: 'About Me',  work: 'Work Experience', present: 'present',            education: 'Education', grade: 'Grade',  skills: 'Skills',   languages: 'Languages', portfolio: 'Portfolio'  },
  de: { role: 'Stellensuchender', tel: 'Tel', summary: 'Über mich', work: 'Berufserfahrung', present: 'bis heute',      education: 'Ausbildung', grade: 'Note',   skills: 'Kenntnisse', languages: 'Sprachen',  portfolio: 'Portfolio'  },
  pl: { role: 'Szukający pracy',  tel: 'Tel', summary: 'O mnie',   work: 'Doświadczenie',   present: 'obecnie',          education: 'Wykształcenie', grade: 'Ocena', skills: 'Umiejętności', languages: 'Języki', portfolio: 'Portfolio'  },
};

const fmt = (d?: string | null, bcp47 = 'uk-UA') => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString(bcp47, { month: 'short', year: 'numeric' }); }
  catch { return ''; }
};

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={s.sectionLine}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionRule} />
    </View>
  );
}

interface Props {
  user: any;
  skills: any[];
  education: any[];
  workExperience: any[];
  portfolio: any[];
  locale?: string;
}

export default function ResumePDF({ user, skills, education, workExperience, portfolio, locale = 'uk' }: Props) {
  const bcp47 = LOCALE_BCP47[locale] ?? 'uk-UA';
  const L = PDF_LABELS[locale] ?? PDF_LABELS.uk;

  const contacts: string[] = [];
  if (user.email)       contacts.push(`Email: ${user.email}`);
  if (user.phoneNumber) contacts.push(`${L.tel}: ${user.phoneNumber}`);
  if (user.city)        contacts.push(`${user.city}${user.country ? `, ${user.country}` : ''}`);

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.name}>{user.firstName} {user.lastName}</Text>
          <Text style={s.role}>{L.role}</Text>
          <View style={s.contactRow}>
            {contacts.map((ct, i) => <Text key={i} style={s.contactItem}>{ct}</Text>)}
          </View>
        </View>

        {/* ── Summary ── */}
        {user.summary && (
          <View style={s.section}>
            <SectionHeader title={L.summary} />
            <Text style={s.summary}>{user.summary}</Text>
          </View>
        )}

        {/* ── Work experience ── */}
        {workExperience?.length > 0 && (
          <View style={s.section}>
            <SectionHeader title={L.work} />
            {workExperience.map((w, i) => (
              <View key={i} style={s.item}>
                <View style={s.row}>
                  <Text style={s.itemTitle}>{w.position}</Text>
                  <Text style={s.itemDate}>
                    {fmt(w.startDate, bcp47)} — {w.current ? L.present : fmt(w.endDate, bcp47)}
                  </Text>
                </View>
                <Text style={s.itemSub}>{w.company}</Text>
                {w.description && <Text style={s.itemDesc}>{w.description}</Text>}
                {w.achievements?.map((a: string, j: number) => (
                  <Text key={j} style={s.bullet}>• {a}</Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* ── Education ── */}
        {education?.length > 0 && (
          <View style={s.section}>
            <SectionHeader title={L.education} />
            {education.map((e, i) => (
              <View key={i} style={s.item}>
                <View style={s.row}>
                  <Text style={s.itemTitle}>{e.institution}</Text>
                  <Text style={s.itemDate}>{fmt(e.startDate, bcp47)} — {fmt(e.endDate, bcp47)}</Text>
                </View>
                <Text style={s.itemSub}>{e.degree}{e.field ? ` · ${e.field}` : ''}</Text>
                {e.grade       && <Text style={s.itemDesc}>{L.grade}: {e.grade}</Text>}
                {e.description && <Text style={s.itemDesc}>{e.description}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* ── Skills ── */}
        {skills?.length > 0 && (
          <View style={s.section}>
            <SectionHeader title={L.skills} />
            <View style={s.tagsRow}>
              {skills.map((sk, i) => <Text key={i} style={s.tagSkill}>{sk.name}</Text>)}
            </View>
          </View>
        )}

        {/* ── Languages ── */}
        {(user.languages || []).length > 0 && (
          <View style={s.section}>
            <SectionHeader title={L.languages} />
            <View style={s.tagsRow}>
              {user.languages.map((l: string, i: number) => <Text key={i} style={s.tagLang}>{l}</Text>)}
            </View>
          </View>
        )}

        {/* ── Portfolio ── */}
        {portfolio?.length > 0 && (
          <View style={s.section}>
            <SectionHeader title={L.portfolio} />
            {portfolio.map((p, i) => (
              <View key={i} style={s.item}>
                <Text style={s.itemTitle}>{p.title}</Text>
                {p.description && <Text style={s.itemDesc}>{p.description}</Text>}
                {p.url && <Text style={[s.itemDesc, { color: c.indigo }]}>{p.url}</Text>}
              </View>
            ))}
          </View>
        )}

      </Page>
    </Document>
  );
}
