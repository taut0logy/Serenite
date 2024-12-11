/**
 * An array of routes that are accessible to the  public 
 * These routes do not require authentication.
 * @type {string[]}
 */

export const publicRoutes = [
  "/",
  "/auth/new-verification",
];

/**
 * An array of routes that are used for authentication
 * These routes redirect logged in to /settings
 * @type {string[]}
 */

export const authRoutes = [
  "/auth/login",
  "/auth/register",
  "/auth/error",
];
/**
 * The prefix for API authentication route 
* Routes that start with this prefix are used for API authentication purposes
* @type {string}
 */

export const apiAuthPrefix = "/api/auth";

/**
 * The default redirect route after loginng in 
 * @type {string}
 */

export const DEFAULT_LOGIN_REDIRECT = "/settings";