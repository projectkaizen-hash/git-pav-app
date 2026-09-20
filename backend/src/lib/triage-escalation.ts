/**
 * Red-Flag Triage Escalation Service
 * 
 * Identifies red-flag symptoms that require emergency dental care
 * and provides location-appropriate emergency instructions.
 * 
 * This service does NOT diagnose - it identifies symptoms that
 * require escalation to emergency services or immediate clinical review.
 */

export interface TriageData {
  chiefComplaint?: string;
  painLevel?: number; // 1-10 scale
  symptoms?: string[];
  duration?: string;
  location?: string; // Postcode or region
  swelling?: boolean;
  bleeding?: boolean;
  fever?: boolean;
  difficultyBreathing?: boolean;
  difficultySwallowing?: boolean;
  traumaHistory?: string;
}

export interface RedFlagResult {
  isRedFlag: boolean;
  flagType?: string;
  emergencyInstructions: string;
  emergencyNumber?: string;
  shouldBlockBooking: boolean;
  reason?: string;
}

/**
 * UK emergency numbers by region
 */
const EMERGENCY_NUMBERS: Record<string, string> = {
  default: "111", // NHS 111
  emergency: "999", // 999 or 112
};

/**
 * Red-flag symptom patterns
 */
const RED_FLAG_PATTERNS = [
  {
    type: "airway_or_breathing",
    symptoms: ["difficulty breathing", "unable to breathe", "choking", "airway"],
    check: (data: TriageData) => data.difficultyBreathing === true,
    emergency: true,
    blockBooking: true,
    instructions: "This appears to be a medical emergency. Call 999 immediately for emergency ambulance services.",
  },
  {
    type: "severe_swelling",
    symptoms: ["swelling", "face swollen", "neck swollen"],
    check: (data: TriageData) => data.swelling === true && (data.painLevel || 0) >= 7,
    emergency: true,
    blockBooking: true,
    instructions: "Severe facial swelling can be life-threatening. Please call NHS 111 on 111 or attend A&E immediately.",
  },
  {
    type: "uncontrolled_bleeding",
    symptoms: ["bleeding", "heavy bleeding", "won't stop"],
    check: (data: TriageData) => data.bleeding === true,
    emergency: true,
    blockBooking: true,
    instructions: "Uncontrolled bleeding requires immediate attention. Please call NHS 111 on 111 or attend A&E.",
  },
  {
    type: "high_fever",
    symptoms: ["fever", "high temperature", "hot"],
    check: (data: TriageData) => data.fever === true && (data.painLevel || 0) >= 8,
    emergency: false,
    blockBooking: true,
    instructions: "High fever with severe pain may indicate infection. Please call NHS 111 on 111 for advice before booking.",
  },
  {
    type: "severe_trauma",
    symptoms: ["trauma", "accident", "injury", "broken tooth", "knocked out"],
    check: (data: TriageData) => {
      const hasTrauma = data.traumaHistory && data.traumaHistory.length > 0;
      const severePain = (data.painLevel || 0) >= 8;
      return hasTrauma && severePain;
    },
    emergency: false,
    blockBooking: true,
    instructions: "Dental trauma may require urgent assessment. Please call NHS 111 on 111 for advice.",
  },
  {
    type: "extreme_pain",
    symptoms: ["extreme pain", "unbearable pain", "worst pain"],
    check: (data: TriageData) => (data.painLevel || 0) >= 9,
    emergency: false,
    blockBooking: false,
    instructions: "Severe pain requires urgent assessment. Please call NHS 111 on 111 for advice. You may still book if advised.",
  },
];

/**
 * Check triage data for red-flag symptoms
 */
export function checkRedFlags(triageData: TriageData): RedFlagResult {
  if (!triageData) {
    return {
      isRedFlag: false,
      emergencyInstructions: "",
      shouldBlockBooking: false,
    };
  }

  // Check each red-flag pattern
  for (const pattern of RED_FLAG_PATTERNS) {
    if (pattern.check(triageData)) {
      const emergencyNumber = pattern.emergency ? EMERGENCY_NUMBERS.emergency : EMERGENCY_NUMBERS.default;

      return {
        isRedFlag: true,
        flagType: pattern.type,
        emergencyInstructions: pattern.instructions,
        emergencyNumber,
        shouldBlockBooking: pattern.blockBooking,
        reason: `Red flag detected: ${pattern.type}`,
      };
    }
  }

  // No red flags
  return {
    isRedFlag: false,
    emergencyInstructions: "",
    shouldBlockBooking: false,
  };
}

/**
 * Get location-appropriate emergency information
 */
export function getEmergencyInfo(location?: string): {
  emergencyNumber: string;
  nhs111Number: string;
  nearestAEDescription: string;
} {
  // In production, this would use postcode to find nearest A&E
  // For now, return UK-wide information
  return {
    emergencyNumber: "999",
    nhs111Number: "111",
    nearestAEDescription: "Use NHS 111 online or call 111 to find your nearest A&E",
  };
}

/**
 * Validate triage data for completeness
 */
export function validateTriageData(triageData: Partial<TriageData>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!triageData.chiefComplaint) {
    errors.push("Chief complaint is required");
  }

  if (triageData.painLevel !== undefined) {
    if (triageData.painLevel < 1 || triageData.painLevel > 10) {
      errors.push("Pain level must be between 1 and 10");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
