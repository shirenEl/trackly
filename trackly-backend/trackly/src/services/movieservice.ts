
import {
  getMediaList,
  getMediaById,
  createMedia,
  updateMedia,
  deleteMedia,
  type MediaInput
} from "./mediaservice.ts";

const TYPE = "movie" as const;

export const getMovies = (userId: number) =>
  getMediaList(userId, TYPE);

export const getMovie = (userId: number, id: number) =>
  getMediaById(userId, id, TYPE);

export const createMovie = (userId: number, input: MediaInput) =>
  createMedia(userId, TYPE, input);

export const updateMovie = (
  userId: number,
  id: number,
  input: MediaInput
) => updateMedia(userId, id, TYPE, input);

export const deleteMovie = (userId: number, id: number) =>
  deleteMedia(userId, id, TYPE);
