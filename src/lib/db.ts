type D1Database = import('@cloudflare/workers-types').D1Database;

export interface ImageRow {
  id: string;
  filename: string;
  r2_key: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  uploaded_at: string;
}

export async function insertImage(db: D1Database, row: ImageRow): Promise<void> {
  await db
    .prepare(
      `INSERT INTO images (id, filename, r2_key, mime_type, size_bytes, width, height, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(row.id, row.filename, row.r2_key, row.mime_type, row.size_bytes, row.width, row.height, row.uploaded_at)
    .run();
}

export async function listImages(db: D1Database, page = 1, pageSize = 20): Promise<ImageRow[]> {
  const offset = (page - 1) * pageSize;
  const result = await db
    .prepare(`SELECT * FROM images ORDER BY uploaded_at DESC LIMIT ? OFFSET ?`)
    .bind(pageSize, offset)
    .all<ImageRow>();
  return result.results;
}

export async function getImage(db: D1Database, id: string): Promise<ImageRow | null> {
  const result = await db
    .prepare(`SELECT * FROM images WHERE id = ?`)
    .bind(id)
    .first<ImageRow>();
  return result ?? null;
}

export async function deleteImage(db: D1Database, id: string): Promise<void> {
  await db.prepare(`DELETE FROM images WHERE id = ?`).bind(id).run();
}
