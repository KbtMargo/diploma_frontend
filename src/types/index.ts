export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'job_seeker' | 'employer' | 'admin';
  avatarUrl?: string;
  resumeUrl?: string;
  phoneNumber?: string;
  country?: string;
  city?: string;
  summary?: string;
  dateOfBirth?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  skills?: Skill[];
  languages?: string[];
  preferredCountries?: string[];
  preferredJobTypes?: string[];
  education?: Education[];
  workExperience?: WorkExperience[];
  portfolio?: Portfolio[];
  company?: Company;
  createdAt: string;
}

export interface Skill {
  id: string;
  name: string;
  slug: string;
  category?: SkillCategory;
}

export interface SkillCategory {
  id: string;
  name: string;
  icon?: string;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  requirements?: string;
  responsibilities?: string;
  benefits?: string;
  jobType: string;
  status: string;
  experienceLevel: string;
  workFormat: string;
  country?: string;
  city?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  isSalaryNegotiable?: boolean;
  isRemote?: boolean;
  applicationDeadline?: string;
  category?: string;
  tags?: string[];
  isFeatured?: boolean;
  isUrgent?: boolean;
  views?: number;
  applicationsCount?: number;
  requiredLanguages?: string[];
  employer?: User;
  requiredSkills?: Skill[];
  createdAt: string;
}

export interface AiAnalysis {
  score: number;
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no';
  strengths: string[];
  gaps: string[];
  summary: string;
}

export interface Application {
  id: string;
  jobId: string;
  applicantId: string;
  status: string;
  coverLetter?: string;
  expectedSalary?: number;
  expectedSalaryCurrency?: string;
  availableStartDate?: string;
  employerNotes?: string;
  rating?: number;
  aiAnalysis?: AiAnalysis | null;
  aiAnalyzedAt?: string;
  job?: Job;
  applicant?: User;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  coverImageUrl?: string;
  description?: string;
  shortDescription?: string;
  website?: string;
  email?: string;
  industry?: string;
  size?: string;
  foundedYear?: number;
  status: string;
  rating?: number;
  reviewsCount?: number;
  isVerified?: boolean;
  totalJobsPosted?: number;
  owner?: User;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: string;
  isRead: boolean;
  sender?: User;
  createdAt: string;
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  grade?: string;
  description?: string;
}

export interface WorkExperience {
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
  achievements?: string[];
}

export interface Portfolio {
  title: string;
  description: string;
  url?: string;
  fileUrl?: string;
  fileType?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}