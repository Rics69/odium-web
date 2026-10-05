import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// For Docker and uptime monitoring: the site is up and reaches the database.
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: "ok" });
  } catch (error) {
    console.error("Health check: database unreachable", error);
    return Response.json(
      { status: "error", database: "unreachable" },
      { status: 503 },
    );
  }
}
