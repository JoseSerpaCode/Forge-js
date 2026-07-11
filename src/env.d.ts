/// <reference path="../.astro/types.d.ts" />
declare namespace App {
  interface Locals {
    user: {
      id: string;
      username: string;
      role: 'admin' | 'manager' | 'engineer' | 'viewer';
      is_sysadmin: 0 | 1;
      is_guest: 0 | 1;
      theme_preference: string;
      last_workspace_id?: string;
      last_page_id?: string;
      avatar_url?: string;
      bio?: string;
      pronouns?: string;
      public_email?: string;
      github_id?: string;
      google_id?: string;
    } | null;
    lang: 'en' | 'es';
  }
}

interface Window {
  showToast?: (message: string, type?: 'success' | 'error') => void;
}
