import React, { useState, useEffect } from 'react';
import type { AspectRatio } from '../types';
import { ASPECT_RATIOS } from '../types';

interface AspectRatioSelectorProps {
  selectedRatio: AspectRatio;
  onSelectRatio: (ratio: AspectRatio) => void;
}

export const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({ selectedRatio, onSelectRatio }) => {
  const [customW, setCustomW] = useState('');
  const [customH, setCustomH] = useState('');

  const isCustomRatioSelected = !ASPECT_RATIOS.includes(selectedRatio);

  useEffect(() => {
    // If the selected ratio from parent is custom, update local inputs
    if (isCustomRatioSelected && selectedRatio.includes(':')) {
      const [w, h] = selectedRatio.split(':');
      if (w !== customW) setCustomW(w);
      if (h !== customH) setCustomH(h);
    }
    // If a preset is selected, clear local inputs
    else if (!isCustomRatioSelected) {
        if (customW) setCustomW('');
        if (customH) setCustomH('');
    }
  }, [selectedRatio, customW, customH]);

  const handleCustomWChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newW = e.target.value;
    setCustomW(newW);
    if (Number(newW) > 0 && Number(customH) > 0) {
      onSelectRatio(`${newW}:${customH}`);
    }
  };

  const handleCustomHChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newH = e.target.value;
    setCustomH(newH);
    if (Number(customW) > 0 && Number(newH) > 0) {
      onSelectRatio(`${customW}:${newH}`);
    }
  };

  return (
    <div className="flex justify-center items-center gap-2 flex-wrap">
      {ASPECT_RATIOS.map((ratio) => (
        <button
          key={ratio}
          onClick={() => onSelectRatio(ratio)}
          className={`px-3 py-2 text-sm font-bold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-card ${
            selectedRatio === ratio
              ? 'bg-brand-primary text-white scale-105 shadow-lg'
              : 'bg-dark-border text-medium-text hover:bg-gray-600'
          }`}
        >
          {ratio}
        </button>
      ))}
      <div className="relative">
          <div className={`flex items-center justify-center gap-1 p-1 rounded-lg border-2 transition-colors ${isCustomRatioSelected ? 'border-brand-primary' : 'border-dark-border'}`}>
              <input 
                  type="number"
                  min="1"
                  value={customW}
                  onChange={handleCustomWChange}
                  placeholder="W"
                  className="w-14 p-1 text-center bg-dark-bg border border-dark-border rounded-md text-light-text focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                  aria-label="Custom aspect ratio width"
              />
              <span className="text-lg font-bold text-medium-text">:</span>
              <input 
                  type="number"
                  min="1"
                  value={customH}
                  onChange={handleCustomHChange}
                  placeholder="H"
                  className="w-14 p-1 text-center bg-dark-bg border border-dark-border rounded-md text-light-text focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                  aria-label="Custom aspect ratio height"
              />
          </div>
          <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-xs text-medium-text">Custom</span>
      </div>
    </div>
  );
};
