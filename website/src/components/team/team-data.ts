export interface Doctor {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  credential: string;
  tags: string[];
  photo: string;
  deskPhoto: string;
  bio: string;
  yearsInPractice: number;
  rating: string;
  ratingSource: string;
  ratingUrl: string;
  affiliations: string[];
  born: string;
  languages: string[];
}

export const DOCTORS: Doctor[] = [
  {
    id: "hassan-bhojani",
    name: "Dr. Hassan Bhojani, BDS",
    firstName: "Hassan",
    lastName: "Bhojani",
    credential: "BDS",
    tags: ["CLINICAL DIRECTOR", "IMPLANTOLOGY", "ORAL SURGERY"],
    photo: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=1000&q=85&crop=faces",
    deskPhoto: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=85",
    bio: "Clinical Director and Principal Dental Surgeon with dual fellowships in surgical implantology and advanced biomaterials. Educated at King's College London with post-graduate surgical training in immediate full-arch oral rehabilitation. Registered with the General Dental Council (GDC). Fluent in English and Urdu.",
    yearsInPractice: 18,
    rating: "5.0",
    ratingSource: "Google Reviews",
    ratingUrl: "https://www.google.com/maps",
    affiliations: ["General Dental Council", "British Dental Association", "Association of Dental Implantology"],
    born: "London, United Kingdom",
    languages: ["English", "Urdu"],
  },
  {
    id: "tariq-pav",
    name: "Dr. Tariq Pav, BDS",
    firstName: "Tariq",
    lastName: "Pav",
    credential: "BDS",
    tags: ["IMPLANT SURGEON", "RESTORATIVE DENTISTRY"],
    photo: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=1000&q=85&crop=faces",
    deskPhoto: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=1200&q=85",
    bio: "Senior Implant Surgeon with over 14 years clinical experience across London teaching hospitals and private surgeries. Leads complex restorative treatment planning, bone grafting, and sedation dentistry. Registered with the General Dental Council (GDC). Fluent in English and Arabic.",
    yearsInPractice: 14,
    rating: "4.9",
    ratingSource: "Google Reviews",
    ratingUrl: "https://www.google.com/maps",
    affiliations: ["General Dental Council", "British Dental Association", "Society for the Advancement of Anaesthesia in Dentistry"],
    born: "Leeds, United Kingdom",
    languages: ["English", "Arabic"],
  },
  {
    id: "amara-okafor",
    name: "Dr. Amara Okafor, BDS, MFDS RCS",
    firstName: "Amara",
    lastName: "Okafor",
    credential: "BDS, MFDS RCS",
    tags: ["PAEDIATRIC CARE", "PREVENTIVE DENTISTRY"],
    photo: "https://images.unsplash.com/photo-1584467735815-f778f274e296?auto=format&fit=crop&w=1000&q=85&crop=faces",
    deskPhoto: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=85",
    bio: "Paediatric and preventive dental surgeon dedicated to stress-free dental habits and comprehensive child oral health. Membership of the Faculty of Dental Surgery, Royal College of Surgeons. Registered with the General Dental Council (GDC). Fluent in English.",
    yearsInPractice: 10,
    rating: "5.0",
    ratingSource: "Doctify",
    ratingUrl: "https://www.doctify.com",
    affiliations: ["General Dental Council", "British Society of Paediatric Dentistry", "Royal College of Surgeons"],
    born: "Edinburgh, Scotland",
    languages: ["English"],
  },
  {
    id: "sophia-chen",
    name: "Dr. Sophia Chen, BDS, MJDF RCS",
    firstName: "Sophia",
    lastName: "Chen",
    credential: "BDS, MJDF RCS",
    tags: ["ENDODONTICS", "MICROSURGICAL CARE"],
    photo: "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&w=1000&q=85&crop=faces",
    deskPhoto: "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=1200&q=85",
    bio: "Specialist in microscopic endodontics and complex tooth preservation. Dedicated to minimally invasive root canal therapy using high-magnification surgical operating microscopes. Registered with the General Dental Council (GDC). Fluent in English and Mandarin.",
    yearsInPractice: 9,
    rating: "4.9",
    ratingSource: "Doctify",
    ratingUrl: "https://www.doctify.com",
    affiliations: ["General Dental Council", "British Endodontic Society", "Royal College of Surgeons"],
    born: "London, United Kingdom",
    languages: ["English", "Mandarin"],
  },
];

