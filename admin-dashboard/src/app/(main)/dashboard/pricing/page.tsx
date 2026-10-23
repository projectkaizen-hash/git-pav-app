"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AnnouncementsTab } from "./_components/announcements-tab";
import { FeeTab } from "./_components/fee-tab";
import { PlansTab } from "./_components/plans-tab";

export default function PricingPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Pricing & Fee Schedule</h1>
        <p className="text-muted-foreground text-sm">
          Update membership packages, treatment fees, and promotional banners shown on the website.
        </p>
      </div>

      <Tabs defaultValue="plans" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="plans">Membership Plans</TabsTrigger>
          <TabsTrigger value="fee">Treatment Fee Schedule</TabsTrigger>
          <TabsTrigger value="announcements">Promotional Banners</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <PlansTab />
        </TabsContent>

        <TabsContent value="fee">
          <FeeTab />
        </TabsContent>

        <TabsContent value="announcements">
          <AnnouncementsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
