'use client';

import { PDFDownloadLink } from '@react-pdf/renderer';
import { Loader2, Download } from 'lucide-react';
import ResumePDF from './ResumePDF';

interface Props {
  user: any;
  skills: any[];
  education: any[];
  workExperience: any[];
  portfolio: any[];
}

export default function PDFDownloadButton({ user, skills, education, workExperience, portfolio }: Props) {
  return (
    <PDFDownloadLink
      document={
        <ResumePDF
          user={user}
          skills={skills}
          education={education}
          workExperience={workExperience}
          portfolio={portfolio}
        />
      }
      fileName={`resume-${user.firstName}-${user.lastName}.pdf`.toLowerCase().replace(/\s+/g, '-')}
    >
      {({ loading }) => (
        <button
          className="flex items-center gap-2 px-4 py-2 border border-indigo-200 text-indigo-600 rounded-lg text-sm hover:bg-indigo-50 transition-colors disabled:opacity-50"
          disabled={loading}
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          Згенерувати PDF
        </button>
      )}
    </PDFDownloadLink>
  );
}
