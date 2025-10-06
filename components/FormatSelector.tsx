import React from 'react';
import type { DownloadFormat } from '../types';

interface FormatSelectorProps {
  selectedFormat: DownloadFormat;
  onSelectFormat: (format: DownloadFormat) => void;
}

const FORMATS: DownloadFormat[] = ['jpg', 'png', 'webp'];

export const FormatSelector: React.FC<FormatSelectorProps> = ({ selectedFormat, onSelectFormat }) => {
  return (
    <div className="flex items-center bg-dark-border rounded-lg p-1">
      {FORMATS.map(format => (
        <button
          key={format}
          onClick={() => onSelectFormat(format)}
          className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none ${
            selectedFormat === format
              ? 'bg-brand-primary text-white'
              : 'text-medium-text hover:bg-gray-600'
          }`}
          aria-label={`Select ${format.toUpperCase()} format`}
          title={`Download as ${format.toUpperCase()}`}
        >
          {format.toUpperCase()}
        </button>
      ))}
    </div>
  );
};
