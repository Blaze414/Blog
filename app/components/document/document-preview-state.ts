export type DocumentPreviewStatus = "loading" | "ready" | "error";

export type DocumentPreviewState = Readonly<{
  status: DocumentPreviewStatus;
  attempt: number;
}>;

export type DocumentPreviewAction =
  | Readonly<{ type: "loading" }>
  | Readonly<{ type: "ready" }>
  | Readonly<{ type: "error" }>
  | Readonly<{ type: "retry" }>;

export const INITIAL_DOCUMENT_PREVIEW_STATE: DocumentPreviewState = Object.freeze({
  status: "loading",
  attempt: 0,
});

/** Pure state transitions prevent renderer callbacks from mutating shared UI state. */
export function reduceDocumentPreview(
  state: DocumentPreviewState,
  action: DocumentPreviewAction,
): DocumentPreviewState {
  if (action.type === "retry") {
    return Object.freeze({ status: "loading", attempt: state.attempt + 1 });
  }
  if (state.status === action.type) return state;
  return Object.freeze({ ...state, status: action.type });
}
