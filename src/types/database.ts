// ============================================================
// Supabase Database type mapping (that maps to the SQL schema)
// ============================================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: import("./db").UserProfile;
        Insert: Partial<import("./db").UserProfile>;
        Update: Partial<import("./db").UserProfile>;
      };
      settings: {
        Row: import("./db").UserSettings;
        Insert: Partial<import("./db").UserSettings>;
        Update: Partial<import("./db").UserSettings>;
      };
      api_keys: { Row: ApiKeyRow };
      projects: {
        Row: import("./db").Project;
        Insert: Partial<import("./db").Project>;
        Update: Partial<import("./db").Project>;
      };
      content_jobs: {
        Row: import("./db").ContentJob;
        Insert: Partial<import("./db").ContentJob>;
        Update: Partial<import("./db").ContentJob>;
      };
      scripts: {
        Row: import("./db").Script;
        Insert: Partial<import("./db").Script>;
        Update: Partial<import("./db").Script>;
      };
      seo_metadata: {
        Row: import("./db").SeoMetadata;
        Insert: Partial<import("./db").SeoMetadata>;
        Update: Partial<import("./db").SeoMetadata>;
      };
      scenes: {
        Row: import("./db").Scene;
        Insert: Partial<import("./db").Scene>;
        Update: Partial<import("./db").Scene>;
      };
      stock_assets: {
        Row: import("./db").StockAsset;
        Insert: Partial<import("./db").StockAsset>;
        Update: Partial<import("./db").StockAsset>;
      };
      voice_files: {
        Row: import("./db").VoiceFile;
        Insert: Partial<import("./db").VoiceFile>;
        Update: Partial<import("./db").VoiceFile>;
      };
      subtitle_files: {
        Row: import("./db").SubtitleFile;
        Insert: Partial<import("./db").SubtitleFile>;
        Update: Partial<import("./db").SubtitleFile>;
      };
      videos: {
        Row: import("./db").Video;
        Insert: Partial<import("./db").Video>;
        Update: Partial<import("./db").Video>;
      };
      youtube_uploads: {
        Row: import("./db").YoutubeUpload;
        Insert: Partial<import("./db").YoutubeUpload>;
        Update: Partial<import("./db").YoutubeUpload>;
      };
      cron_logs: {
        Row: import("./db").CronLog;
        Insert: Partial<import("./db").CronLog>;
        Update: Partial<import("./db").CronLog>;
      };
      system_logs: {
        Row: import("./db").SystemLog;
        Insert: Partial<import("./db").SystemLog>;
        Update: Partial<import("./db").SystemLog>;
      };
    };
  };
}

export interface ApiKeyRow {
  id: string;
  user_id: string;
  provider: string;
  encrypted_key: string;
  created_at: string;
  updated_at: string;
}
