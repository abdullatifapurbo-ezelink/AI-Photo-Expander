import React, { useState, useEffect } from 'react';
import type { ImageJob } from '../types';

interface ImagePreviewProps {
  job: Pick<ImageJob, 'originalUrl' | 'generatedUrl' | 'status' | 'file'>;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ job }) => {
  const { originalUrl, generatedUrl, status, file } = job;
  const isDone = status === 'done' && generatedUrl;
  const [displayUrl, setDisplayUrl] = useState(originalUrl);

  useEffect(() => {
    setDisplayUrl(generatedUrl ?? originalUrl);
  }, [generatedUrl, originalUrl]);

  const handleMouseEnter = () => {
    if (isDone) {
      setDisplayUrl(originalUrl);
    }
  };

  const handleMouseLeave = () => {
    if (isDone) {
      setDisplayUrl(generatedUrl!); // 'isDone' ensures this is not null
    }
  };

  return (
    <div
      className="aspect-square w-full flex items-center justify-center bg-black relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <img src={displayUrl} alt={file.name} className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" />
      {status === 'processing' && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
      {isDone && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          Hover to see original
        </div>
      )}
    </div>
  );
};