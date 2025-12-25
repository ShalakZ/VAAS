import PropTypes from 'prop-types';

const ICON_PATHS = {
  download: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
  upload: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
  trash: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  refresh: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  bolt: "M13 10V3L4 14h7v7l9-11h-7z",
  broom: "M15 3l-1 1m0 0l-2 2m2-2l2 2m-2-2L9 9m6-3l3 3m-9 9l-3-3m3 3l3-3m-3 3v-3m0 0H9m3 0l3-3",
  play: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  csv: "M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
};

/**
 * Action icons for buttons (small, inline)
 */
export function ActionIcon({ type, className = "w-4 h-4" }) {
  const path = ICON_PATHS[type];

  if (!path) {
    console.warn(`ActionIcon: Unknown icon type "${type}"`);
    return null;
  }

  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
    </svg>
  );
}

ActionIcon.propTypes = {
  type: PropTypes.oneOf(Object.keys(ICON_PATHS)).isRequired,
  className: PropTypes.string,
};
