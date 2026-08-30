import type { Metadata } from "next";
import Link from "next/link";
import { InformationPage, InformationSection } from "@/components/layout/information-page";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return <InformationPage path="/privacy" eyebrow="Your information" title="Privacy, explained simply."
    intro="The information used by KEYRAK, how it supports your stay, and the choices available in your account.">
    <InformationSection title="Account and reservation information">
      <p>Google sign-in supplies account identifiers, your name, email, and profile image. Your profile also stores your telephone number and, if uploaded, a government ID document. Reservations store dates, guest counts, special requests, payment-method selection, and booking status.</p>
      <p>Government ID files are stored separately from public property media and are not served as public uploads.</p>
    </InformationSection>
    <InformationSection title="Saved stays, reviews, and notifications">
      <p>Your wishlist is associated with your account and is not published as a public collection. Submitted reviews display your profile name, rating, comment, and available avatar on the property page. A new review creates an alert for each administrator.</p>
    </InformationSection>
    <InformationSection title="Service providers and browser storage">
      <p>Authentication uses Google and session cookies. AI search prompts and property-description inputs are sent to Groq. Interactive maps request tiles from OpenStreetMap, and media may load from the external hosts specified in property listings. Avoid including sensitive personal information in AI prompts or public reviews.</p>
      <p>These integrations have their own data-handling practices.</p>
    </InformationSection>
    <InformationSection title="Your choices and questions">
      <p>You can edit profile details, remove saved properties, and delete your own reviews through the site. For other account or data questions, use the information on our <Link href="/contact">contact page</Link>.</p>
    </InformationSection>
  </InformationPage>;
}
