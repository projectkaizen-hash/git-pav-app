"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { format } from "date-fns";
import { Edit2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  author: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  cover_image_url: string | null;
}

export function BlogsTable() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchBlogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/blogs");
      if (!res.ok) throw new Error("Failed to fetch blog posts");
      const data = await res.json();
      setPosts(data);
    } catch {
      toast.error("Failed to load blog posts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  async function deleteBlog(id: string) {
    if (!confirm("Are you sure you want to delete this blog post?")) return;
    try {
      const res = await fetch(`/api/v1/admin/blogs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Blog post deleted");
      fetchBlogs();
    } catch {
      toast.error("Failed to delete blog post");
    }
  }

  const filtered = posts.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/blogs/new">
            <Plus className="size-4 mr-1.5" /> New Article
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Article</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Published Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Loading articles...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  {posts.length === 0 ? (
                    <>No blogs available. Click "New Article" to create your first blog post.</>
                  ) : (
                    <>No articles found matching your search.</>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {post.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.cover_image_url}
                          alt={post.title}
                          className="size-10 rounded-md object-cover border"
                        />
                      ) : (
                        <div className="size-10 rounded-md bg-muted flex items-center justify-center text-xs font-semibold">
                          DOC
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-sm">{post.title}</p>
                        <p className="text-xs text-muted-foreground font-mono">/{post.slug}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{post.category || "General"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{post.author}</TableCell>
                  <TableCell>
                    <Badge variant={post.published ? "default" : "secondary"}>
                      {post.published ? "Live" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {post.published_at ? format(new Date(post.published_at), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild className="size-8">
                        <Link href={`/dashboard/blogs/${post.id}/edit`}>
                          <Edit2 className="size-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        onClick={() => deleteBlog(post.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
