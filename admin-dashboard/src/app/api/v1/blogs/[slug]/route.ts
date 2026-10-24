import { NextResponse } from "next/server";

import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "http://localhost:8080",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    const [post] = await query(`SELECT * FROM blog_posts WHERE slug = $1 AND published = true`, [slug]);

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404, headers: CORS_HEADERS });
    }

    return NextResponse.json(post, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[GET /api/v1/blogs/[slug]]", error);
    return NextResponse.json({ error: "Failed to fetch blog post" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
