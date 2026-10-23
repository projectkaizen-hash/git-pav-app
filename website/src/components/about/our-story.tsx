import { About3 } from "@/components/ui/about-3";

export function OurStory() {
  return (
    <About3
      title="About Us"
      description="Shadcnblocks is a passionate team dedicated to creating innovative solutions that empower businesses to thrive in the digital age."
      mainImage={{
        src: "/media/logomark.svg",
        alt: "logo",
      }}
      secondaryImage={{
        src: "/media/logotext.svg",
        alt: "logo",
      }}
      breakout={{
        src: "/media/icon.svg",
        alt: "logo",
        title: "Hundreds of blocks at Shadcnblocks.com",
        description:
          "Providing businesses with effective tools to improve workflows, boost efficiency, and encourage growth.",
        buttonText: "Discover more",
        buttonUrl: "https://shadcnblocks.com",
      }}
    />
  );
}
