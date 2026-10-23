import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Calendar, Clock, CheckCircle, Shield, User, Mail, Phone, Stethoscope, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

const SERVICES = [
  "Routine Dental Examination",
  "Hygiene & Airflow Stain Removal",
  "Teeth Whitening (Home / Laser)",
  "Emergency Dental Consultation",
  "Cosmetic Smile Makeover",
  "Clear Aligners / Orthodontics",
  "Dental Implants",
  "Root Canal Treatment",
  "Tooth Extraction",
  "Dentures",
  "Facial Aesthetics",
  "Custom Grillz",
  "Mobile Dentistry Call-out",
  "Virtual Consultation",
];

export function BookingPageContent() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState(SERVICES[0]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("Morning (9am - 12pm)");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !service) {
      toast.error("Please fill in your name, email, and treatment requested.");
      return;
    }

    setSubmitting(true);
    try {
      await api.forms.submitBooking({
        patient_name: name,
        patient_email: email,
        patient_phone: phone,
        service_type: service,
        preferred_date: date || undefined,
        preferred_time: time,
        message: message || undefined,
      });

      setSubmitted(true);
      toast.success("Appointment request submitted successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit booking");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="py-12 sm:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="size-3.5" /> Direct Clinical Booking
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-bold text-[#844d1e] tracking-tight">
            Book Your Dental Visit
          </h1>
          <p className="mt-3 text-base sm:text-lg text-muted">
            Request an appointment with our GDC-registered dental team in Bradford. We offer routine check-ups, cosmetic consultations, and same-day emergency slots.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-2xl border border-border bg-white p-8 sm:p-12 text-center shadow-sm max-w-xl mx-auto animate-in fade-in zoom-in-95">
            <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="size-9" />
            </div>
            <h3 className="font-display text-2xl font-bold text-fg">Appointment Request Received</h3>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Thank you, <strong className="text-fg">{name}</strong>! Our reception team has received your booking request for{" "}
              <strong className="text-fg">{service}</strong>. We will contact you at <strong className="text-fg">{email}</strong> or via phone to confirm your exact appointment slot.
            </p>
            <div className="mt-6 pt-6 border-t flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button onClick={() => setSubmitted(false)} variant="outline">
                Book Another Appointment
              </Button>
              <Button asChild className="bg-primary text-white">
                <a href="/">Return to Homepage</a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form */}
            <div className="lg:col-span-8 rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-fg">Full Name *</label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Smith"
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-fg">Email Address *</label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-fg">Phone Number</label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+44 7123 456789"
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-fg">Treatment / Service *</label>
                    <div className="relative mt-1">
                      <select
                        value={service}
                        onChange={(e) => setService(e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {SERVICES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-fg">Preferred Date</label>
                    <div className="relative mt-1">
                      <Input
                        type="date"
                        min={format(new Date(), "yyyy-MM-dd")}
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-fg">Preferred Time Window</label>
                    <select
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="Morning (9am - 12pm)">Morning (9am - 12pm)</option>
                      <option value="Afternoon (12pm - 3pm)">Afternoon (12pm - 3pm)</option>
                      <option value="Evening (3pm - 6pm)">Evening (3pm - 6pm)</option>
                      <option value="Emergency (Same Day / ASAP)">Emergency (Same Day / ASAP)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-fg">Additional Notes or Dental History (Optional)</label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us about any toothache, symptoms, or specific cosmetic goals..."
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="consent"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 rounded border-border"
                    required
                  />
                  <label htmlFor="consent" className="text-xs text-muted leading-tight">
                    I consent to PavDental storing my contact details to process this appointment request in accordance with GDC patient privacy standards.
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 text-base font-semibold accent-gradient text-white rounded-xl shadow-md mt-2"
                >
                  {submitting ? "Submitting Request..." : "Request Appointment"}
                </Button>
              </form>
            </div>

            {/* Clinic Info Sidebar */}
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-2xl border border-border bg-[#faf7f2] p-6 space-y-4">
                <h4 className="font-display font-bold text-lg text-[#844d1e]">Why PavDental?</h4>
                <div className="space-y-3 text-xs text-muted leading-relaxed">
                  <div className="flex items-start gap-2.5">
                    <Shield className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>GDC Registered dentists & cosmetic clinicians</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Clock className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>Same-day emergency dental relief available 7 days a week</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Stethoscope className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>Transparent pricing with complete check-up from £35</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-white p-6 space-y-2">
                <p className="text-xs font-semibold text-fg">Direct Reception Line</p>
                <p className="text-base font-bold text-primary font-display">01274 543 210</p>
                <p className="text-xs text-muted">Monday - Saturday, 8:30am - 6:00pm</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

