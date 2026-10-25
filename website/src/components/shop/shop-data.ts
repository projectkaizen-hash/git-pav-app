export interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  categoryLabel: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewsCount: number;
  image: string;
  shortDesc: string;
  fullDesc: string;
  features: string[];
  howToUse: string;
  badge?: string;
  inStock: boolean;
  variants?: any;
  relatedProducts?: any;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export const PRODUCTS: Product[] = [
  {
    id: "pav-whitening-system",
    slug: "pavpro-clinical-teeth-whitening-system",
    name: "PavPro™ Clinical Teeth Whitening System",
    category: "teeth-whitening",
    categoryLabel: "Teeth Whitening",
    price: 49.99,
    originalPrice: 65.00,
    rating: 4.9,
    reviewsCount: 342,
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=85",
    shortDesc: "Dentist-formulated PAP+ dual-light LED whitening system. Zero tooth sensitivity with up to 8 shades whiter in 7 days.",
    fullDesc: "Designed by our cosmetic clinical team at PavDental, the PavPro™ Whitening System combines non-invasive PAP+ mineral technology with dual-wavelength blue/red LED light to eliminate deep stains without eroding tooth enamel or causing gum sensitivity.",
    features: [
      "Wireless LED mouthpiece with red/blue phototherapy",
      "3x PAP+ active whitening gel precision pens",
      "Peroxide-free & 100% enamel safe",
      "Integrated 10-minute auto timer",
    ],
    howToUse: "Brush teeth thoroughly, apply a thin layer of gel to tooth surfaces, insert the LED mouthpiece, and activate for 10 minutes daily for 7 consecutive days.",
    badge: "Bestseller",
    inStock: true,
  },
  {
    id: "pav-sonic-toothbrush",
    slug: "sonicpulse-pro-smart-electric-toothbrush",
    name: "SonicPulse Pro™ Smart Electric Toothbrush",
    category: "sonic-care",
    categoryLabel: "Sonic Care",
    price: 69.00,
    originalPrice: 89.00,
    rating: 4.9,
    reviewsCount: 218,
    image: "https://images.unsplash.com/photo-1559591937-e1032b4bfa4f?auto=format&fit=crop&w=800&q=85",
    shortDesc: "42,000 vibrations per minute sonic toothbrush with 5 clinical modes and UV sanitizing magnetic travel case.",
    fullDesc: "Engineered for optimal plaque removal along the gumline, SonicPulse Pro delivers acoustic micro-bubbles deep into interdental spaces. Includes an ultraviolet sanitizing charging base that eliminates 99.9% of bacteria on brush heads between uses.",
    features: [
      "42,000 VPM acoustic levitation motor",
      "5 brushing modes: Clean, White, Sensitive, Polish, Gum Care",
      "60-day battery life on a single USB-C charge",
      "Includes 3x Dupont antibacterial brush heads",
    ],
    howToUse: "Use twice daily for 2 minutes with QuadPacer 30-second interval guidance. Replace brush heads every 3 months.",
    badge: "Clinic Favorite",
    inStock: true,
  },
  {
    id: "pav-custom-grillz-kit",
    slug: "pavdental-custom-grillz-impression-kit",
    name: "PavDental Custom Grillz Impression Kit",
    category: "custom-kits",
    categoryLabel: "Custom Kits",
    price: 39.00,
    originalPrice: 50.00,
    rating: 5.0,
    reviewsCount: 89,
    image: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=800&q=85",
    shortDesc: "Complete at-home dental impression kit with prepaid return postage to our Bradford lab for custom gold & diamond grillz.",
    fullDesc: "Start your custom smile jewellery journey from home. This kit contains medical-grade heavy-body dental putty, universal impression trays, and complete step-by-step instructions. Once returned to our clinic, our principal dental technicians craft your bespoke gold or diamond grillz.",
    features: [
      "Medical-grade dental silicone impression putty (upper & lower)",
      "3 sizes of ergonomic impression trays",
      "Prepaid Royal Mail 24 Tracked return envelope",
      "£39 kit cost fully credited toward your finished grillz order",
    ],
    howToUse: "Mix putties for 30 seconds, place in tray, firmly bite for 3 minutes, and post back using the included prepaid tracked box.",
    badge: "Exclusive",
    inStock: true,
  },
  {
    id: "pav-water-flosser",
    slug: "hydroflow-cordless-dental-water-flosser",
    name: "HydroFlow Cordless Dental Water Flosser",
    category: "sonic-care",
    categoryLabel: "Sonic Care",
    price: 44.00,
    originalPrice: 55.00,
    rating: 4.8,
    reviewsCount: 164,
    image: "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=800&q=85",
    shortDesc: "Portable high-pressure oral irrigator with 300ml reservoir, 4 jet tips, and 4 cleansing modes for implants & braces.",
    fullDesc: "Clinically proven to remove up to 99.9% of plaque from treated areas and 50% more effective than string floss for improving gum health. Perfect for orthodontic braces, crowns, veneers, and dental implants.",
    features: [
      "1,800 pulses/min targeted pulse frequency",
      "360° rotating nozzle with 4 interchangeable tips",
      "IPX7 waterproof for convenient in-shower use",
      "30-day battery runtime with magnetic fast charging",
    ],
    howToUse: "Fill reservoir with lukewarm water, lean over basin, position tip at 90° to gumline, and glide along teeth for 60 seconds.",
    inStock: true,
  },
  {
    id: "pav-nightguard-kit",
    slug: "nightshield-custom-bruxism-guard-kit",
    name: "NightShield™ Custom Bruxism Guard Kit",
    category: "custom-kits",
    categoryLabel: "Custom Kits",
    price: 89.00,
    originalPrice: 120.00,
    rating: 4.9,
    reviewsCount: 195,
    image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=800&q=85",
    shortDesc: "Custom-moulded clinical nightguard made by our dental technicians to prevent teeth grinding, jaw ache, and enamel wear.",
    fullDesc: "Don't settle for bulky boil-and-bite mouthguards. We take your exact dental impressions and handcraft a slim, durable dual-laminate nightguard that fits comfortably over your teeth, alleviating TMJ tension and preserving tooth structure.",
    features: [
      "Custom 2.5mm soft/hard dual laminate acrylic",
      "Crafted in our registered Bradford dental laboratory",
      "Includes antibacterial storage case and impression materials",
      "Free adjustments guaranteed if fit requires fine-tuning",
    ],
    howToUse: "Take impression at home, mail to our clinic in prepaid box, receive your custom-moulded nightguard within 7–10 days.",
    badge: "Doctor Recommended",
    inStock: true,
  },
  {
    id: "pav-enamel-toothpaste",
    slug: "hydroxyapatite-enamel-restore-toothpaste",
    name: "Hydroxyapatite Enamel Restore Toothpaste (75ml)",
    category: "daily-care",
    categoryLabel: "Daily Care",
    price: 12.50,
    rating: 4.9,
    reviewsCount: 412,
    image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=800&q=85",
    shortDesc: "Biomimetic nano-hydroxyapatite toothpaste that remineralises micro-cavities and reverses sensitivity naturally.",
    fullDesc: "Formulated with 10% nano-hydroxyapatite (the natural mineral that makes up 97% of tooth enamel), this fluoride-free toothpaste bonds directly to enamel tubules to seal sensitivity and impart a glossy diamond finish.",
    features: [
      "10% medical-grade nano-hydroxyapatite (nHa)",
      "Zero SLS, parabens, artificial dyes, or harsh abrasives",
      "Infused with organic British peppermint oil and xylitol",
      "Safe for porcelain veneers, crowns, and composite bonding",
    ],
    howToUse: "Brush twice daily for 2 minutes. Spit excess without rinsing with water to allow active minerals to absorb into enamel.",
    inStock: true,
  },
  {
    id: "pav-whitening-strips",
    slug: "lumibrite-enamel-safe-whitening-strips",
    name: "LumiBrite™ Enamel-Safe Whitening Strips (14 Treatments)",
    category: "teeth-whitening",
    categoryLabel: "Teeth Whitening",
    price: 24.99,
    originalPrice: 32.00,
    rating: 4.8,
    reviewsCount: 278,
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=85",
    shortDesc: "Non-slip dry-fit whitening strips with coconut oil and active PAP for effortless stain removal on the go.",
    fullDesc: "Noticeably whiter teeth in just 30 minutes a day. Designed with anti-slip dry adhesion technology so you can speak and drink water while treating coffee, wine, and smoke discoloration without gel slippage.",
    features: [
      "14 upper and 14 lower dry-fit strip treatments",
      "Enhanced with organic coconut oil for gum conditioning",
      "Zero hydrogen peroxide sensitivity",
      "Compact travel-ready sachets",
    ],
    howToUse: "Peel strips, apply firmly to upper and lower front teeth, leave for 30 minutes, peel off, and brush away residue.",
    inStock: true,
  },
  {
    id: "pav-aligner-foam",
    slug: "aligner-retainer-antibacterial-cleaning-foam",
    name: "Aligner & Retainer Antibacterial Cleaning Foam (100ml)",
    category: "daily-care",
    categoryLabel: "Daily Care",
    price: 14.00,
    rating: 4.9,
    reviewsCount: 138,
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=85",
    shortDesc: "Pump-action sanitizing foam that clears plaque, eliminates 99.9% of bacteria, and gently whitens aligner trays.",
    fullDesc: "Keep your clear aligners, retainers, and mouthguards crystal clear and smelling fresh. Simply pump directly into trays before inserting or use with a soft brush for quick deep cleansing without cloudy residue.",
    features: [
      "Kills 99.9% of odor-causing bacteria in 60 seconds",
      "Maintains clarity of Invisalign & clear aligners",
      "Subtle fresh mint flavor",
      "100ml pump bottle lasts up to 60 days",
    ],
    howToUse: "Pump one pump of foam directly into clear trays, spread evenly, and wear as normal or rinse with lukewarm water.",
    inStock: true,
  },
];

