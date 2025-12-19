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
    <div
      className="max-w-xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {loading ? (
        <div className="w-full">
          <div className="flex justify-center mb-4">
            <GearAnimation />
          </div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
            Processing Report...
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{progressText}</p>
          <ProgressBar progress={progress} />
        </div>
      ) : (
        <>
          <div className="text-6xl text-gray-300 dark:text-gray-600 mb-4">📂</div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
            Drag & Drop Report Here
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            or click to browse Excel files
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
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 cursor-pointer transition shadow-lg"
          >
            Select File
          </label>
        </>
      )}
    </div>
  );
}
