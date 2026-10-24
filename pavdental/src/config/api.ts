/**
 * Centralized API configuration.
 * Single source of truth for the backend API base URL across the mobile app.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

/** Full URL for an API path, for links opened outside the app (e.g. a PDF). */
export const apiUrl = (path: string) => `${API_URL}${path}`;
