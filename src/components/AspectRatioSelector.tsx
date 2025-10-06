import React from 'react';
import type { AspectRatio } from '../types';
import { ASPECT_RATIOS } from '../types';

interface AspectRatioSelectorProps {
  selectedRatio: AspectRatio;
  onSelectRatio: (ratio: AspectRatio) => void;
}

export const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({ selectedRatio, onSelectRatio }) => {
  return (
    <div className="flex justify-center items-center gap-2 flex-wrap">
      {ASPECT_RATIOS.map((ratio) => (
        <button
          key={ratio}
          onClick={() => onSelectRatio(ratio)}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-card ${
            selectedRatio === ratio
              ? 'bg-brand-primary text-white scale-105 shadow-lg'
              : 'bg-dark-border text-medium-text hover:bg-gray-600'
          }`}
        >
          {ratio}
        </button>
      ))}
    </div>
  );
};