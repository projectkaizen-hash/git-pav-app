// Only facts the practice has confirmed go here (V-03). Leave a field out
// rather than guess it: the profile hides anything that isn't set.
export interface Doctor {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  /** Qualifications after the name, e.g. "BDS". */
  credential?: string;
  /** One line under the name, e.g. "Dentist" or "Visiting implantologist". */
  role: string;
  gdcNumber: string;
  tags: string[];
  photo: string;
  deskPhoto?: string;
  bio: string;
  yearsInPractice?: number;
  rating?: string;
  ratingSource?: string;
  ratingUrl?: string;
  affiliations?: string[];
  born?: string;
  languages?: string[];
}

/** Shown until the practice sends real photos. */
export const PHOTO_PENDING = "/media/team-photo-pending.svg";

export const DOCTORS: Doctor[] = [
  {
    id: "hassan-bhojani",
    name: "Dr Hassan Bhojani",
    firstName: "Hassan",
    lastName: "Bhojani",
    role: "Dentist",
    gdcNumber: "262970",
    tags: ["RESTORATIVE DENTISTRY", "URGENT DENTAL CARE", "ORAL SURGERY"],
    photo: PHOTO_PENDING,
    bio: "Cancer survivor and highly skilled dentist with advanced training in restorative and aesthetic procedures. Resilient, reliable, and responsible professional with extensive experience in urgent dental care, oral surgery, restorative dentistry, and practice leadership. Committed to delivering outstanding patient care while continuously striving to improve the dental experience for both patients and practitioners.",
  },
  {
    id: "cosimo-meucci",
    name: "Dr Cosimo Meucci",
    firstName: "Cosimo",
    lastName: "Meucci",
    role: "Visiting implantologist",
    gdcNumber: "280128",
    tags: ["DENTAL IMPLANTS", "BONE GRAFTING", "FULL-MOUTH REHABILITATION"],
    photo: PHOTO_PENDING,
    bio: "Dr Cosimo Meucci is Pav Dental’s visiting implantologist, providing patients with advanced dental implant care and surgical expertise. With extensive experience in implant placement, bone grafting, and full-mouth rehabilitation, Dr Meucci combines surgical precision with a patient-focused approach to achieve long-lasting, natural results.",
  },
];
