
import {
  getMediaList,
  getMediaById,
  createMedia,
  updateMedia,
  deleteMedia,
  type MediaInput
} from "./mediaservice.ts";

const TYPE = "novel" as const;

export const getNovels = (userId: number) =>
  getMediaList(userId, TYPE);

export const getNovel = (userId: number, id: number) =>
  getMediaById(userId, id, TYPE);

export const createNovel = (userId: number, input: MediaInput) =>
  createMedia(userId, TYPE, input);

export const updateNovel = (
  userId: number,
  id: number,
  input: MediaInput
) => updateMedia(userId, id, TYPE, input);

export const deleteNovel = (userId: number, id: number) =>
  deleteMedia(userId, id, TYPE);
