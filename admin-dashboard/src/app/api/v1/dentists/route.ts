import { NextResponse } from "next/server";

import { pavApiUrl } from "@/lib/pav-api.server";

// The website's team page. The list lives in the app backend, so the app and
// the website always show the same dentists; staff edit it on the dashboard's
// Dentist profiles page.
export async function GET() {
  const base = pavApiUrl();
  if (!base) return NextResponse.json({ error: "The app backend isn't configured" }, { status: 503 });
  try {
    const res = await fetch(`${base}/api/services/dentists`, { next: { revalidate: 300 } });
    if (!res.ok) return NextResponse.json({ error: "Couldn't load the team" }, { status: 502 });
    return NextResponse.json(await res.json(), { headers: { "Cache-Control": "public, max-age=300" } });
  } catch (error) {
    console.error("[GET /api/v1/dentists]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "The app backend couldn't be reached" }, { status: 502 });
  }
}
