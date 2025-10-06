import React from 'react';
import type { DownloadFormat } from '../types';

interface DownloadButtonProps {
  imageUrl: string;
  format: DownloadFormat;
  fileName: string;
}

const convertDataURLToBlob = (dataUrl: string, format: DownloadFormat): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const mimeType = `image/${format === 'jpg' ? 'jpeg' : format}`;
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        return reject(new Error('Canvas toBlob failed'));
                    }
                    resolve(blob);
                },
                mimeType,
                0.95 // quality for jpeg/webp
            );
        };
        img.onerror = () => {
            reject(new Error('Image could not be loaded from data URL'));
        };
        img.src = dataUrl;
    });
};


export const DownloadButton: React.FC<DownloadButtonProps> = ({ imageUrl, format, fileName }) => {
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click events
    try {
        const blob = await convertDataURLToBlob(imageUrl, format);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const baseName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
        const safeName = baseName.replace(/[^a-z0-9_.-]/gi, '_');
        link.download = `${safeName}-expanded.${format}`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Failed to download image:", error);
        alert(`Failed to convert and download image. Please try again or select a different format.`);
    }
  };

  return (
    <button
      onClick={handleDownload}
      className="w-full flex justify-center items-center px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-md hover:bg-green-700 transition-colors duration-300"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
      Download .{format.toUpperCase()}
    </button>
  );
};