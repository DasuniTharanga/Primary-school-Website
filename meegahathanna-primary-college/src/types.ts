export type Kind = 'notices' | 'events' | 'teachers' | 'classes' | 'gallery' | 'resources';
export interface ContentData {
  pinned?: boolean;
  date?: string;
  time?: string;
  location?: string;
  role?: string;
  grade?: string | number;
  subject?: string;
  reviewRequired?: boolean;
  sections?: string;
  subjects?: string;
  alt?: string;
  consentConfirmed?: boolean;
  filePath?: string;
  link?: string;
}
export interface ContentItem {
  id: string;
  kind: Kind;
  title: string;
  summary: string;
  body: string;
  category: string;
  status: 'draft' | 'published';
  imagePath: string;
  data: ContentData;
  sortOrder: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
export interface ContentPage extends Page<ContentItem> {
  categories: string[];
}
export interface Settings {
  name: string;
  sinhalaName: string;
  shortName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  hours: string;
  about: string;
  vision: string;
  mission: string;
  principalName: string;
  principalMessage: string;
  heroImage: string;
  logoImage: string;
  admissionsOpen: boolean;
  version: number;
}
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'EDITOR';
  active: boolean;
}
export interface Session {
  user: User | null;
  csrfToken: string;
}
export interface InboxItem {
  id: string;
  reference: string;
  status: string;
  internalNotes: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  phone: string;
  message: string;
  name?: string;
  email?: string;
  subject?: string;
  parentName?: string;
  parentEmail?: string;
  childName?: string;
  dateOfBirth?: string;
  grade?: number;
  address?: string;
  consentAt?: string;
}
export interface DashboardData {
  contentCounts: Record<Kind, { total: number; published: number | null }>;
  recent: ContentItem[];
  inbox: { messages: number; admissions: number } | null;
}
export interface AuditItem {
  id: string;
  actor: string;
  action: string;
  subject: string;
  createdAt: string;
}
