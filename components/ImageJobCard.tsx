
import React from 'react';
import type { ImageJob, DownloadFormat } from '../types';
import { DownloadButton } from './DownloadButton';
import { ImagePreview } from './ImagePreview';

const getStatusPill = (status: string, error: string | null) => {
    let bgColor = 'bg-gray-500';
    let textColor = 'text-gray-100';
    let text = status.charAt(0).toUpperCase() + status.slice(1);

    switch(status) {
        case 'processing':
            bgColor = 'bg-blue-500';
            break;
        case 'done':
            bgColor = 'bg-green-600';
            break;
        case 'error':
            bgColor = 'bg-red-600';
            text = 'Error';
            break;
        case 'queued':
            bgColor = 'bg-yellow-500';
            break;
    }

    return (
        <div title={error ?? text} className={`absolute top-2 right-2 px-2 py-1 text-xs font-bold rounded-full ${bgColor} ${textColor} z-10`}>
            {text}
        </div>
    );
}

interface ImageJobCardProps {
    job: ImageJob;
    downloadFormat: DownloadFormat;
    onExpand: (jobId: string) => void;
    onRemove: (jobId: string) => void;
    isProcessing: boolean;
}

export const ImageJobCard: React.FC<ImageJobCardProps> = ({ job, downloadFormat, onExpand, onRemove, isProcessing }) => {
    const isDone = job.status === 'done' && job.generatedUrl;
    
    return (
        <div 
          className="relative border-2 border-dark-border bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-all duration-300 group"
        >
            {job.status !== 'processing' && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(job.id);
                    }}
                    className="absolute top-2 left-2 z-20 p-1 bg-black/50 rounded-full text-light-text hover:bg-red-600 hover:text-white transition-colors duration-200"
                    title="Remove image"
                    aria-label="Remove image"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
            <ImagePreview job={job} />
            {getStatusPill(job.status, job.error)}
            <div className="p-2 bg-dark-card/50">
                <p className="text-xs text-medium-text truncate" title={job.file.name}>{job.file.name}</p>
                
                {(job.status === 'queued' || job.status === 'error') && (
                   <div className="mt-2">
                        <button
                            onClick={() => onExpand(job.id)}
                            disabled={isProcessing}
                            className="w-full flex justify-center items-center px-3 py-2 bg-brand-primary text-white text-xs font-semibold rounded-md hover:bg-brand-secondary transition-colors duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
                            aria-label={`Expand ${job.file.name}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 1v4m0 0h-4m4 0l-5-5" />
                            </svg>
                            Expand
                        </button>
                   </div>
                )}

                {isDone && job.generatedUrl && (
                   <div className="mt-2">
                     <DownloadButton imageUrl={job.generatedUrl} format={downloadFormat} fileName={job.file.name} />
                   </div>
                )}
                 {job.status === 'error' && job.error && (
                   <div className="mt-1">
                     <p className="text-xs text-red-400 truncate" title={job.error}>Error: {job.error}</p>
                   </div>
                )}
            </div>
        </div>
    );
};