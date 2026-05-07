import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for the Little Saigon app and website.",
};

export default function TermsPage() {
  return (
    <div className="ls-container py-3xl">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-page-title font-bold text-ls-primary">Terms of Service</h1>
        <p className="text-meta text-ls-secondary mt-sm">Last updated: March 29, 2026</p>

        <div className="mt-2xl space-y-2xl text-body text-ls-body leading-relaxed">
          <section>
            <h2 className="text-section-header font-bold text-ls-primary mb-md">Acceptance of Terms</h2>
            <p>
              By accessing or using the Little Saigon mobile application and website
              (collectively, the &quot;Service&quot;), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-section-header font-bold text-ls-primary mb-md">Description of Service</h2>
            <p>
              Little Saigon is a community-driven guide to Vietnamese businesses in Westminster,
              Garden Grove, and Fountain Valley, California. The Service includes business listings,
              reviews, ratings, a rewards program, and curated content.
            </p>
          </section>

          <section>
            <h2 className="text-section-header font-bold text-ls-primary mb-md">User Accounts</h2>
            <ul className="list-disc pl-xl space-y-sm">
              <li>You may sign in using Google or Apple authentication</li>
              <li>You are responsible for maintaining the security of your account</li>
              <li>You must provide accurate information when creating your account</li>
              <li>You may only maintain one account per person</li>
            </ul>
          </section>

          <section>
            <h2 className="text-section-header font-bold text-ls-primary mb-md">User Content</h2>
            <p className="mb-md">
              You may submit reviews, ratings, and photos (&quot;User Content&quot;). By submitting User Content, you:
            </p>
            <ul className="list-disc pl-xl space-y-sm">
              <li>Grant us a non-exclusive, worldwide license to display and use your content</li>
              <li>Confirm that your content is truthful and based on genuine experiences</li>
              <li>Agree not to submit content that is defamatory, obscene, or fraudulent</li>
              <li>Acknowledge that we may remove content that violates these terms</li>
            </ul>
          </section>

          <section>
            <h2 className="text-section-header font-bold text-ls-primary mb-md">Rewards Program</h2>
            <ul className="list-disc pl-xl space-y-sm">
              <li>Points are earned through legitimate check-ins at participating businesses</li>
              <li>Fraudulent check-ins may result in point forfeiture and account suspension</li>
              <li>Reward values and availability are subject to change</li>
              <li>Points have no cash value and are non-transferable</li>
              <li>We reserve the right to modify or discontinue the rewards program</li>
            </ul>
          </section>

          <section>
            <h2 className="text-section-header font-bold text-ls-primary mb-md">Prohibited Conduct</h2>
            <p className="mb-md">You agree not to:</p>
            <ul className="list-disc pl-xl space-y-sm">
              <li>Submit fake reviews or fraudulent check-ins</li>
              <li>Harass, abuse, or threaten other users or business owners</li>
              <li>Attempt to manipulate ratings or rankings</li>
              <li>Use automated tools to scrape or access the Service</li>
              <li>Impersonate other users or businesses</li>
              <li>Use the Service for any unlawful purpose</li>
            </ul>
          </section>

          <section>
            <h2 className="text-section-header font-bold text-ls-primary mb-md">Business Listings</h2>
            <p>
              Business information including hours, addresses, and menus is provided for
              informational purposes only. While we strive for accuracy, we do not guarantee
              that all listing information is current or complete. Please verify directly with
              businesses before visiting.
            </p>
          </section>

          <section>
            <h2 className="text-section-header font-bold text-ls-primary mb-md">Disclaimer of Warranties</h2>
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind,
              either express or implied. We do not warrant that the Service will be uninterrupted,
              error-free, or free of harmful components.
            </p>
          </section>

          <section>
            <h2 className="text-section-header font-bold text-ls-primary mb-md">Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Little Saigon shall not be liable for any
              indirect, incidental, special, or consequential damages arising from your use of
              the Service.
            </p>
          </section>

          <section>
            <h2 className="text-section-header font-bold text-ls-primary mb-md">Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of the
              Service after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-section-header font-bold text-ls-primary mb-md">Contact</h2>
            <p>
              Questions about these Terms? Reach out through our{" "}
              <a href="/support" className="text-ls-primary font-semibold hover:underline">
                support page
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
