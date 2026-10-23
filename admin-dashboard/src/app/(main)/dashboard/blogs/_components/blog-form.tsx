"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface BlogPostData {
  id?: string;
  title: string;
  slug: string;
  excerpt?: string;
  body?: string;
  author?: string;
  category?: string;
  tags?: string[];
  cover_image_url?: string;
  meta_title?: string;
  meta_description?: string;
  published?: boolean;
}

export function BlogForm({ initialData }: { initialData?: BlogPostData }) {
  const router = useRouter();
  const isEditing = !!initialData?.id;

  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || "");
  const [body, setBody] = useState(initialData?.body || "");
  const [author, setAuthor] = useState(initialData?.author || "PavDental Clinical Team");
  const [category, setCategory] = useState(initialData?.category || "Oral Health");
  const [tagsInput, setTagsInput] = useState(
    Array.isArray(initialData?.tags) ? initialData.tags.join(", ") : "Whitening, Hygiene",
  );
  const [coverImageUrl, setCoverImageUrl] = useState(initialData?.cover_image_url || "");
  const [metaTitle, setMetaTitle] = useState(initialData?.meta_title || "");
  const [metaDescription, setMetaDescription] = useState(initialData?.meta_description || "");
  const [published, setPublished] = useState(initialData?.published ?? true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!isEditing) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, ""),
      );
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/v1/admin/blogs/upload-image", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setCoverImageUrl(data.url);
      toast.success("Cover image uploaded");
    } catch {
      toast.error("Failed to upload cover image");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !slug) {
      toast.error("Title and slug are required");
      return;
    }

    setSaving(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title,
        slug,
        excerpt,
        body,
        author,
        category,
        tags,
        cover_image_url: coverImageUrl,
        meta_title: metaTitle || title,
        meta_description: metaDescription || excerpt,
        published,
      };

      const url = isEditing ? `/api/v1/admin/blogs/${initialData.id}` : "/api/v1/admin/blogs";

      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Save failed");
      toast.success(isEditing ? "Blog post updated!" : "Blog post created!");
      router.push("/dashboard/blogs");
    } catch {
      toast.error("Error saving blog post");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/blogs">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isEditing ? `Edit: ${initialData?.title}` : "New Blog Article"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Write educational content, clinical updates, and patient advice.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/blogs">Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : isEditing ? "Save Changes" : "Publish Article"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Content */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Article Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold">Article Title *</label>
                <Input
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. The Science of Enamel-Safe Teeth Whitening"
                  className="mt-1 text-base font-semibold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold">URL Slug *</label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. science-of-teeth-whitening"
                  className="mt-1 font-mono text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold">Short Excerpt</label>
                <Textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Engaging summary for blog previews and search results..."
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div>
                <label className="text-xs font-semibold">Article Content (Markdown supported)</label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write full article here... Supports headings (##), bold (**text**), bullet lists, and paragraphs."
                  className="mt-1 font-mono text-sm leading-relaxed"
                  rows={14}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Metadata & Cover */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Publishing & Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Publish Status</p>
                  <p className="text-xs text-muted-foreground">Live on website</p>
                </div>
                <Switch checked={published} onCheckedChange={setPublished} />
              </div>

              <div>
                <label className="text-xs font-semibold">Author</label>
                <Input value={author} onChange={(e) => setAuthor(e.target.value)} className="mt-1" />
              </div>

              <div>
                <label className="text-xs font-semibold">Category</label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Cosmetic Dentistry, Oral Health"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold">Tags (comma separated)</label>
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Whitening, Hygiene, Prevention"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cover Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {coverImageUrl ? (
                <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImageUrl} alt="Cover preview" className="object-cover w-full h-full" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setCoverImageUrl("")}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="border border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition">
                  <Upload className="size-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground mb-3">Upload cover banner or enter URL</p>
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                    <Button type="button" variant="outline" size="sm" asChild disabled={uploading}>
                      <span>{uploading ? "Uploading..." : "Select File"}</span>
                    </Button>
                  </label>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold">Or Image URL</label>
                <Input
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1 text-xs"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">SEO Meta Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold">Meta Title</label>
                <Input
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="Custom page title for Google"
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Meta Description</label>
                <Textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="150-160 characters summary for search engine snippets..."
                  className="mt-1 text-xs"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
