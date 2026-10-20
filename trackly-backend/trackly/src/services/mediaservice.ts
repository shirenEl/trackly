
import { database } from "../config/database.js";

export type MediaType = "movie" | "series" | "novel";

export interface MediaInput {
  title: string;
  description?: string | null;
  cover_url?: string | null;
  total_duration?: number | null;
  total_pages?: number | null;
}

// Melihat semua media berdasarkan jenisnya
export async function getMediaList(
  userId: number,
  type: MediaType
) {
  const [rows] = await database.execute(
    `SELECT
       id,
       title,
       type,
       description,
       cover_url,
       total_duration,
       total_pages,
       created_at,
       updated_at
     FROM media
     WHERE user_id = ? AND type = ?
     ORDER BY id DESC`,
    [userId, type]
  );

  return rows;
}

// Melihat detail satu media
export async function getMediaById(
  userId: number,
  mediaId: number,
  type: MediaType
) {
  const [rows] = await database.execute(
    `SELECT
       id,
       title,
       type,
       description,
       cover_url,
       total_duration,
       total_pages,
       created_at,
       updated_at
     FROM media
     WHERE id = ? AND user_id = ? AND type = ?`,
    [mediaId, userId, type]
  );

  const items = rows as Record<string, unknown>[];

  return items.length > 0 ? items[0] : null;
}

// Menambahkan media baru
export async function createMedia(
  userId: number,
  type: MediaType,
  input: MediaInput
) {
  const title = input.title.trim();

  if (!title) {
    throw new Error("TITLE_REQUIRED");
  }

  const totalDuration =
    type === "novel" ? null : input.total_duration ?? null;

  const totalPages =
    type === "novel" ? input.total_pages ?? null : null;

  const [result] = await database.execute(
    `INSERT INTO media (
       user_id,
       title,
       type,
       description,
       cover_url,
       total_duration,
       total_pages
     )
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      title,
      type,
      input.description ?? null,
      input.cover_url ?? null,
      totalDuration,
      totalPages
    ]
  );

  return {
    id: (result as { insertId: number }).insertId,
    user_id: userId,
    title,
    type,
    description: input.description ?? null,
    cover_url: input.cover_url ?? null,
    total_duration: totalDuration,
    total_pages: totalPages
  };
}

// Memperbarui data media
export async function updateMedia(
  userId: number,
  mediaId: number,
  type: MediaType,
  input: MediaInput
) {
  const title = input.title.trim();

  if (!title) {
    throw new Error("TITLE_REQUIRED");
  }

  const totalDuration =
    type === "novel" ? null : input.total_duration ?? null;

  const totalPages =
    type === "novel" ? input.total_pages ?? null : null;

  const [result] = await database.execute(
    `UPDATE media
     SET
       title = ?,
       description = ?,
       cover_url = ?,
       total_duration = ?,
       total_pages = ?
     WHERE id = ? AND user_id = ? AND type = ?`,
    [
      title,
      input.description ?? null,
      input.cover_url ?? null,
      totalDuration,
      totalPages,
      mediaId,
      userId,
      type
    ]
  );

  return (result as { affectedRows: number }).affectedRows > 0;
}

// Menghapus media
export async function deleteMedia(
  userId: number,
  mediaId: number,
  type: MediaType
) {
  const [result] = await database.execute(
    `DELETE FROM media
     WHERE id = ? AND user_id = ? AND type = ?`,
    [mediaId, userId, type]
  );

  return (result as { affectedRows: number }).affectedRows > 0;
}
