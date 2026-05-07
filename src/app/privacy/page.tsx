import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for the Little Saigon app and website.",
};

export default function PrivacyPage() {
  return (
    <div className="ls-container py-3xl">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-page-title font-bold text-ls-primary">Privacy Policy</h1>
        <p className="text-meta text-ls-secondary mt-sm">Last updated: March 29, 2026</p>

        <div className="mt-2xl space-y-2xl text-body text-ls-body leading-relaxed">
          <section>
            <h2 className="text-section-header font-bold text-ls-primary mb-md">Overview</h2>
            <p>
              Little Saigon (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the Little Saigon mobile application and
              website (littlesaigonapp.com). This Privacy Policy explains how we collect, use, and
              protect your personal information when you use our services.
            </p>
          </section>

          <section>
            <h2 className="text-section-header font-bold text-ls-primary mb-md">Information We Collect</h2>
            <p className="mb-md">We collect the following types of information:</p>
            <ul className="list-disc pl-xl space-y-sm">
              <li>
                <strong>Account information:</strong> When you sign in with Google or Apple, we receive
                your name, email address, and profile photo.
              </li>
              <li>
                <strong>Usage data:</strong> We collect information about how you interact with the app,
                including businesses you view, check-ins, reviews, and saved favorites.
              </li>
              <li>
                <strong>Location data:</strong> With your permission, we collect your approximate location
                to show nearby businesses and enable check-in functionality.
              </li>
              <li>
                <strong>Reviews and content:</strong> Any reviews, ratings, or photos you submit are
                stored and displayed publicly.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-section-header font-bold text-ls-primary mb-md">How We Use Your Information</h2>
            <ul className="list-disc pl-xl space-y-sm">
              <li>Provide and improve our services</li>
              <li>Show you relevant businesses near your location</li>
              <li>Track and award reward points for check-ins</li>
              <li>Display your reviews and ratings to other users</li>
              <li>Send important service notifications</li>
              <li>Analyze usage patterns to improve the app experience</li>
            </ul>
          </section>

          <section>
            <h2 className="text-section-header font-bold text-ls-primary mb-md">Data Storage & Security</h2>
            <p>
              Your data is stored securely using Google Firebase infrastructure. We use
              industry-standard security measures including encryption in transit and at rest.
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-section-header font-bold text-ls-primary mb-md">Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul className="list-disc pl-xl space-y-sm mt-md">
              <li><strong>Google Firebase:</strong> Authentication, database, and analytics</li>
              <li><strong>Apple Sign-In:</strong> Authentication</li>
              <li><strong>Google Maps:</strong> Business location and mapping</li>
            </ul>
          </section>

          <section>
            <h2 className="text-section-header font-bold text-ls-primary mb-md">Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-xl space-y-sm mt-md">
              <li>Access your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and data</li>
              <li>Opt out of location tracking at any time</li>
              <li>Withdraw consent for data processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-section-header font-bold text-ls-primary mb-md">Children&apos;s Privacy</h2>
            <p>
              Our services are not directed to children under 13. We do not knowingly collect
              personal information from children under 13. If you believe we have inadvertently
              collected such information, please contact us to have it removed.
            </p>
          </section>

          <section>
            <h2 className="text-section-header font-bold text-ls-primary mb-md">Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any
              significant changes by posting the new policy on this page and updating the
              &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-section-header font-bold text-ls-primary mb-md">Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please reach out
              through our{" "}
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
