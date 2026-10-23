import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/middleware";
import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(request: Request) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const posts = await query(`SELECT * FROM blog_posts ORDER BY created_at DESC`);
    return NextResponse.json(posts, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[GET /api/v1/admin/blogs]", error);
    return NextResponse.json({ error: "Failed to fetch blog posts" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function POST(request: Request) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const body = await request.json();
    const {
      title,
      slug,
      excerpt,
      cover_image_url,
      body: content,
      author = "PavDental Team",
      category,
      tags = [],
      meta_title,
      meta_description,
      published = false,
    } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: "Title and slug are required" }, { status: 400, headers: CORS_HEADERS });
    }

    const published_at = published ? new Date().toISOString() : null;

    const inserted = await query<Record<string, unknown>>(
      `INSERT INTO blog_posts (
        title, slug, excerpt, cover_image_url, body, author,
        category, tags, meta_title, meta_description, published, published_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        title,
        slug,
        excerpt || null,
        cover_image_url || null,
        content || null,
        author,
        category || null,
        JSON.stringify(tags),
        meta_title || null,
        meta_description || null,
        published,
        published_at,
      ],
    );

    return NextResponse.json(inserted[0], { status: 201, headers: CORS_HEADERS });
  } catch (error) {
    console.error("[POST /api/v1/admin/blogs]", error);
    return NextResponse.json({ error: "Failed to create blog post" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
