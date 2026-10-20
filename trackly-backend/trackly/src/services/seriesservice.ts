import {
  getMediaList,
  getMediaById,
  createMedia,
  updateMedia,
  deleteMedia,
  type MediaInput,
} from "./mediaservice";

const TYPE = "series" as const;

export const getSeriesList = (userId: number) =>
  getMediaList(userId, TYPE);

export const getSeriesById = (userId: number, id: number) =>
  getMediaById(userId, id, TYPE);

export const createSeries = (userId: number, input: MediaInput) =>
  createMedia(userId, TYPE, input);

export const updateSeries = (
  userId: number,
  id: number,
  input: MediaInput
) => updateMedia(userId, id, TYPE, input);

export const deleteSeries = (userId: number, id: number) =>
  deleteMedia(userId, id, TYPE);
