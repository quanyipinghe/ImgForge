/// <reference types="astro/client" />

type D1Database = import('@cloudflare/workers-types').D1Database;
type R2Bucket = import('@cloudflare/workers-types').R2Bucket;

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  UPLOAD_PASSWORD: string;
  AUTH_SECRET: string;
  R2_PUBLIC_URL: string;
}

declare namespace App {
  interface Locals extends Runtime {
    isAuthenticated: boolean;
  }
}
