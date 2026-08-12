// ============================================================
// Database & shared types for AI Content Studio
// ============================================================

export type JobStatus =
  | "pending"
  | "research"
  | "script"
  | "seo"
  | "scene_planning"
  | "stock_media"
  | "voice"
  | "subtitles"
  | "video_rendering"
  | "ready_for_review"
  | "upload"
  | "completed"
  | "failed";

export type ProjectStatus = "active" | "archived";
export type UploadStatus =
  | "pending"
  | "authenticating"
  | "uploading"
  | "processing"
  | "published"
  | "failed";
export type Visibility = "public" | "unlisted" | "private";

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  default_language: string | null;
  timezone: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  ai_provider: string;
  voice: string;
  default_language: string;
  video_duration: number;
  upload_defaults: Record<string, unknown>;
  publishing_preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  niche: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface ContentJob {
  id: string;
  project_id: string | null;
  user_id: string;
  topic: string;
  script: string | null;
  status: JobStatus;
  retry_count: number;
  last_error: string | null;
  stage_started_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Script {
  id: string;
  job_id: string;
  hook: string | null;
  introduction: string | null;
  main_content: string | null;
  ending: string | null;
  cta: string | null;
  language: string | null;
  style: string | null;
  length_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export interface SeoMetadata {
  id: string;
  job_id: string;
  title: string | null;
  description: string | null;
  hashtags: string[] | null;
  keywords: string[] | null;
  tags: string[] | null;
  thumbnail_title: string | null;
  pinned_comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface Scene {
  id: string;
  job_id: string;
  scene_index: number;
  narration: string | null;
  search_keywords: string[] | null;
  duration: number | null;
  transition: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockAsset {
  id: string;
  job_id: string;
  scene_id: string | null;
  provider: string | null;
  source_url: string | null;
  local_path: string | null;
  license_info: string | null;
  fallback_used: boolean;
  created_at: string;
  updated_at: string;
}

export interface VoiceFile {
  id: string;
  job_id: string;
  storage_path: string | null;
  voice_name: string | null;
  duration: number | null;
  format: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubtitleFile {
  id: string;
  job_id: string;
  storage_path: string | null;
  format: string | null;
  has_word_timestamps: boolean;
  created_at: string;
  updated_at: string;
}

export interface Video {
  id: string;
  job_id: string;
  storage_path: string | null;
  resolution: string | null;
  duration: number | null;
  thumbnail: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface YoutubeUpload {
  id: string;
  job_id: string;
  user_id: string;
  video_id: string | null;
  url: string | null;
  publish_status: UploadStatus;
  title: string | null;
  visibility: Visibility;
  playlist_id: string | null;
  category: string | null;
  language: string | null;
  uploaded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CronLog {
  id: string;
  run_id: string | null;
  task_name: string | null;
  started_at: string | null;
  finished_at: string | null;
  status: string | null;
  summary: Record<string, unknown>;
}

export interface SystemLog {
  id: string;
  job_id: string | null;
  level: string;
  message: string;
  context: Record<string, unknown>;
  duration_ms: number | null;
  created_at: string;
}

export type {
  Database,
} from "./database";
