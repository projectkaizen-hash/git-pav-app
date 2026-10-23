export interface Signature {
  id: string;
  name: string;
  location?: string;
  date: string;
  timestamp: number;
  comment?: string;
}

export const INITIAL_SIGNATURES: Signature[] = [
  { id: "s1", name: "Sarah Jenkins", location: "Bradford BD3", date: "10 mins ago", timestamp: Date.now() - 10 * 60 * 1000 },
  { id: "s2", name: "David Miller", location: "Leeds LS1", date: "14 mins ago", timestamp: Date.now() - 14 * 60 * 1000 },
  { id: "s3", name: "Claire Davies", location: "Bradford BD7", date: "32 mins ago", timestamp: Date.now() - 32 * 60 * 1000 },
  { id: "s4", name: "Mohammed Tariq", location: "Bradford BD8", date: "45 mins ago", timestamp: Date.now() - 45 * 60 * 1000 },
  { id: "s5", name: "Priya Sharma", location: "Bradford BD5", date: "1 hour ago", timestamp: Date.now() - 60 * 60 * 1000 },
  { id: "s6", name: "Linda Bradley", location: "Bradford BD3", date: "1 hour ago", timestamp: Date.now() - 75 * 60 * 1000, comment: "Waited 3 years for an appointment. Something must change." },
  { id: "s7", name: "Matthew Hopkins", location: "Shipley BD18", date: "2 hours ago", timestamp: Date.now() - 120 * 60 * 1000 },
  { id: "s8", name: "Amina Hussain", location: "Bradford BD9", date: "2 hours ago", timestamp: Date.now() - 135 * 60 * 1000 },
  { id: "s9", name: "Robert Ellis", location: "Keighley BD21", date: "3 hours ago", timestamp: Date.now() - 180 * 60 * 1000 },
  { id: "s10", name: "Nasir Ahmed", location: "Bradford BD3", date: "3 hours ago", timestamp: Date.now() - 210 * 60 * 1000 },
  { id: "s11", name: "Jessica Ward", location: "Bingley BD16", date: "4 hours ago", timestamp: Date.now() - 240 * 60 * 1000 },
  { id: "s12", name: "Paul Foster", location: "Bradford BD4", date: "5 hours ago", timestamp: Date.now() - 300 * 60 * 1000 },
  { id: "s13", name: "Fatima Farooq", location: "Bradford BD7", date: "6 hours ago", timestamp: Date.now() - 360 * 60 * 1000 },
  { id: "s14", name: "Richard Pearson", location: "Pudsey LS28", date: "7 hours ago", timestamp: Date.now() - 420 * 60 * 1000 },
  { id: "s15", name: "Khadija Begum", location: "Bradford BD8", date: "8 hours ago", timestamp: Date.now() - 480 * 60 * 1000 },
  { id: "s16", name: "Oliver Higgins", location: "Bradford BD2", date: "10 hours ago", timestamp: Date.now() - 600 * 60 * 1000 },
  { id: "s17", name: "Emma Thornton", location: "Ilkley LS29", date: "12 hours ago", timestamp: Date.now() - 720 * 60 * 1000 },
  { id: "s18", name: "Ismail Qureshi", location: "Bradford BD3", date: "14 hours ago", timestamp: Date.now() - 840 * 60 * 1000 },
  { id: "s19", name: "Hannah Cooper", location: "Leeds LS12", date: "16 hours ago", timestamp: Date.now() - 960 * 60 * 1000 },
  { id: "s20", name: "Christopher Booth", location: "Bradford BD10", date: "18 hours ago", timestamp: Date.now() - 1080 * 60 * 1000 },
  { id: "s21", name: "Zainab Ali", location: "Bradford BD5", date: "20 hours ago", timestamp: Date.now() - 1200 * 60 * 1000 },
  { id: "s22", name: "Daniel Wright", location: "Bradford BD6", date: "22 hours ago", timestamp: Date.now() - 1320 * 60 * 1000 },
  { id: "s23", name: "Sultana Begum", location: "Bradford BD3", date: "Yesterday", timestamp: Date.now() - 24 * 60 * 60 * 1000 },
  { id: "s24", name: "Gary Robinson", location: "Halifax HX1", date: "Yesterday", timestamp: Date.now() - 26 * 60 * 60 * 1000 },
  { id: "s25", name: "Farhan Saeed", location: "Bradford BD9", date: "Yesterday", timestamp: Date.now() - 28 * 60 * 60 * 1000 },
  { id: "s26", name: "Rachel Greenwood", location: "Cleckheaton BD19", date: "Yesterday", timestamp: Date.now() - 30 * 60 * 60 * 1000 },
  { id: "s27", name: "Simon Wood", location: "Bradford BD1", date: "2 days ago", timestamp: Date.now() - 48 * 60 * 60 * 1000 },
  { id: "s28", name: "Tariq Mahmood", location: "Bradford BD3", date: "2 days ago", timestamp: Date.now() - 50 * 60 * 60 * 1000 },
  { id: "s29", name: "Gillian Yates", location: "Baildon BD17", date: "2 days ago", timestamp: Date.now() - 54 * 60 * 60 * 1000 },
  { id: "s30", name: "Aisha Patel", location: "Bradford BD7", date: "3 days ago", timestamp: Date.now() - 72 * 60 * 60 * 1000 },
  { id: "s31", name: "Marcus Fletcher", location: "Bradford BD12", date: "3 days ago", timestamp: Date.now() - 75 * 60 * 60 * 1000 },
  { id: "s32", name: "Yasmin Akhtar", location: "Bradford BD8", date: "3 days ago", timestamp: Date.now() - 80 * 60 * 60 * 1000 },
];

export const PETITION_GOAL = 5000;
export const CURRENT_SIGNATURES_BASE = 2418;

