import { BlogsTable } from "./_components/blogs-table";

export default function BlogsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Blog Articles</h1>
        <p className="text-muted-foreground text-sm">
          Publish and manage patient education articles, oral health guides, and clinic announcements.
        </p>
      </div>

      <BlogsTable />
    </div>
  );
}
