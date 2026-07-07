/// <reference path="../.astro/types.d.ts" />
declare namespace App {
  interface Locals {
    user: {
      id: string;
      username: string;
      role: 'admin' | 'manager' | 'engineer' | 'viewer';
      is_sysadmin: 0 | 1;
      theme_preference: string;
    } | null;
  }
}
