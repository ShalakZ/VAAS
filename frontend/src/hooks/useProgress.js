import { useState, useEffect } from 'react';

/**
 * Progress simulation hook for upload operations
 * @param {boolean} isLoading - Whether the operation is in progress
 * @returns {[number, string]} - [progress, progressText]
 */
export function useProgress(isLoading) {
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');

  useEffect(() => {
    let interval;

    if (isLoading) {
      setProgress(0);
      setProgressText('Initiating Upload...');

      let step = 0;
      interval = setInterval(() => {
        step++;
        if (step === 1) { setProgress(20); setProgressText('Uploading File...'); }
        if (step === 5) { setProgress(45); setProgressText('Parsing Excel Data (Heavy I/O)...'); }
        if (step === 15) { setProgress(70); setProgressText('Analyzing Data...'); }
        if (step === 25) { setProgress(85); setProgressText('Applying Logic Rules...'); }
        if (step === 35) { setProgress(95); setProgressText('Finalizing...'); }
      }, 200);
    } else {
      setProgress(100);
    }

    return () => clearInterval(interval);
  }, [isLoading]);

  return [progress, progressText];
}

/**
 * Export progress simulation hook (asymptotic)
 * @param {string|null} exportingType - Type of export in progress
 * @returns {number} - Export progress percentage
 */
export function useExportProgress(exportingType) {
  const [exportProgress, setExportProgress] = useState(0);

  useEffect(() => {
    let interval;

    if (exportingType) {
      setExportProgress(0);
      interval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) return prev;
          const remaining = 90 - prev;
          const increment = Math.max(0.5, remaining * 0.1);
          return prev + increment;
        });
      }, 100);
    } else {
      setExportProgress(100);
    }

    return () => clearInterval(interval);
  }, [exportingType]);

  return [exportProgress, setExportProgress];
}
