import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="bg-dark-card/50 backdrop-blur-sm border-b border-dark-border sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4 flex items-center justify-center">
         <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 1v4m0 0h-4m4 0l-5-5" />
        </svg>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-secondary">
            AI Photo Expander
          </h1>
          <p className="text-center text-medium-text mt-1 text-sm md:text-base">Expand your images with the power of generative AI</p>
        </div>
      </div>
    </header>
  );
};
