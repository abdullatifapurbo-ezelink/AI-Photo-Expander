
import React from 'react';
import type { ImageJob, DownloadFormat } from '../types';
import { ImageJobCard } from './ImageJobCard';

interface BatchViewProps {
  jobs: ImageJob[];
  downloadFormat: DownloadFormat;
  onExpandJob: (jobId: string) => void;
  onRemoveJob: (jobId: string) => void;
  isProcessing: boolean;
}

export const BatchView: React.FC<BatchViewProps> = ({ jobs, downloadFormat, onExpandJob, onRemoveJob, isProcessing }) => {
  if (jobs.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {jobs.map(job => (
        <ImageJobCard 
            key={job.id} 
            job={job} 
            downloadFormat={downloadFormat} 
            onExpand={onExpandJob} 
            onRemove={onRemoveJob}
            isProcessing={isProcessing} 
        />
      ))}
    </div>
  );
};
