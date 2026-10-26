import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/home/header";
import { Footer } from "@/components/home/footer";
import { ScrollProgress } from "@/components/home/scroll-progress";

export const Route = createFileRoute("/privacy")({ component: PrivacyPolicyPage });

function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#fffdf9] text-fg">
      <ScrollProgress />
      <Header />

      <div className="pt-24 pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Legal & Compliance
            </span>
            <h1 className="mt-4 font-serif text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Patient Privacy Notice
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Last updated: 26 October 2026 • Effective date: 26 October 2026
            </p>
          </div>

          <div className="prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
              <h2 className="font-serif text-xl font-semibold text-slate-900">1. Data Controller Information</h2>
              <p className="mt-3 text-sm">
                Pav Dental ("we", "us", "our") is the data controller responsible for your personal information.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                <li><strong>Practice Address:</strong> 786 Leeds Road, Bradford, BD3 9TY, United Kingdom</li>
                <li><strong>Telephone:</strong> 0800 1938 786 / +44 7311 871456</li>
                <li><strong>Email:</strong> <a href="mailto:hello@pavdental.com" className="text-emerald-700 underline">hello@pavdental.com</a></li>
                <li><strong>Data Protection Officer (DPO):</strong> <a href="mailto:dpo@pavdental.com" className="text-emerald-700 underline">dpo@pavdental.com</a></li>
                <li><strong>Clinical Lead:</strong> Dr Hassan Bhojani (GDC #262970)</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
              <h2 className="font-serif text-xl font-semibold text-slate-900">2. Information We Collect</h2>
              <p className="mt-3 text-sm">
                To provide safe, comprehensive dental treatment and appointment scheduling, we process the following categories of information:
              </p>
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <h3 className="font-semibold text-slate-900">Personal & Contact Details</h3>
                  <p className="text-slate-600">Full name, date of birth, biological sex, contact address, email address, mobile telephone number, and emergency contact details.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Special Category Health & Clinical Data</h3>
                  <p className="text-slate-600">Medical history (medications, allergies, systemic conditions), dental charts (odontograms), treatment plans, clinical notes, intraoral photographs, digital radiographs (X-rays), and signed prescriptions.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Dependants</h3>
                  <p className="text-slate-600">Details of children under 16 booked by their parent or legal guardian for paediatric dental care.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Payment & Transaction Data</h3>
                  <p className="text-slate-600">Payment card tokens, transaction amounts, and deposit receipts. Full payment card numbers are processed directly by our PCI-DSS Level 1 payment processor (Stripe) and are never stored on our servers.</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
              <h2 className="font-serif text-xl font-semibold text-slate-900">3. Lawful Basis for Processing</h2>
              <p className="mt-3 text-sm">
                Under the UK General Data Protection Regulation (UK GDPR) and Data Protection Act 2018:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
                <li><strong>Contractual Necessity (Article 6(1)(b)):</strong> To manage your patient account, schedule appointments, process deposits, and communicate essential appointment alerts.</li>
                <li><strong>Provision of Healthcare & Medical Diagnosis (Article 9(2)(h)):</strong> To assess oral health, formulate treatment plans, take radiographs, and deliver dental care.</li>
                <li><strong>Legal Obligation (Article 6(1)(c)):</strong> To maintain clinical dental records in compliance with General Dental Council (GDC) standards and healthcare record-keeping regulations.</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
              <h2 className="font-serif text-xl font-semibold text-slate-900">4. Third-Party Processors & Data Sharing</h2>
              <p className="mt-3 text-sm">
                We never sell, rent, or trade your personal data. We work with vetted processors operating under strict data protection agreements:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
                <li><strong>Stripe:</strong> Secure online deposit payment handling and card vaulting.</li>
                <li><strong>Daily.co:</strong> Encrypted WebRTC virtual dental consultation video streams.</li>
                <li><strong>Twilio & Postmark:</strong> Delivering transactional verification codes and appointment notifications.</li>
                <li><strong>Cloud Infrastructure:</strong> High-availability application servers and encrypted databases (Frankfurt & London regions) with automated backups and audit logging.</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
              <h2 className="font-serif text-xl font-semibold text-slate-900">5. Retention Periods</h2>
              <p className="mt-3 text-sm">
                In compliance with GDC Standards and the NHS Records Management Code of Practice:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
                <li><strong>Adult Patients:</strong> Clinical notes, odontograms, radiographs, and prescriptions are retained for a minimum of <strong>11 years</strong> after your last treatment.</li>
                <li><strong>Children & Young Persons:</strong> Records are retained until the patient's 25th birthday, or 11 years after the last treatment (whichever is longer).</li>
                <li><strong>Financial & Transaction Records:</strong> Invoices and transaction logs are held for 6 years in accordance with UK statutory tax requirements.</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
              <h2 className="font-serif text-xl font-semibold text-slate-900">6. Your Rights</h2>
              <p className="mt-3 text-sm">
                You have statutory rights under UK data protection law:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
                <li><strong>Right of Access:</strong> You can request a copy of your personal and clinical records (Subject Access Request) free of charge.</li>
                <li><strong>Right to Rectification:</strong> You can ask us to correct inaccurate contact details or clinical records.</li>
                <li><strong>Right to Erasure:</strong> You can request account closure and deletion of non-clinical data. (Note: Statutory regulations require clinical records to be retained for the minimum 11-year retention period).</li>
                <li><strong>Complaints:</strong> If you are unhappy with how we have handled your data, you can contact our DPO at <a href="mailto:dpo@pavdental.com" className="text-emerald-700 underline">dpo@pavdental.com</a> or lodge a complaint with the UK Information Commissioner's Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline">ico.org.uk</a>.</li>
              </ul>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
