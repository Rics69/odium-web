export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Fail at startup, not on the first request, when a variable is missing.
    await import("./lib/env");
  }
}
