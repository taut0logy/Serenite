

// Reads the session, so it cannot be prerendered. Without this the page
// builds into a static error state instead of failing loudly.
export const dynamic = "force-dynamic";

