-- Additive: lets staff choose which clinicians the website's team page lists,
-- and in what order. Existing clinicians stay off the website until staff
-- switch them on.
-- AlterTable
ALTER TABLE "clinician_profiles" ADD COLUMN     "show_on_website" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "website_order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "clinician_profiles_show_on_website_website_order_idx" ON "clinician_profiles"("show_on_website", "website_order");
