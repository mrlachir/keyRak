import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { InformationPage, InformationSection } from "@/components/layout/information-page";
import { supportDetails } from "@/lib/support";

export const metadata: Metadata = { title: "Contact" };
// Read public support configuration at runtime, not during the Docker image build.
export const dynamic = "force-dynamic";

export default function ContactPage() {
  const { email, phone } = supportDetails();
  return <InformationPage path="/contact" eyebrow="Let’s talk" title="A little help with your stay."
    intro="Questions about a reservation or something on the site? Start with the details below.">
    <InformationSection title="Your reservation, in one place">
      <p>Visit <Link href="/profile">your profile</Link> to check your booking status, update your name and telephone, or manage your ID document. Pending reservations can be cancelled directly; confirmed reservations require a cancellation request for admin review.</p>
      <p>When contacting support, include your booking reference, property name, and travel dates. Do not send card details or ID documents by email.</p>
    </InformationSection>
    <InformationSection title="Contact the team">
      {email || phone ? <div className="flex flex-wrap gap-6">
        {email && <a className="inline-flex min-h-11 items-center gap-2 break-all" href={`mailto:${email}`}><Mail className="size-5 shrink-0" aria-hidden="true" />{email}</a>}
        {phone && <a className="inline-flex min-h-11 items-center gap-2" href={`tel:${phone.replace(/[ ()-]/g, "")}`}><Phone className="size-5 shrink-0" aria-hidden="true" />{phone}</a>}
      </div> : <p>Support contact details are not available yet. You can still manage reservations and cancellation requests from your profile.</p>}
    </InformationSection>
    <InformationSection title="Report a problem">
      <p>Tell the administrator which page you were on, what you expected, and what happened. A screenshot with personal information hidden can help explain a display issue.</p>
    </InformationSection>
  </InformationPage>;
}
