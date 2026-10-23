import { NewsletterTable } from "./_components/newsletter-table";

export default function NewsletterPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Newsletter Subscribers</h1>
        <p className="text-muted-foreground text-sm">
          Audience list of website visitors who subscribed to clinic announcements, teeth whitening offers, and dental
          advice.
        </p>
      </div>

      <NewsletterTable />
    </div>
  );
}
