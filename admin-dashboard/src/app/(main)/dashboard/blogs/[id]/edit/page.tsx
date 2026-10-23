"use client";

import { use, useEffect, useState } from "react";

import { BlogForm } from "../../_components/blog-form";

export default function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/admin/blogs/${id}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setPost(data);
      } catch {
        // error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading article...</div>;
  }

  if (!post) {
    return <div className="p-8 text-center text-destructive">Article not found.</div>;
  }

  return (
    <BlogForm
      initialData={{
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        body: post.body,
        author: post.author,
        category: post.category,
        tags: post.tags,
        cover_image_url: post.cover_image_url,
        meta_title: post.meta_title,
        meta_description: post.meta_description,
        published: post.published,
      }}
    />
  );
}
