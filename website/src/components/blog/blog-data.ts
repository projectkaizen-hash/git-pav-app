export interface Article {
  id: string;
  slug: string;
  title: string;
  category: "cosmetic" | "hygiene" | "implants" | "community";
  categoryLabel: string;
  author: {
    name: string;
    role: string;
    avatar: string;
  };
  date: string;
  readingTime: string;
  image: string;
  excerpt: string;
  featured?: boolean;
  content: {
    intro: string;
    sections: {
      heading: string;
      body: string;
    }[];
    takeaways: string[];
  };
}

export const ARTICLES: Article[] = [
  {
    id: "art-1",
    slug: "pap-vs-hydrogen-peroxide-whitening",
    title: "The Truth About Teeth Whitening: PAP+ vs Hydrogen Peroxide Explained",
    category: "cosmetic",
    categoryLabel: "Cosmetic Dentistry",
    author: {
      name: "Dr. Hassan Bhojani",
      role: "Principal Dentist & Clinical Director",
      avatar: "/media/team-photo-pending.svg",
    },
    date: "14 Oct 2025",
    readingTime: "5 min read",
    image: "https://images.ctfassets.net/kygl0mrej7ni/5O9q1iObkIWOW6e2gW2gOe/73bcbc7688328ee63b4fa66973d9cd97/24_hour_emergency.png",
    excerpt: "Why modern cosmetic dentistry is shifting away from traditional high-peroxide bleaches toward biomimetic PAP+ whitening systems that protect tooth enamel while eliminating stubborn stains.",
    featured: true,
    content: {
      intro: "Teeth whitening has been one of the most requested treatments at our Bradford clinic for over a decade. However, the number one hesitation patients express is tooth sensitivity and the fear of damaging their enamel.",
      sections: [
        {
          heading: "How Traditional Peroxide Whitening Works",
          body: "For decades, hydrogen peroxide and carbamide peroxide were the dental industry standard. While undeniably effective at oxidising organic discoloration, peroxide releases free radicals that penetrate microscopic pores in tooth enamel, irritating the underlying dentin and triggering acute nerve spasms."
        },
        {
          heading: "The Innovation Behind Phthalimidoperoxycaproic Acid (PAP+)",
          body: "PAP+ represents a fundamental breakthrough in aesthetic dental chemistry. Rather than eroding enamel prisms, PAP+ specifically targets chromophores (the organic molecules causing staining) without penetrating the pulp chamber. When combined with nano-hydroxyapatite and potassium citrate, it remineralises enamel while brightening."
        },
        {
          heading: "Clinical Results & Long-Term Safety",
          body: "In our clinical observations, patients achieve 6 to 8 shades of whitening over a 7-day protocol with zero reportable post-operative sensitivity. For patients with composite veneers or crowns, PAP+ also avoids the edge-demarcation risks often seen with aggressive peroxide gels."
        }
      ],
      takeaways: [
        "PAP+ oxidises discoloured molecules without releasing free radicals into the pulp.",
        "Nano-hydroxyapatite in modern formulations actively repairs micro-enamel fissures.",
        "Whitening should always be preceded by a professional hygiene check to clear tartar."
      ]
    }
  },
  {
    id: "art-2",
    slug: "bradford-nhs-dental-crisis-report",
    title: "Why Bradford Residents Are Resorting to DIY Dentistry — And What Needs to Change",
    category: "community",
    categoryLabel: "Community News",
    author: {
      name: "Emma Thompson",
      role: "Practice Manager & Patient Advocate",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=85",
    },
    date: "02 Nov 2025",
    readingTime: "4 min read",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=85",
    excerpt: "A deep dive into the healthcare emergency unfolding across West Yorkshire, where 80% of NHS dental books are shut and patients are forced into desperate measures.",
    content: {
      intro: "Recent national broadcast coverage featuring our clinic shed light on a heartbreaking reality: ordinary mothers, grandparents, and workers in Bradford pulling their own teeth with pliers because they cannot find an accessible NHS dental appointment.",
      sections: [
        {
          heading: "The Numbers Behind the Crisis",
          body: "Official British Dental Association figures indicate that over 80% of dental surgeries in Bradford and Leeds are completely closed to new adult NHS patients. Pediatric waiting lists for hospital extractions under general anesthetic now routinely exceed 12 months."
        },
        {
          heading: "Our Petition to Parliament",
          body: "PavDental launched the Bradford NHS Dental Funding Petition to demand immediate funding for mobile dental vans, reformed UDA contract rates, and dedicated emergency walk-in funding. With over 2,400 local signatures collected, we are presenting our case to Westminster."
        }
      ],
      takeaways: [
        "Bradford has among the highest child tooth decay rates in the United Kingdom.",
        "DIY dentistry leads to severe bone infections, sepsis, and permanent nerve trauma.",
        "Community collective action is essential to reforming NHS dental contracts."
      ]
    }
  },
  {
    id: "art-3",
    slug: "composite-bonding-vs-porcelain-veneers",
    title: "Composite Bonding vs Porcelain Veneers: Which Smile Makeover Is Right for You?",
    category: "cosmetic",
    categoryLabel: "Cosmetic Dentistry",
    author: {
      name: "Dr. Carolyn Solverson",
      role: "Cosmetic Dentist & Smile Architect",
      avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=300&q=85",
    },
    date: "28 Oct 2025",
    readingTime: "6 min read",
    image: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=1200&q=85",
    excerpt: "Comparing longevity, cost, preparation, and aesthetic results to help you choose the best treatment for chipped, gapped, or discoloured teeth.",
    content: {
      intro: "When patients walk into our consultation rooms wanting to transform their smile, the debate almost always centers on composite bonding versus porcelain veneers. Both produce remarkable results, but they serve different clinical goals.",
      sections: [
        {
          heading: "Composite Edge Bonding: Speed and Non-Invasiveness",
          body: "Composite bonding involves layering tooth-coloured resin directly onto the surface of natural teeth without removing any enamel. Completed in a single appointment, it is completely reversible, highly affordable, and ideal for closing minor gaps or repairing chipped edges."
        },
        {
          heading: "Porcelain Veneers: Ultimate Durability and Stain Resistance",
          body: "Handcrafted in a ceramic laboratory, ultra-thin porcelain veneers are custom-glazed to mimic the exact translucency and light reflection of natural tooth enamel. They resist coffee, red wine, and tobacco staining for 15 to 20 years with proper maintenance."
        }
      ],
      takeaways: [
        "Composite bonding requires zero enamel shaving and is completed in one visit.",
        "Porcelain veneers last 15+ years and provide superior stain resistance.",
        "A hybrid approach often yields the best balance of aesthetics and cost."
      ]
    }
  },
  {
    id: "art-4",
    slug: "dental-implants-longevity-care-guide",
    title: "Dental Implants: Everything You Need to Know About Longevity, Bone Care, and Recovery",
    category: "implants",
    categoryLabel: "Dental Implants",
    author: {
      name: "Dr. Marcus Vance",
      role: "Oral & Implant Surgeon",
      avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=300&q=85",
    },
    date: "19 Oct 2025",
    readingTime: "5 min read",
    image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=85",
    excerpt: "Why titanium and zirconia dental implants remain the permanent gold standard for replacing missing teeth and preventing jawbone shrinkage.",
    content: {
      intro: "Missing teeth affect far more than just your smile. Over time, the absence of tooth roots causes the underlying jawbone to resorb, leading to facial sagging, shifting bite alignment, and chewing difficulties.",
      sections: [
        {
          heading: "How Osseointegration Works",
          body: "A dental implant is a biocompatible titanium or ceramic screw placed directly into the jawbone. Over 8 to 12 weeks, bone cells fuse permanently with the implant surface through osseointegration, creating a foundation as sturdy as a natural tooth root."
        },
        {
          heading: "Single Tooth vs Full Arch Restorations",
          body: "Whether replacing an individual molar or restoring an entire upper arch via All-on-4 techniques, 3D computer-guided surgery ensures pinpoint precision, minimal swelling, and same-day provisional teeth."
        }
      ],
      takeaways: [
        "Implants stimulate bone growth and prevent premature facial aging.",
        "Success rates exceed 98% with good oral hygiene and routine check-ups.",
        "0% interest dental finance plans make implants accessible on monthly budgets."
      ]
    }
  },
  {
    id: "art-5",
    slug: "custom-gold-diamond-grillz-guide",
    title: "Custom Gold & Diamond Grillz: The Ultimate Safe Smile Jewellery Guide",
    category: "cosmetic",
    categoryLabel: "Cosmetic Dentistry",
    author: {
      name: "Dr. Hassan Bhojani",
      role: "Principal Dentist",
      avatar: "/media/team-photo-pending.svg",
    },
    date: "10 Oct 2025",
    readingTime: "4 min read",
    image: "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1200&q=85",
    excerpt: "How our dental technicians craft custom 10k, 14k, and 18k solid gold and VVS diamond grillz that fit flawlessly without causing enamel abrasion or gum disease.",
    content: {
      intro: "Grillz have evolved from underground hip-hop culture into haute joaillerie. However, wearing ill-fitting, non-dental grillz purchased online can permanently destroy your natural bite, trap plaque, and erode enamel.",
      sections: [
        {
          heading: "The Importance of Dental Impressions",
          body: "At PavDental, every grillz piece begins with a precision medical-grade dental impression taken by registered clinicians or via our at-home impression kit. This ensures a friction-fit that snaps securely over your teeth without adhesive or pressure on your gums."
        },
        {
          heading: "Metal Purity and Enamel Safety",
          body: "We exclusively use nickel-free 10k, 14k, and 18k yellow, white, and rose gold, paired with conflict-free VVS lab or natural diamonds. Our designs leave adequate space for natural saliva circulation to keep teeth remineralised."
        }
      ],
      takeaways: [
        "Never wear non-custom grillz that clip on with spring tension.",
        "Always remove your grillz when eating or sleeping to avoid bacterial buildup.",
        "Clean your grillz with our specialized antimicrobial foaming cleanser."
      ]
    }
  },
  {
    id: "art-6",
    slug: "teeth-grinding-bruxism-nightguards",
    title: "Waking Up with Jaw Ache or Headaches? Signs You Might Be Grinding Your Teeth",
    category: "hygiene",
    categoryLabel: "Oral Health & Hygiene",
    author: {
      name: "Dr. Julian Alverez",
      role: "Sedation & Pain Specialist",
      avatar: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=300&q=85",
    },
    date: "04 Oct 2025",
    readingTime: "4 min read",
    image: "https://images.unsplash.com/photo-1559591937-e1032b4bfa4f?auto=format&fit=crop&w=1200&q=85",
    excerpt: "Nighttime teeth grinding (bruxism) affects over 30% of UK adults. Learn how to recognize the symptoms early before permanent enamel fracture occurs.",
    content: {
      intro: "Many people grind or clench their teeth during deep REM sleep without ever realizing it. They simply wake up with a dull temple headache, stiff jaw muscles, or notice their front teeth looking shorter and flatter.",
      sections: [
        {
          heading: "Common Warning Signs of Bruxism",
          body: "Flattened or chipped biting edges, unexplained tooth sensitivity to hot and cold, tender jaw joints (TMJ clicking), and ear pain are classic symptoms of nocturnal clenching, often exacerbated by workplace stress."
        },
        {
          heading: "Why Boil-and-Bite Guards Don't Work",
          body: "Generic chemist mouthguards are made of soft rubber that actually stimulates the chewing reflex, causing patients to bite harder at night. A custom-fabricated dual-laminate nightguard provides an ultra-slick gliding surface that completely relieves joint strain."
        }
      ],
      takeaways: [
        "Bruxism generates up to 250 lbs of biting pressure during sleep.",
        "Custom laboratory nightguards prevent millions of pounds in tooth restoration costs.",
        "Stress management and proper sleep ergonomics can significantly reduce grinding."
      ]
    }
  },
  {
    id: "art-7",
    slug: "children-dental-habits-west-yorkshire",
    title: "Guiding Little Smiles: Essential Early Dental Habits for Parents in Bradford",
    category: "hygiene",
    categoryLabel: "Oral Health & Hygiene",
    author: {
      name: "Pav Dental team",
      role: "Pav Dental",
      avatar: "/media/team-photo-pending.svg",
    },
    date: "25 Sep 2025",
    readingTime: "5 min read",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=85",
    excerpt: "How to make brushing fun, avoid hidden sugar traps in school lunchboxes, and ensure your child's first dental visit is relaxed and tear-free.",
    content: {
      intro: "A child's relationship with the dentist is formed during their earliest visits. By establishing positive oral hygiene rituals early, parents can safeguard their child's permanent adult teeth for life.",
      sections: [
        {
          heading: "The 'First Tooth, First Visit' Rule",
          body: "The British Society of Paediatric Dentistry recommends bringing children to the clinic as soon as their first primary tooth erupts, or by their first birthday. These quick, friendly check-ups desensitize toddlers to clinical sounds."
        },
        {
          heading: "Managing Hidden Sugars in Juices and Snacks",
          body: "Fruit pouches, dried raisins, and children's cereals frequently contain concentrated free sugars that cling to primary enamel for hours. Encouraging water as the primary beverage and restricting sweets to mealtimes cuts decay risk by over 60%."
        }
      ],
      takeaways: [
        "Bring children to the dentist before their first birthday for stress-free familiarisation.",
        "Use a smear of fluoride toothpaste under age 3, and a pea-sized amount from age 3 to 6.",
        "Never put children to bed with a bottle of milk or fruit juice."
      ]
    }
  }
];
