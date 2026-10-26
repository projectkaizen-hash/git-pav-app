# Mobile App Store Listing & Metadata Specification (RB-10)

**App Name:** Pav Dental — Mobile & Clinic Care  
**Bundle ID (iOS):** `com.pavdental.app`  
**Package Name (Android):** `com.pavdental.app`  
**Target Category:** Medical  
**Age Rating:** 17+ (Medical / Treatment Information)  
**Primary Language:** English (UK)

---

## 1. Store Copy & Descriptions

### Short Description (Google Play — max 80 chars)
Private dental care at our clinics, mobile dental vans, or via video consults.

### Subtitle (Apple App Store — max 30 chars)
Dental Care & Mobile Vans

### Full Description (Apple App Store & Google Play)
Welcome to Pav Dental — private oral healthcare across the UK with in-clinic appointments, mobile dental van visits to your home or workplace, and tele-dentistry video consultations.

Whether you need a routine dental examination, emergency triage advice, hygiene appointments, or ongoing dental treatment, Pav Dental connects you with General Dental Council (GDC) registered dentists and clinical teams directly from your smartphone.

KEY FEATURES:
• Comprehensive Booking: Choose from in-person clinic appointments, mobile dental van visits, or tele-dentistry video consultations.
• Digital Odontogram: View your interactive 32-tooth dental records and charted conditions recorded by your clinician.
• Treatment Estimates & Clear Pricing: Transparent, itemised treatment estimates. Review and acknowledge treatment plans with clear deposit and visit balance amounts.
• Secure Document Vault: Access your treatment documents, diagnostic records, and signed consents streamed via encrypted access.
• Mobile Dental Van Tracking: Track your scheduled dental van on shift with live arrival updates.
• Private Prescriptions: View private prescription references and official PDF copies issued by your dentist for dispensing at your pharmacy.
• Biometric Account Security: Protect your health and consultation records with Face ID, Touch ID, or device passcode.
• Oral Health Habits & Perks: Log your daily brushing sessions, view recall advice, and earn perk vouchers toward your dental visits.

Clinical care you can trust: All procedures and consultations are delivered exclusively by UK GDC-registered dental practitioners.

---

## 2. Required Device Permissions & User Rationale

| Platform | Permission | Rationale Displayed to User | Mandatory / Optional |
|---|---|---|---|
| iOS & Android | **Camera** (`NSCameraUsageDescription`, `CAMERA`) | "Pav Dental uses the camera so you can take photos of your teeth to send to your dentist." | Optional (prompted upon first photo capture during video triage) |
| iOS & Android | **Photo Library** (`NSPhotoLibraryUsageDescription`, `READ_MEDIA_IMAGES`) | "Pav Dental needs photo library access so you can attach dental photos and clinical documents." | Optional |
| iOS & Android | **Location (When In Use)** (`NSLocationWhenInUseUsageDescription`, `ACCESS_FINE_LOCATION`) | "Allow Pav Dental to use your location to share the mobile dental van's live position with patients and navigate to visit addresses." | Optional (used for service area check and patient dispatch) |
| iOS & Android | **Location (Background / Shifts)** (`NSLocationAlwaysAndWhenInUseUsageDescription`, `ACCESS_BACKGROUND_LOCATION`) | "During a van shift, Pav Dental shares the van's position with that day's patients even when the app is in the background, so their arrival times stay accurate. It stops when you end your shift." | Optional (Operator role during active shifts only) |
| iOS & Android | **Face ID / Biometrics** (`NSFaceIDUsageDescription`, `USE_BIOMETRIC`) | "Use Face ID to unlock your Pav Dental account" | Optional (biometric app lock) |
| iOS & Android | **Push Notifications** (`POST_NOTIFICATIONS`) | "Receive timely appointment reminders, van arrival alerts, and care team messages." | Optional |
| iOS & Android | **Microphone** | *Not requested.* Video consultations open in the phone's web browser (`Daily.co`). | None (permission removed) |

---

## 3. App Privacy Declarations & Nutrition Labels

### Apple App Store Privacy Details
1. **Health & Medical Data:**
   - *Clinical Health Records:* Odontogram chart, medical history questionnaires, prescriptions, and triage intake photos. Linked to user identity for clinical care delivery.
2. **Contact Info:**
   - *Name, Email Address, Phone Number, Postal Address:* Linked to user identity for account management, appointment confirmation, and domiciliary van dispatch.
3. **Financial Info:**
   - *Payment Details:* Handled securely by the Stripe SDK. Only payment methods (card brand, last 4 digits) and deposit transaction receipts are stored.
4. **Location Data:**
   - *Precise Location:* Collected during active van shifts for van tracking. For patients, used strictly on-device to check postcode service area.
5. **Diagnostics & Usage:**
   - *Crash logs and error diagnostics:* Handled via Sentry with strict PII scrubbing (all emails, names, postcodes, and record identifiers stripped before sending).

*Tracking Declaration:* Pav Dental **does not** track users across third-party apps or websites for targeted advertising.

---

## 4. Google Play Data Safety Declaration

- **Data encryption in transit:** All data is encrypted in transit over HTTPS (TLS 1.3).
- **Data deletion requests:** Users can request account deletion and export their data directly in the app under Profile > Account Security > Delete Account or Export Records.
- **Third-party processors:**
  - Stripe (payments)
  - Postmark (transactional email)
  - Twilio (SMS verification codes)
  - Sentry (scrubbed error tracking)
  - Expo Push / APNs / FCM (notifications)

---

## 5. Test Account for App Review

- **Email:** `app-review-tester@pavdental.com`
- **Password:** [Ephemeral secure reviewer credential configured in App Store Connect / Play Console notes]
- **Role:** Patient
- **Reviewer Notes:** Includes explanation of mobile van dispatch, video triage flow, and clinical practitioner oversight.
