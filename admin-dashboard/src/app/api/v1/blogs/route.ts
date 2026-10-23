import { NextResponse } from "next/server";

import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET() {
  try {
    const posts = await query(`
      SELECT
        id,
        title,
        slug,
        excerpt,
        cover_image_url,
        author,
        category,
        tags,
        published_at
      FROM blog_posts
      WHERE published = true
      ORDER BY published_at DESC
    `);

    return NextResponse.json(posts, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[GET /api/v1/blogs]", error);
    return NextResponse.json({ error: "Failed to fetch blog posts" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
