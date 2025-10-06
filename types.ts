export type AspectRatio = string;

export const ASPECT_RATIOS: AspectRatio[] = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9'];

export type JobStatus = 'queued' | 'processing' | 'done' | 'error';

export interface ImageJob {
  id: string;
  file: File;
  originalUrl: string;
  generatedUrl: string | null;
  status: JobStatus;
  error: string | null;
}

export type DownloadFormat = 'jpg' | 'png' | 'webp';