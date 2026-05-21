import process from "node:process";

// Local dev should not require the Docker Compose PostgreSQL hostname.
process.env.REQUIRE_POSTGRES ??= "false";
process.env.DATABASE_URL ??= "";

await import("../server/review-server.mjs");
