/** Shared lazy-loader used by the dialog and intent-based preloading. */
export const loadDocumentViewer = () => import("./document-viewer");

export const preloadDocumentViewer = () => void loadDocumentViewer();
