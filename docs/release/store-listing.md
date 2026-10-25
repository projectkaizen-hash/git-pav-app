# Mobile App Store Listing & Metadata Specification

**App Name:** Pav Dental — Mobile & Clinic Care  
**Bundle ID (iOS):** `com.pavdental.app`  
**Package Name (Android):** `com.pavdental.app`  
**Target Category:** Medical  
**Age Rating:** 17+ (Medical / Treatment Information)  
**Primary Language:** English (UK)

---

## 1. Store Copy & Descriptions

### Short Description (Google Play — max 80 chars)
Expert dental care at our clinics, mobile dental vans, or via video consults.

### Subtitle (Apple App Store — max 30 chars)
Premier Mobile Dental Care

### Full Description (Apple App Store & Google Play)
Welcome to Pav Dental — transforming oral healthcare across the UK with seamless in-clinic appointments, mobile dental van visits to your home or office, and on-demand tele-dentistry video consultations.

Whether you need a routine check-up, emergency dental triage, professional hygiene scaling, or advanced cosmetic treatments, Pav Dental connects you with General Dental Council (GDC) registered dentists and clinical specialists right from your smartphone.

KEY FEATURES:
• Comprehensive Booking: Choose from in-person clinic appointments, state-of-the-art mobile dental van visits to your doorstep, or live video consultations.
• Digital Odontogram & Charts: View your comprehensive 32-tooth dental records, restoration histories, and periodontal health charts in real time.
• Treatment Estimates & Plans: Transparent, itemised treatment estimates. Review and digitally sign treatment plans with 0% APR financing options via our healthcare finance partners.
• Secure Document Vault: Access your digital X-rays, diagnostic radiographs, signed consents, and VAT invoices whenever you need them.
• Live Mobile Van Tracking: Track your assigned dental van in real time with precise arrival windows and driver contact.
• GDC-Certified Electronic Prescriptions: Receive digitally signed electronic prescriptions sent straight to your chosen local pharmacy.
• Biometric Security: Bank-grade biometric authentication (Face ID, Touch ID, or Device Passcode) protects your sensitive dental and medical records.
• Oral Health Rewards: Log your daily brushing sessions, earn health perks, and redeem vouchers toward your dental visits.

Clinical care you can trust: All procedures and consultations are delivered exclusively by UK GDC-registered dental practitioners adhering to strict Care Quality Commission (CQC) standards.

---

## 2. Required Device Permissions & User Rationale

| Platform | Permission | Rationale Displayed to User | Mandatory / Optional |
|---|---|---|---|
| iOS & Android | **Camera** (`NSCameraUsageDescription`, `CAMERA`) | "Pav Dental requires camera access so you can photograph affected teeth or gums during dental triage and participate in video consultations." | Optional (prompted upon first photo or video call) |
| iOS & Android | **Microphone** (`NSMicrophoneUsageDescription`, `RECORD_AUDIO`) | "Pav Dental requires microphone access to allow you to speak with your dentist during virtual tele-dentistry consultations." | Optional (prompted on video call start) |
| iOS & Android | **Photo Library** (`NSPhotoLibraryUsageDescription`, `READ_MEDIA_IMAGES`) | "Used to upload existing dental X-rays or photographs of dental concerns to your encrypted record." | Optional |
| iOS & Android | **Location** (`NSLocationWhenInUseUsageDescription`, `ACCESS_FINE_LOCATION`) | "Your location is used to verify that your address is within our mobile dental van service area and to coordinate van arrival." | Optional |
| iOS & Android | **Face ID / Biometrics** (`NSFaceIDUsageDescription`, `USE_BIOMETRIC`) | "Authenticate securely to protect your confidential dental health records and treatment history." | Optional |
| iOS & Android | **Push Notifications** (`POST_NOTIFICATIONS`) | "Receive timely appointment reminders, van arrival alerts, and messaging replies from your care team." | Optional |

---

## 3. App Privacy Declarations (Nutrition Labels)

### Apple App Privacy Categories
1. **Health & Fitness:**
   - *Clinical Health Data:* Collected and linked to the user's identity. Used strictly for app functionality and healthcare delivery.
2. **Contact Info:**
   - *Name, Email Address, Phone Number, Physical Address:* Linked to user identity for account management, service dispatch, and communication.
3. **Financial Info:**
   - *Payment Info:* Payment tokens handled via Stripe SDK. Linked to user identity for transaction processing.
4. **Location:**
   - *Coarse & Precise Location:* Linked to user identity for van dispatch and coverage validation. Not used for tracking or advertising.
5. **Identifiers:**
   - *User ID, Device ID:* Used for session management and error diagnostics.

*Tracking Declaration:* Pav Dental **does not** track users across third-party websites or apps for targeted advertising.

---

## 4. Test Account for App Review

- **Username / Email:** `app-review-tester@pavdental.com`
- **Password:** [Generated ephemeral credential configured in App Store Connect]
- **Role:** Patient
- **Seeded Data:** Contains non-production synthetic profile with 1 confirmed sample appointment and 1 sample digital odontogram.
