
import { database } from "../config/database.js";

export type LibraryStatus = "planned" | "in_progress" | "completed";

export async function getUserLibrary(userId: number) {
  const [rows] = await database.execute(
    `SELECT
       l.id AS library_id,
       l.status,
       l.progress,
       l.created_at,
       m.id AS media_id,
       m.title,
       m.type,
       m.description,
       m.cover_url,
       m.total_duration,
       m.total_pages
     FROM libraries l
     JOIN media m ON m.id = l.media_id
     WHERE l.user_id = ?
     ORDER BY l.id DESC`,
    [userId]
  );

  return rows;
}

export async function addLibraryItem(
  userId: number,
  mediaId: number
) {
  const [mediaRows] = await database.execute(
    "SELECT id FROM media WHERE id = ? AND user_id = ?",
    [mediaId, userId]
  );

  if ((mediaRows as unknown[]).length === 0) {
    throw new Error("MEDIA_NOT_FOUND");
  }

  await database.execute(
    `INSERT INTO libraries (user_id, media_id, status, progress)
     VALUES (?, ?, 'planned', 0)`,
    [userId, mediaId]
  );
}

export async function updateLibraryItem(
  userId: number,
  libraryId: number,
  status: LibraryStatus,
  progress?: number
) {
  const [rows] = await database.execute(
    `SELECT l.progress, m.total_duration, m.total_pages, m.type
     FROM libraries l
     JOIN media m ON m.id = l.media_id
     WHERE l.id = ? AND l.user_id = ?`,
    [libraryId, userId]
  );

  const items = rows as {
    progress: number;
    total_duration: number | null;
    total_pages: number | null;
    type: string;
  }[];

  if (items.length === 0) {
    throw new Error("LIBRARY_NOT_FOUND");
  }

  const item = items[0];
  const newProgress = progress ?? item.progress;
  const maximum = item.type === "novel"
    ? item.total_pages
    : item.total_duration;

  if (maximum !== null && newProgress > maximum) {
    throw new Error("PROGRESS_EXCEEDS_MAXIMUM");
  }

  await database.execute(
    `UPDATE libraries
     SET status = ?, progress = ?
     WHERE id = ? AND user_id = ?`,
    [status, newProgress, libraryId, userId]
  );
}

export async function removeLibraryItem(
  userId: number,
  libraryId: number
) {
  const [result] = await database.execute(
    "DELETE FROM libraries WHERE id = ? AND user_id = ?",
    [libraryId, userId]
  );

  return (result as { affectedRows: number }).affectedRows > 0;
}
