import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { jobsService } from '@/services/jobs.service';
import { useAuthStore } from '@/store/authStore';

export function useSavedJobs() {
  const { isAuthenticated } = useAuthStore();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) { setSavedIds(new Set()); return; }
    jobsService.getSavedJobs(1, 100)
      .then(data => setSavedIds(new Set<string>((data.data || []).map((j: any) => j.id))))
      .catch(() => {});
  }, [isAuthenticated]);

  const toggleSave = async (jobId: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!isAuthenticated) { toast.error('Увійдіть, щоб зберігати вакансії'); return; }
    const isSaved = savedIds.has(jobId);
    setSavedIds(prev => { const n = new Set(prev); isSaved ? n.delete(jobId) : n.add(jobId); return n; });
    try {
      isSaved ? await jobsService.unsaveJob(jobId) : await jobsService.saveJob(jobId);
      toast.success(isSaved ? 'Видалено зі збережених' : 'Додано до збережених');
    } catch {
      setSavedIds(prev => { const n = new Set(prev); isSaved ? n.add(jobId) : n.delete(jobId); return n; });
      toast.error('Помилка');
    }
  };

  return { savedIds, toggleSave };
}
