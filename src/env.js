export const env = {
  BACKEND_V2_GET_URL: import.meta.env.VITE_APP_BACKEND_V2_GET_URL || "",
  BACKEND_V2_POST_URL: import.meta.env.VITE_APP_BACKEND_V2_POST_URL || "",
  LIBRARY_URL: import.meta.env.VITE_APP_LIBRARY_URL || "https://libraries.excalidraw.com",
  LIBRARY_BACKEND: import.meta.env.VITE_APP_LIBRARY_BACKEND || "https://us-central1-excalidraw-room-persistence.cloudfunctions.net/libraries"
};
