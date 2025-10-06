import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { AspectRatioSelector } from './components/AspectRatioSelector';
import { BatchView } from './components/BatchView';
import { Loader } from './components/Loader';
import { FormatSelector } from './components/FormatSelector';
import { expandImageCanvas } from './services/geminiService';
import type { AspectRatio, ImageJob, DownloadFormat } from './types';
import { ASPECT_RATIOS } from './types';

// Declaration for JSZip loaded from CDN
declare const JSZip: any;

const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 5000;

// FIX: Per coding guidelines, API key is handled via process.env and no UI should be rendered for key management.
// This also resolves the 'import.meta.env' TypeScript error.
const App: React.FC = () => {
  const [imageJobs, setImageJobs] = useState<ImageJob[]>([]);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>(ASPECT_RATIOS[0]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const isProcessingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>('png');
  
  // Use a ref to hold the latest image jobs for cleanup on unmount.
  // This prevents the cleanup function from having a stale reference to the jobs array.
  const imageJobsForCleanup = useRef<ImageJob[]>([]);
  useEffect(() => {
    imageJobsForCleanup.current = imageJobs;
  }, [imageJobs]);

  // Cleanup object URLs on unmount to prevent memory leaks.
  // The empty dependency array ensures this effect's cleanup runs only once.
  useEffect(() => {
    return () => {
      imageJobsForCleanup.current.forEach(job => {
        if (job.originalUrl) {
          URL.revokeObjectURL(job.originalUrl);
        }
      });
    };
  }, []);


  const handleFileSelect = async (files: FileList) => {
    const fileList = Array.from(files);

    const processFile = (file: File): Promise<ImageJob | { error: 'size' | 'dimension' | 'load' }> => {
      return new Promise((resolve) => {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          resolve({ error: 'size' });
          return;
        }

        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.src = objectUrl;

        img.onload = () => {
          if (img.naturalWidth > MAX_IMAGE_DIMENSION || img.naturalHeight > MAX_IMAGE_DIMENSION) {
            URL.revokeObjectURL(objectUrl); // Clean up memory
            resolve({ error: 'dimension' });
          } else {
            resolve({
              id: crypto.randomUUID(),
              file,
              originalUrl: objectUrl, // Keep URL for display
              generatedUrl: null,
              status: 'queued',
              error: null,
            });
          }
        };

        img.onerror = () => {
          URL.revokeObjectURL(objectUrl); // Clean up memory
          resolve({ error: 'load' });
        };
      });
    };

    const results = await Promise.all(fileList.map(processFile));

    const newJobs = results.filter((r): r is ImageJob => 'id' in r);
    const oversizedCount = results.filter(r => 'error' in r && r.error === 'size').length;
    const overdimensionedCount = results.filter(r => 'error' in r && r.error === 'dimension').length;
    const loadErrorCount = results.filter(r => 'error' in r && r.error === 'load').length;

    if (newJobs.length > 0) {
      setImageJobs(prevJobs => [...prevJobs, ...newJobs]);
    }
    
    const errorParts = [];
    if (oversizedCount > 0) {
      errorParts.push(`${oversizedCount} exceeded ${MAX_FILE_SIZE_MB}MB size limit`);
    }
    if (overdimensionedCount > 0) {
      errorParts.push(`${overdimensionedCount} exceeded ${MAX_IMAGE_DIMENSION}px dimension limit`);
    }
    if (loadErrorCount > 0) {
      errorParts.push(`${loadErrorCount} could not be read`);
    }

    if (errorParts.length > 0) {
      setError(`Some images were not added: ${errorParts.join(', ')}.`);
    } else {
      // Clear previous errors if this batch was successful
      setError(null);
    }
  };
  
  const handleReset = () => {
    imageJobs.forEach(job => {
        if(job.originalUrl) URL.revokeObjectURL(job.originalUrl);
        // generatedUrl is a data URL, so it does not need to be revoked.
    });
    setImageJobs([]);
    setError(null);
    setSelectedAspectRatio(ASPECT_RATIOS[0]);
    setIsProcessing(false);
    isProcessingRef.current = false;
  };

  const handleRemoveJob = useCallback((jobId: string) => {
    setImageJobs(prevJobs => {
        const jobToRemove = prevJobs.find(job => job.id === jobId);
        if (jobToRemove?.originalUrl) {
            URL.revokeObjectURL(jobToRemove.originalUrl);
        }
        return prevJobs.filter(job => job.id !== jobId);
    });
  }, []);

  const processJob = useCallback(async (job: ImageJob, aspectRatio: AspectRatio): Promise<string> => {
    const img = new Image();
    img.src = job.originalUrl;
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not load the image file.'));
    });

    const originalWidth = img.naturalWidth;
    const originalHeight = img.naturalHeight;
    
    const ratioParts = aspectRatio.split(':').map(val => Number(val.trim()));
    if (ratioParts.length !== 2 || ratioParts.some(isNaN) || ratioParts.some(r => r <= 0)) {
        throw new Error(`Invalid aspect ratio: "${aspectRatio}". Please use positive numbers.`);
    }
    
    const [targetW_ratio, targetH_ratio] = ratioParts;
    const targetRatio = targetW_ratio / targetH_ratio;
    const originalRatio = originalWidth / originalHeight;

    if (Math.abs(targetRatio - originalRatio) < 0.01) {
      throw new Error("Image already has the selected aspect ratio.");
    }
    
    let newWidth: number, newHeight: number;

    if (targetRatio > originalRatio) {
      newHeight = originalHeight;
      newWidth = Math.round(newHeight * targetRatio);
    } else {
      newWidth = originalWidth;
      newHeight = Math.round(newWidth / targetRatio);
    }

    if (newWidth > MAX_IMAGE_DIMENSION || newHeight > MAX_IMAGE_DIMENSION) {
        throw new Error(`Expanded image (${newWidth}x${newHeight}) would exceed the ${MAX_IMAGE_DIMENSION}px limit.`);
    }

    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Could not create canvas context to process image.');
    }
    
    // Fill the background with a solid mask color (magenta) for the AI to replace.
    // This is more reliable than using transparency.
    ctx.fillStyle = '#FF00FF'; // Pure magenta
    ctx.fillRect(0, 0, newWidth, newHeight);
    
    const offsetX = (newWidth - originalWidth) / 2;
    const offsetY = (newHeight - originalHeight) / 2;
    ctx.drawImage(img, offsetX, offsetY, originalWidth, originalHeight);

    const dataUrl = canvas.toDataURL('image/png');
    const [, base64Part] = dataUrl.split(',');
    const mimeType = 'image/png';
    
    const prompt = `You are an expert photo editor. Your task is to seamlessly expand this image by replacing the solid magenta-colored areas (#FF00FF).
Instructions:
1. Analyze the existing image content, including the subject, background, lighting, and shadows.
2. Extend the background naturally and realistically into the magenta areas. The new areas must blend perfectly with the original image, showing no visible seams or artifacts.
3. Precisely match the color palette, textures, and grain of the original photo.
4. Continue any existing gradients, patterns, or environmental elements into the new areas.
5. Ensure the lighting and shadows in the expanded areas are consistent with the original lighting source.
6. Crucially, avoid filling the new areas with a flat, solid color. Even if the original background appears plain, introduce subtle texture, grain, and lighting variations consistent with a real photograph to ensure a photorealistic result.
7. The final output must be a single, cohesive, photorealistic image containing no magenta.`;
    
    // Get the low-resolution, expanded image from the AI
    const generatedLowResBase64 = await expandImageCanvas(base64Part, mimeType, prompt);

    // Now, composite the high-resolution original onto the upscaled AI result
    const generatedImg = new Image();
    const generatedUrl = `data:image/png;base64,${generatedLowResBase64}`;

    await new Promise<void>((resolve, reject) => {
        generatedImg.onload = () => resolve();
        generatedImg.onerror = () => reject(new Error('Could not load the generated image from AI.'));
        generatedImg.src = generatedUrl;
    });

    // Draw the upscaled AI result as the full background
    ctx.clearRect(0, 0, newWidth, newHeight);
    ctx.drawImage(generatedImg, 0, 0, newWidth, newHeight);

    // Draw the original, crisp high-resolution image on top
    ctx.drawImage(img, offsetX, offsetY, originalWidth, originalHeight);

    // Return the final, high-resolution composite image
    return canvas.toDataURL('image/png');
  }, []);

  const handleBatchExpand = useCallback(async () => {
    if (isProcessingRef.current) return;

    const jobsToProcess = imageJobs.filter(job => job.status === 'queued' || job.status === 'error');
    if (jobsToProcess.length === 0) {
      return;
    }
    
    isProcessingRef.current = true;
    setIsProcessing(true);
    setError(null);

    for (const job of jobsToProcess) {
      // To avoid potential API rate-limiting issues, add a delay between requests in a batch.
      // This makes the batch processing more reliable.
      if (job !== jobsToProcess[0]) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setImageJobs(prev => prev.map(j => 
        j.id === job.id ? { ...j, status: 'processing', error: null } : j
      ));

      try {
        const generatedImageUrl = await processJob(job, selectedAspectRatio);
        setImageJobs(prev => prev.map(j => 
          j.id === job.id ? { ...j, status: 'done', generatedUrl: generatedImageUrl } : j
        ));
      } catch (err) {
        console.error(`Error processing job ${job.id}:`, err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setImageJobs(prev => prev.map(j => 
          j.id === job.id ? { ...j, status: 'error', error: errorMessage } : j
        ));
      }
    }
    
    isProcessingRef.current = false;
    setIsProcessing(false);
  }, [imageJobs, selectedAspectRatio, processJob]);
  
  const handleExpandSingleJob = useCallback(async (jobId: string) => {
    if (isProcessingRef.current) return;
    
    const job = imageJobs.find(j => j.id === jobId);
    if (!job) return;

    isProcessingRef.current = true;
    setIsProcessing(true);
    setError(null);

    setImageJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'processing', error: null } : j));
    
    try {
      const generatedImageUrl = await processJob(job, selectedAspectRatio);
      setImageJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'done', generatedUrl: generatedImageUrl } : j));

    } catch (err) {
      console.error(`Error processing job ${job.id}:`, err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setImageJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'error', error: errorMessage } : j));
    }
    
    isProcessingRef.current = false;
    setIsProcessing(false);
  }, [imageJobs, selectedAspectRatio, processJob]);

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

  const handleDownloadAll = async () => {
    const zip = new JSZip();
    const successfulJobs = imageJobs.filter(job => job.status === 'done' && job.generatedUrl);

    for (let i = 0; i < successfulJobs.length; i++) {
        const job = successfulJobs[i];
        if (job.generatedUrl) {
            try {
                const blob = await convertDataURLToBlob(job.generatedUrl, downloadFormat);
                const originalName = job.file.name.substring(0, job.file.name.lastIndexOf('.')) || `image-${i}`;
                const safeName = originalName.replace(/[^a-z0-9_.-]/gi, '_');
                zip.file(`${safeName}-expanded.${downloadFormat}`, blob);
            } catch (e) {
                console.error(`Failed to convert image ${job.file.name} to ${downloadFormat}`, e);
            }
        }
    }

    if (Object.keys(zip.files).length > 0) {
        zip.generateAsync({ type: 'blob' }).then(content => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = 'expanded-images.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        });
    } else {
        setError("No images were successfully converted to download.");
    }
  };

  const hasSuccessfulJobs = imageJobs.some(job => job.status === 'done');

  return (
    <div className="min-h-screen bg-dark-bg text-light-text font-sans antialiased">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto bg-dark-card rounded-lg shadow-xl p-6 md:p-8 border border-dark-border">
          {imageJobs.length === 0 ? (
             <div>
                {error && (
                  <div className="my-4 p-3 bg-red-900/50 text-red-300 border border-red-700 rounded-md text-center">
                    <p>{error}</p>
                  </div>
                )}
                <FileUpload onFileSelect={handleFileSelect} />
                 <div className="text-center mt-6 p-3 bg-blue-900/50 text-blue-300 border border-blue-700 rounded-md text-sm">
                    <p><strong>Info:</strong> Max dimension is {MAX_IMAGE_DIMENSION}px, and max file size is {MAX_FILE_SIZE_MB}MB.</p>
                </div>
            </div>
          ) : (
            <div>
              {error && (
                <div className="my-4 p-3 bg-red-900/50 text-red-300 border border-red-700 rounded-md text-center">
                  <p>{error}</p>
                </div>
              )}
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-center mb-4 text-light-text">Choose Target Aspect Ratio</h3>
                  <AspectRatioSelector
                    selectedRatio={selectedAspectRatio}
                    onSelectRatio={setSelectedAspectRatio}
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 pt-6 border-t border-dark-border">
                  <button
                    onClick={handleBatchExpand}
                    disabled={isProcessing}
                    className="w-full sm:w-auto flex justify-center items-center px-8 py-3 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-secondary transition-colors duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:ring-offset-2 focus:ring-offset-dark-card"
                  >
                    {isProcessing ? <Loader /> : 'Expand All'}
                  </button>
                  <div className="flex items-center gap-2">
                      <button
                          onClick={handleDownloadAll}
                          disabled={!hasSuccessfulJobs || isProcessing}
                          className="flex justify-center items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
                      >
                          Download .zip
                      </button>
                      <FormatSelector selectedFormat={downloadFormat} onSelectFormat={setDownloadFormat} />
                  </div>
                  <button
                    onClick={handleReset}
                    className="w-full sm:w-auto px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors duration-300"
                  >
                    Start Over
                  </button>
                </div>

                 <div className="text-center p-3 bg-blue-900/50 text-blue-300 border border-blue-700 rounded-md text-sm">
                    <p><strong>Info:</strong> Max dimension is {MAX_IMAGE_DIMENSION}px, and max file size is {MAX_FILE_SIZE_MB}MB.</p>
                </div>
              </div>
              
              <div className="mt-8">
                 <BatchView 
                    jobs={imageJobs} 
                    downloadFormat={downloadFormat}
                    onExpandJob={handleExpandSingleJob}
                    onRemoveJob={handleRemoveJob}
                    isProcessing={isProcessing}
                />
              </div>

              <div className="mt-8 pt-8 border-t border-dark-border">
                <FileUpload onFileSelect={handleFileSelect} />
              </div>
            </div>
          )}
        </div>
        <footer className="text-center mt-8 text-medium-text">
            <p>App by: Apurbo Abdul Latif, DXB24LIVE | <a href="https://www.dxb24.live" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">www.dxb24.live</a></p>
        </footer>
      </main>
    </div>
  );
};

export default App;