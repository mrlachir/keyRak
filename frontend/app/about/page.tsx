import type { Metadata } from "next";
import Link from "next/link";
import { InformationPage, InformationSection } from "@/components/layout/information-page";

export const metadata: Metadata = { title: "About us", description: "Thoughtful stays, local character, and a simpler way to find your place." };

export default function AboutPage() {
  return <InformationPage path="/about" eyebrow="Rooted in Marrakesh" title="A sense of place. A simpler stay."
    intro="KEYRAK brings homes with character and thoughtful search together, so planning a stay feels a little more personal.">
    <InformationSection title="Find a place that feels like you">
      <p>Explore villas, houses, and apartments by location, amenities, budget, and travel dates. Use standard filters or describe your ideal stay to our AI assistant, then refine the suggestions to suit your trip.</p>
      <p><Link href="/search">Explore all stays</Link> or keep your favorites in a <Link href="/wishlist">private wishlist</Link>.</p>
    </InformationSection>
    <InformationSection title="See more before you arrive">
      <p>Property pages bring photos, available 360° tours, videos, and location maps together. Reviews can be submitted by guests with confirmed reservations once their check-in date has arrived.</p>
    </InformationSection>
    <InformationSection title="From inspiration to a reservation">
      <p>Choose available dates and submit a booking request. Requests are reviewed by an administrator; you can follow the status and manage your details in <Link href="/profile">your profile</Link>.</p>
      <p>Save the homes you love, explore their details, and keep track of your reservations in one place.</p>
    </InformationSection>
  </InformationPage>;
}
