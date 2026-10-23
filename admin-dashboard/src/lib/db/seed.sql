-- =============================================================================
-- seed.sql — PavDental Admin-Dashboard seed data
-- =============================================================================

-- -------------------------
-- Pricing Plans
-- -------------------------
INSERT INTO pricing_plans (name, color, monthly_price, yearly_price, features, is_popular, sort_order)
VALUES
  (
    'Bronze',
    'bronze',
    9.47,
    7.58,
    '[
      {"text":"1x artificial intelligence dental health scan","included":false},
      {"text":"Dedicated Whatsapp Number","included":false},
      {"text":"Appointments in 72hrs","included":true},
      {"text":"1x hygiene treatments","included":true},
      {"text":"10% off treatment","included":true},
      {"text":"10% off Products","included":true},
      {"text":"Xrays included","included":true},
      {"text":"1x check-up","included":true}
    ]'::jsonb,
    false,
    1
  ),
  (
    'Silver',
    'silver',
    15.85,
    12.68,
    '[
      {"text":"1x artificial intelligence dental health scan","included":false},
      {"text":"Dedicated Whatsapp Number","included":false},
      {"text":"Appointments in 48hrs","included":true},
      {"text":"2x hygiene treatments","included":true},
      {"text":"15% off treatment","included":true},
      {"text":"15% off Products","included":true},
      {"text":"Xrays included","included":true},
      {"text":"2x check-up","included":true}
    ]'::jsonb,
    true,
    2
  ),
  (
    'Gold',
    'gold',
    19.24,
    15.39,
    '[
      {"text":"1x artificial intelligence dental health scan","included":true},
      {"text":"Dedicated Whatsapp Number","included":true},
      {"text":"Appointments in 24hrs","included":true},
      {"text":"3x hygiene visits per year","included":true},
      {"text":"20% off treatment","included":true},
      {"text":"20% off Products","included":true},
      {"text":"Xrays included","included":true},
      {"text":"2x check-up","included":true}
    ]'::jsonb,
    false,
    3
  )
ON CONFLICT (name) DO NOTHING;

-- -------------------------
-- Fee Schedule Categories & Items
-- -------------------------

-- Examination
WITH cat AS (
  INSERT INTO fee_categories (name, sort_order) 
  VALUES ('Examination', 1) 
  ON CONFLICT (name) DO NOTHING 
  RETURNING id
)
INSERT INTO fee_items (category_id, name, fee, sort_order)
SELECT cat.id, item.name, item.fee, item.ord FROM cat,
(VALUES
  ('Routine Dental Examination',     '£35',  1),
  ('New Patient Examination',        '£45',  2),
  ('Small Digital X-Ray (per film)', '£10',  3),
  ('Full Mouth Panoramic OPG X-Ray', '£45',  4),
  ('Emergency Dental Consultation',  '£45',  5)
) AS item(name, fee, ord)
ON CONFLICT (category_id, name) DO NOTHING;

-- Hygiene
WITH cat AS (
  INSERT INTO fee_categories (name, sort_order) 
  VALUES ('Hygiene', 2) 
  ON CONFLICT (name) DO NOTHING 
  RETURNING id
)
INSERT INTO fee_items (category_id, name, fee, sort_order)
SELECT cat.id, item.name, item.fee, item.ord FROM cat,
(VALUES
  ('Scale & Polish',                               '£45',  1),
  ('Airflow Stain Removal',                        '£65',  2),
  ('Periodontal Deep Clean (per quadrant)',         '£75',  3)
) AS item(name, fee, ord)
ON CONFLICT (category_id, name) DO NOTHING;

-- White Fillings
WITH cat AS (
  INSERT INTO fee_categories (name, sort_order) 
  VALUES ('White Fillings', 3) 
  ON CONFLICT (name) DO NOTHING 
  RETURNING id
)
INSERT INTO fee_items (category_id, name, fee, sort_order)
SELECT cat.id, item.name, item.fee, item.ord FROM cat,
(VALUES
  ('Simple White Filling (1 surface)',   '£75',   1),
  ('Medium White Filling (2 surfaces)',  '£95',   2),
  ('Complex White Filling (3+ surfaces)','£125',  3)
) AS item(name, fee, ord)
ON CONFLICT (category_id, name) DO NOTHING;

-- Root Canal Treatment
WITH cat AS (
  INSERT INTO fee_categories (name, sort_order) 
  VALUES ('Root Canal Treatment', 4) 
  ON CONFLICT (name) DO NOTHING 
  RETURNING id
)
INSERT INTO fee_items (category_id, name, fee, sort_order)
SELECT cat.id, item.name, item.fee, item.ord FROM cat,
(VALUES
  ('Single Root Tooth (Incisor / Canine)',  '£250',  1),
  ('Premolar Tooth (Two roots)',            '£325',  2),
  ('Molar Tooth (Multi-rooted)',            '£425',  3),
  ('Emergency Pain Relief & Dressing',     '£65',   4)
) AS item(name, fee, ord)
ON CONFLICT (category_id, name) DO NOTHING;

-- Extractions
WITH cat AS (
  INSERT INTO fee_categories (name, sort_order) 
  VALUES ('Extractions', 5) 
  ON CONFLICT (name) DO NOTHING 
  RETURNING id
)
INSERT INTO fee_items (category_id, name, fee, sort_order)
SELECT cat.id, item.name, item.fee, item.ord FROM cat,
(VALUES
  ('Simple Tooth Extraction',             '£75',   1),
  ('Surgical / Complex Extraction',       '£135',  2),
  ('Wisdom Tooth Extraction',             '£175',  3),
  ('Socket Preservation',                 '£95',   4),
  ('Emergency Out of Hours Extraction',   '£145',  5)
) AS item(name, fee, ord)
ON CONFLICT (category_id, name) DO NOTHING;

-- Crowns & Bridges
WITH cat AS (
  INSERT INTO fee_categories (name, sort_order) 
  VALUES ('Crowns & Bridges', 6) 
  ON CONFLICT (name) DO NOTHING 
  RETURNING id
)
INSERT INTO fee_items (category_id, name, fee, sort_order)
SELECT cat.id, item.name, item.fee, item.ord FROM cat,
(VALUES
  ('Porcelain Bonded Crown',          '£350',  1),
  ('All-Ceramic / Zirconia Crown',    '£450',  2),
  ('Full Gold Crown',                 '£495',  3),
  ('Bridge (per unit)',               '£350',  4),
  ('Recement Crown / Bridge',         '£45',   5)
) AS item(name, fee, ord)
ON CONFLICT (category_id, name) DO NOTHING;

-- Dentures
WITH cat AS (
  INSERT INTO fee_categories (name, sort_order) 
  VALUES ('Dentures', 7) 
  ON CONFLICT (name) DO NOTHING 
  RETURNING id
)
INSERT INTO fee_items (category_id, name, fee, sort_order)
SELECT cat.id, item.name, item.fee, item.ord FROM cat,
(VALUES
  ('Acrylic Full Denture (Single Arch)',         '£450',  1),
  ('Acrylic Complete Set (Upper & Lower)',       '£750',  2),
  ('Chrome Cobalt Metal Denture',               '£650',  3),
  ('Denture Repair / Addition',                 '£65',   4)
) AS item(name, fee, ord)
ON CONFLICT (category_id, name) DO NOTHING;

-- Dental Implants
WITH cat AS (
  INSERT INTO fee_categories (name, sort_order) 
  VALUES ('Dental Implants', 8) 
  ON CONFLICT (name) DO NOTHING 
  RETURNING id
)
INSERT INTO fee_items (category_id, name, fee, sort_order)
SELECT cat.id, item.name, item.fee, item.ord FROM cat,
(VALUES
  ('Implant Consultation',                       'Free',         1),
  ('Single Dental Implant (including crown)',    'From £1,500',  2),
  ('Bone Grafting',                              'From £350',    3),
  ('Sinus Lift',                                 'From £450',    4)
) AS item(name, fee, ord)
ON CONFLICT (category_id, name) DO NOTHING;

-- Teeth Whitening
WITH cat AS (
  INSERT INTO fee_categories (name, sort_order) 
  VALUES ('Teeth Whitening', 9) 
  ON CONFLICT (name) DO NOTHING 
  RETURNING id
)
INSERT INTO fee_items (category_id, name, fee, sort_order)
SELECT cat.id, item.name, item.fee, item.ord FROM cat,
(VALUES
  ('Home Whitening Kit (custom trays)',      '£195',  1),
  ('In-Surgery Laser Whitening',            '£350',  2),
  ('Combined Home & Laser Whitening',       '£450',  3),
  ('Top-up Syringes (pack of 2)',           '£45',   4),
  ('Internal Bleaching (per tooth)',        '£95',  5)
) AS item(name, fee, ord)
ON CONFLICT (category_id, name) DO NOTHING;

-- Orthodontics
WITH cat AS (
  INSERT INTO fee_categories (name, sort_order) 
  VALUES ('Orthodontics', 10) 
  ON CONFLICT (name) DO NOTHING 
  RETURNING id
)
INSERT INTO fee_items (category_id, name, fee, sort_order)
SELECT cat.id, item.name, item.fee, item.ord FROM cat,
(VALUES
  ('Orthodontic Consultation',                 'Free',          1),
  ('Clear Aligners (Mild)',                    'From £1,200',   2),
  ('Clear Aligners (Moderate)',                'From £1,800',   3),
  ('Clear Aligners (Comprehensive)',           'From £2,500',   4),
  ('Retainers (per arch)',                     '£95',           5)
) AS item(name, fee, ord)
ON CONFLICT (category_id, name) DO NOTHING;

-- Facial Aesthetics
WITH cat AS (
  INSERT INTO fee_categories (name, sort_order) 
  VALUES ('Facial Aesthetics', 11) 
  ON CONFLICT (name) DO NOTHING 
  RETURNING id
)
INSERT INTO fee_items (category_id, name, fee, sort_order)
SELECT cat.id, item.name, item.fee, item.ord FROM cat,
(VALUES
  ('Anti-wrinkle Injections (1 area)',   '£120',  1),
  ('Anti-wrinkle Injections (2 areas)',  '£175',  2),
  ('Anti-wrinkle Injections (3 areas)',  '£225',  3),
  ('Dermal Fillers (0.5ml)',             '£135',  4),
  ('Dermal Fillers (1.0ml)',             '£195',  5),
  ('Lip Enhancement',                   '£165',  6)
) AS item(name, fee, ord)
ON CONFLICT (category_id, name) DO NOTHING;

-- Special Services
WITH cat AS (
  INSERT INTO fee_categories (name, sort_order) 
  VALUES ('Special Services', 12) 
  ON CONFLICT (name) DO NOTHING 
  RETURNING id
)
INSERT INTO fee_items (category_id, name, fee, sort_order)
SELECT cat.id, item.name, item.fee, item.ord FROM cat,
(VALUES
  ('Mobile Dentistry Call-out',      '£95',   1),
  ('Virtual Consultation',           'Free',  2),
  ('Sports Mouthguard (Custom)',     '£65',   3),
  ('Nightguard (Anti-Bruxism)',      '£95',   4)
) AS item(name, fee, ord)
ON CONFLICT (category_id, name) DO NOTHING;

-- Emergency Services
WITH cat AS (
  INSERT INTO fee_categories (name, sort_order) 
  VALUES ('Emergency Services', 13) 
  ON CONFLICT (name) DO NOTHING 
  RETURNING id
)
INSERT INTO fee_items (category_id, name, fee, sort_order)
SELECT cat.id, item.name, item.fee, item.ord FROM cat,
(VALUES
  ('Day Emergency Appointment',          '£45',                   1),
  ('Evening / Weekend Emergency',        '£75',                   2),
  ('Bank Holiday Emergency',             '£95',                   3),
  ('Prescription Dispensing',            'Included in urgent',    4)
) AS item(name, fee, ord)
ON CONFLICT (category_id, name) DO NOTHING;

-- -------------------------
-- Default Announcement
-- -------------------------
INSERT INTO announcements (title, body, cta_text, cta_url, is_active)
VALUES (
  'Welcome to PavDental',
  'We are now accepting new patients! Book your first consultation today.',
  'Book Now',
  '/booking',
  true
)
ON CONFLICT (title) DO NOTHING;

-- -------------------------
-- Categories
-- -------------------------
INSERT INTO categories (name, slug, description, sort_order, is_active)
VALUES
  ('Teeth Whitening', 'teeth-whitening', 'Professional teeth whitening products', 1, true),
  ('Sonic Care', 'sonic-care', 'Sonic toothbrushes and water flossers', 2, true),
  ('Custom Kits', 'custom-kits', 'Custom dental impression kits', 3, true),
  ('Daily Care', 'daily-care', 'Daily oral care products', 4, true)
ON CONFLICT (slug) DO NOTHING;

-- -------------------------
-- Products
-- -------------------------
WITH cat_whitening AS (SELECT id FROM categories WHERE slug = 'teeth-whitening'),
     cat_sonic AS (SELECT id FROM categories WHERE slug = 'sonic-care'),
     cat_custom AS (SELECT id FROM categories WHERE slug = 'custom-kits'),
     cat_daily AS (SELECT id FROM categories WHERE slug = 'daily-care')
INSERT INTO products (id, name, slug, category, category_label, category_id, price, original_price, rating, reviews_count, short_desc, full_desc, features, how_to_use, badge, in_stock, published)
SELECT
  gen_random_uuid(),
  product_data.name,
  product_data.slug,
  product_data.category,
  product_data.category_label,
  product_data.category_id,
  product_data.price,
  product_data.original_price,
  product_data.rating,
  product_data.reviews_count,
  product_data.short_desc,
  product_data.full_desc,
  product_data.features::jsonb,
  product_data.how_to_use,
  product_data.badge,
  product_data.in_stock,
  product_data.published
FROM (
  -- Teeth Whitening Products
  SELECT
    'PavPro™ Clinical Teeth Whitening System' as name,
    'pavpro-clinical-teeth-whitening-system' as slug,
    'teeth-whitening' as category,
    'Teeth Whitening' as category_label,
    (SELECT id FROM cat_whitening) as category_id,
    49.99 as price,
    65.00 as original_price,
    4.9 as rating,
    342 as reviews_count,
    'Dentist-formulated PAP+ dual-light LED whitening system. Zero tooth sensitivity with up to 8 shades whiter in 7 days.' as short_desc,
    'Designed by our cosmetic clinical team at PavDental, the PavPro™ Whitening System combines non-invasive PAP+ mineral technology with dual-wavelength blue/red LED light to eliminate deep stains without eroding tooth enamel or causing gum sensitivity.' as full_desc,
    '["Wireless LED mouthpiece with red/blue phototherapy", "3x PAP+ active whitening gel precision pens", "Peroxide-free & 100% enamel safe", "Integrated 10-minute auto timer"]'::jsonb as features,
    'Brush teeth thoroughly, apply a thin layer of gel to tooth surfaces, insert the LED mouthpiece, and activate for 10 minutes daily for 7 consecutive days.' as how_to_use,
    'Bestseller' as badge,
    true as in_stock,
    true as published

  UNION ALL

  SELECT
    'LumiBrite™ Enamel-Safe Whitening Strips (14 Treatments)',
    'lumibrite-enamel-safe-whitening-strips',
    'teeth-whitening',
    'Teeth Whitening',
    (SELECT id FROM cat_whitening),
    24.99,
    32.00,
    4.8,
    278,
    'Non-slip dry-fit whitening strips with coconut oil and active PAP for effortless stain removal on the go.',
    'Noticeably whiter teeth in just 30 minutes a day. Designed with anti-slip dry adhesion technology so you can speak and drink water while treating coffee, wine, and smoke discoloration without gel slippage.',
    '["14 upper and 14 lower dry-fit strip treatments", "Enhanced with organic coconut oil for gum conditioning", "Zero hydrogen peroxide sensitivity", "Compact travel-ready sachets"]'::jsonb,
    'Peel strips, apply firmly to upper and lower front teeth, leave for 30 minutes, peel off, and brush away residue.',
    NULL,
    true,
    true

  -- Sonic Care Products
  UNION ALL

  SELECT
    'SonicPulse Pro™ Smart Electric Toothbrush',
    'sonicpulse-pro-smart-electric-toothbrush',
    'sonic-care',
    'Sonic Care',
    (SELECT id FROM cat_sonic),
    69.00,
    89.00,
    4.9,
    218,
    '42,000 vibrations per minute sonic toothbrush with 5 clinical modes and UV sanitizing magnetic travel case.',
    'Engineered for optimal plaque removal along the gumline, SonicPulse Pro delivers acoustic micro-bubbles deep into interdental spaces. Includes an ultraviolet sanitizing charging base that eliminates 99.9% of bacteria on brush heads between uses.',
    '["42,000 VPM acoustic levitation motor", "5 brushing modes: Clean, White, Sensitive, Polish, Gum Care", "60-day battery life on a single USB-C charge", "Includes 3x Dupont antibacterial brush heads"]'::jsonb,
    'Use twice daily for 2 minutes with QuadPacer 30-second interval guidance. Replace brush heads every 3 months.',
    'Clinic Favorite',
    true,
    true

  UNION ALL

  SELECT
    'HydroFlow Cordless Dental Water Flosser',
    'hydroflow-cordless-dental-water-flosser',
    'sonic-care',
    'Sonic Care',
    (SELECT id FROM cat_sonic),
    44.00,
    55.00,
    4.8,
    164,
    'Portable high-pressure oral irrigator with 300ml reservoir, 4 jet tips, and 4 cleansing modes for implants & braces.',
    'Clinically proven to remove up to 99.9% of plaque from treated areas and 50% more effective than string floss for improving gum health. Perfect for orthodontic braces, crowns, veneers, and dental implants.',
    '["1,800 pulses/min targeted pulse frequency", "360° rotating nozzle with 4 interchangeable tips", "IPX7 waterproof for convenient in-shower use", "30-day battery runtime with magnetic fast charging"]'::jsonb,
    'Fill reservoir with lukewarm water, lean over basin, position tip at 90° to gumline, and glide along teeth for 60 seconds.',
    NULL,
    true,
    true

  -- Custom Kits Products
  UNION ALL

  SELECT
    'PavDental Custom Grillz Impression Kit',
    'pavdental-custom-grillz-impression-kit',
    'custom-kits',
    'Custom Kits',
    (SELECT id FROM cat_custom),
    39.00,
    50.00,
    5.0,
    89,
    'Complete at-home dental impression kit with prepaid return postage to our Bradford lab for custom gold & diamond grillz.',
    'Start your custom smile jewellery journey from home. This kit contains medical-grade heavy-body dental putty, universal impression trays, and complete step-by-step instructions. Once returned to our clinic, our principal dental technicians craft your bespoke gold or diamond grillz.',
    '["Medical-grade dental silicone impression putty (upper & lower)", "3 sizes of ergonomic impression trays", "Prepaid Royal Mail 24 Tracked return envelope", "£39 kit cost fully credited toward your finished grillz order"]'::jsonb,
    'Mix putties for 30 seconds, place in tray, firmly bite for 3 minutes, and post back using the included prepaid tracked box.',
    'Exclusive',
    true,
    true

  UNION ALL

  SELECT
    'NightShield™ Custom Bruxism Guard Kit',
    'nightshield-custom-bruxism-guard-kit',
    'custom-kits',
    'Custom Kits',
    (SELECT id FROM cat_custom),
    89.00,
    120.00,
    4.9,
    195,
    'Custom-moulded clinical nightguard made by our dental technicians to prevent teeth grinding, jaw ache, and enamel wear.',
    'Don''t settle for bulky boil-and-bite mouthguards. We take your exact dental impressions and handcraft a slim, durable dual-laminate nightguard that fits comfortably over your teeth, alleviating TMJ tension and preserving tooth structure.',
    '["Custom 2.5mm soft/hard dual laminate acrylic", "Crafted in our registered Bradford dental laboratory", "Includes antibacterial storage case and impression materials", "Free adjustments guaranteed if fit requires fine-tuning"]'::jsonb,
    'Take impression at home, mail to our clinic in prepaid box, receive your custom-moulded nightguard within 7–10 days.',
    'Doctor Recommended',
    true,
    true

  -- Daily Care Products
  UNION ALL

  SELECT
    'Hydroxyapatite Enamel Restore Toothpaste (75ml)',
    'hydroxyapatite-enamel-restore-toothpaste',
    'daily-care',
    'Daily Care',
    (SELECT id FROM cat_daily),
    12.50,
    NULL,
    4.9,
    412,
    'Biomimetic nano-hydroxyapatite toothpaste that remineralises micro-cavities and reverses sensitivity naturally.',
    'Formulated with 10% nano-hydroxyapatite (the natural mineral that makes up 97% of tooth enamel), this fluoride-free toothpaste bonds directly to enamel tubules to seal sensitivity and impart a glossy diamond finish.',
    '["10% medical-grade nano-hydroxyapatite (nHa)", "Zero SLS, parabens, artificial dyes, or harsh abrasives", "Infused with organic British peppermint oil and xylitol", "Safe for porcelain veneers, crowns, and composite bonding"]'::jsonb,
    'Brush twice daily for 2 minutes. Spit excess without rinsing with water to allow active minerals to absorb into enamel.',
    NULL,
    true,
    true

  UNION ALL

  SELECT
    'Aligner & Retainer Antibacterial Cleaning Foam (100ml)',
    'aligner-retainer-antibacterial-cleaning-foam',
    'daily-care',
    'Daily Care',
    (SELECT id FROM cat_daily),
    14.00,
    NULL,
    4.9,
    138,
    'Pump-action sanitizing foam that clears plaque, eliminates 99.9% of bacteria, and gently whitens aligner trays.',
    'Keep your clear aligners, retainers, and mouthguards crystal clear and smelling fresh. Simply pump directly into trays before inserting or use with a soft brush for quick deep cleansing without cloudy residue.',
    '["Kills 99.9% of odor-causing bacteria in 60 seconds", "Maintains clarity of Invisalign & clear aligners", "Subtle fresh mint flavor", "100ml pump bottle lasts up to 60 days"]'::jsonb,
    'Pump one pump of foam directly into clear trays, spread evenly, and wear as normal or rinse with lukewarm water.',
    NULL,
    true,
    true
) AS product_data
ON CONFLICT (slug) DO NOTHING;