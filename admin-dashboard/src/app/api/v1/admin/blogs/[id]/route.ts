import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/middleware";
import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "GET, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const posts = await query("SELECT * FROM blog_posts WHERE id = $1", [id]);
    if (!posts[0]) {
      return NextResponse.json({ error: "Post not found" }, { status: 404, headers: CORS_HEADERS });
    }
    return NextResponse.json(posts[0], { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[GET /api/v1/admin/blogs/:id]", error);
    return NextResponse.json({ error: "Failed to fetch blog post" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await request.json();

    const allowedFields = [
      "title",
      "slug",
      "excerpt",
      "cover_image_url",
      "body",
      "author",
      "category",
      "tags",
      "meta_title",
      "meta_description",
      "published",
    ];

    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        values.push(field === "tags" ? JSON.stringify(body[field]) : body[field]);
        updates.push(`${field} = $${values.length}`);
      }
    }

    if (body.published === true) {
      values.push(new Date().toISOString());
      updates.push(`published_at = $${values.length}`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400, headers: CORS_HEADERS });
    }

    values.push(new Date().toISOString());
    updates.push(`updated_at = $${values.length}`);

    values.push(id);
    const sql = `UPDATE blog_posts SET ${updates.join(", ")} WHERE id = $${values.length} RETURNING *`;
    const updated = await query(sql, values);

    if (!updated[0]) {
      return NextResponse.json({ error: "Post not found" }, { status: 404, headers: CORS_HEADERS });
    }

    return NextResponse.json(updated[0], { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[PATCH /api/v1/admin/blogs/:id]", error);
    return NextResponse.json({ error: "Failed to update blog post" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    await query("DELETE FROM blog_posts WHERE id = $1", [id]);
    return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[DELETE /api/v1/admin/blogs/:id]", error);
    return NextResponse.json({ error: "Failed to delete blog post" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
