import type { Metadata } from "next";
import Link from "next/link";
import { InformationPage, InformationSection } from "@/components/layout/information-page";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return <InformationPage path="/terms" eyebrow="Using KEYRAK" title="Clear expectations for your stay."
    intro="What to expect when making a reservation and using your KEYRAK account.">
    <InformationSection title="Reservations and payments">
      <p>Choosing a payment method, saving a property, or submitting a request is not proof of payment. Credit-card checkout marked as test mode does not make a real charge. Pay-on-arrival reservations are settled with the host at check-in.</p>
    </InformationSection>
    <InformationSection title="Booking requests and cancellation">
      <p>A submitted reservation starts as pending and must be reviewed before confirmation. Pending reservations can be cancelled from your profile. A cancellation request on a confirmed booking requires an administrator’s decision; sending the request alone does not cancel the trip.</p>
      <p>Check property details, prices, dates, and status before submitting a booking. Contact support about payment or cancellation questions for your reservation.</p>
    </InformationSection>
    <InformationSection title="Accounts and community content">
      <p>Keep your account details accurate and use only content you have permission to submit. Reviews must reflect your own experience; the app requires a confirmed reservation whose check-in date has arrived before allowing a review.</p>
      <p>Do not post private identity information, abusive content, or misleading property details. AI-generated suggestions and descriptions should be checked against the actual listing information.</p>
    </InformationSection>
    <InformationSection title="Questions about your stay">
      <p>Check your reservation in your profile or visit the <Link href="/contact">contact page</Link> for help. Include your booking reference when asking about a specific stay.</p>
    </InformationSection>
  </InformationPage>;
}
