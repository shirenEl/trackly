
import { Request, Response, NextFunction } from "express";
import { database } from "../config/database.js";
import type { AuthRequest } from "../middleware/authMiddleware.js";

// Melihat semua media di library milik pengguna
export async function getLibrary(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
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
      [req.user!.id]
    );

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

// Menambahkan media ke library
export async function addToLibrary(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const mediaId = Number(req.body.media_id);

    if (!Number.isInteger(mediaId) || mediaId <= 0) {
      return res.status(400).json({
        success: false,
        message: "media_id harus berupa ID yang valid.",
      });
    }

    const [mediaRows] = await database.execute(
      "SELECT id FROM media WHERE id = ? AND user_id = ?",
      [mediaId, req.user!.id]
    );

    if ((mediaRows as unknown[]).length === 0) {
      return res.status(404).json({
        success: false,
        message: "Media tidak ditemukan.",
      });
    }

    await database.execute(
      `INSERT INTO libraries (user_id, media_id, status, progress)
       VALUES (?, ?, 'planned', 0)`,
      [req.user!.id, mediaId]
    );

    return res.status(201).json({
      success: true,
      message: "Media berhasil ditambahkan ke library.",
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ER_DUP_ENTRY"
    ) {
      return res.status(409).json({
        success: false,
        message: "Media sudah ada di library.",
      });
    }

    next(error);
  }
}

// Memperbarui status dan progres
export async function updateLibrary(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const libraryId = Number(req.params.id);
    const { status, progress } = req.body;

    const allowedStatuses = [
      "planned",
      "in_progress",
      "completed",
    ];

    if (!Number.isInteger(libraryId) || libraryId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID library tidak valid.",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status harus planned, in_progress, atau completed.",
      });
    }

    if (
      progress !== undefined &&
      (!Number.isInteger(progress) || progress < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Progres harus berupa bilangan bulat positif atau nol.",
      });
    }

    const [rows] = await database.execute(
      `SELECT l.progress, m.total_duration, m.total_pages, m.type
       FROM libraries l
       JOIN media m ON m.id = l.media_id
       WHERE l.id = ? AND l.user_id = ?`,
      [libraryId, req.user!.id]
    );

    const items = rows as {
      progress: number;
      total_duration: number | null;
      total_pages: number | null;
      type: string;
    }[];

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Data library tidak ditemukan.",
      });
    }

    const item = items[0];
    const newProgress =
      progress === undefined ? item.progress : progress;

    const maximum =
      item.type === "novel"
        ? item.total_pages
        : item.total_duration;

    if (maximum !== null && newProgress > maximum) {
      return res.status(400).json({
        success: false,
        message: "Progres tidak boleh melebihi total media.",
      });
    }

    await database.execute(
      `UPDATE libraries
       SET status = ?, progress = ?
       WHERE id = ? AND user_id = ?`,
      [status, newProgress, libraryId, req.user!.id]
    );

    return res.json({
      success: true,
      message: "Progres library berhasil diperbarui.",
    });
  } catch (error) {
    next(error);
  }
}

// Menghapus media dari library
export async function deleteFromLibrary(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const libraryId = Number(req.params.id);

    if (!Number.isInteger(libraryId) || libraryId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID library tidak valid.",
      });
    }

    const [result] = await database.execute(
      "DELETE FROM libraries WHERE id = ? AND user_id = ?",
      [libraryId, req.user!.id]
    );

    if ((result as { affectedRows: number }).affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Data library tidak ditemukan.",
      });
    }

    return res.json({
      success: true,
      message: "Media berhasil dihapus dari library.",
    });
  } catch (error) {
    next(error);
  }
}
