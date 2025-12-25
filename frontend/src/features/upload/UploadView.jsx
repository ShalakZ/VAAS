import PropTypes from 'prop-types';
import { GearAnimation, ProgressBar } from '../../components/common';

export function UploadView({ loading, progress, progressText, onFileUpload }) {
  const handleDrop = (e) => {
    e.preventDefault();
    if (!loading && e.dataTransfer.files?.[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files?.[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="flex-1 flex items-start justify-center pt-8">
      <div
        className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-200/80 dark:border-gray-700/80"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900 border-b border-gray-200/80 dark:border-gray-700/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800 dark:text-white tracking-tight">Upload Report</h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Import vulnerability assessment data</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-6">
              <div className="flex justify-center mb-5">
                <GearAnimation />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white tracking-tight">
                Processing Report...
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{progressText}</p>
              <div className="max-w-sm mx-auto">
                <ProgressBar progress={progress} />
              </div>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-8 text-center
                         hover:border-sky-400 dark:hover:border-sky-500 hover:bg-sky-50/50 dark:hover:bg-sky-900/10
                         transition-all duration-300 cursor-pointer group"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-sky-100 to-blue-100 dark:from-sky-900/40 dark:to-blue-900/40
                              flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-base font-semibold mb-1.5 text-gray-800 dark:text-white tracking-tight">
                Drag & Drop Report Here
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                or click to browse Excel files (.xlsx)
              </p>
              <input
                type="file"
                className="hidden"
                id="fileInput"
                accept=".xlsx"
                onChange={handleFileSelect}
              />
              <label
                htmlFor="fileInput"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium
                           bg-gradient-to-r from-sky-500 to-blue-600 text-white
                           hover:from-sky-600 hover:to-blue-700
                           shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Select File
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50 border-t border-gray-200/80 dark:border-gray-700/60">
          <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500">
            <span>Supported: Excel (.xlsx)</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

UploadView.propTypes = {
  loading: PropTypes.bool.isRequired,
  progress: PropTypes.number.isRequired,
  progressText: PropTypes.string.isRequired,
  onFileUpload: PropTypes.func.isRequired,
};
