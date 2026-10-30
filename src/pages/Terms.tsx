import { Link } from "react-router-dom";
import LegalLayout, { OwnerConfirm, Section } from "@/components/legal/LegalLayout";

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service" updated="October 30, 2026">
      <Section title="Agreement">
        <p>
          By using Cognilytix AI you agree to these terms. You are contracting with Cognilytix, which operates the
          service. <OwnerConfirm>business address and governing jurisdiction</OwnerConfirm>
        </p>
      </Section>

      <Section title="Your account">
        <p>
          You are responsible for your sign-in details and for activity under your account. Provide accurate
          information when signing up. Administrators may suspend or delete accounts that misuse the service.
        </p>
      </Section>

      <Section title="Your data">
        <p>
          You keep ownership of the files and data you upload. You confirm you have the right to use that data and
          that uploading it does not break any law or agreement. Please do not upload data you are not permitted to
          share with third-party AI providers. See the <Link to="/privacy" className="text-primary underline">Privacy Policy</Link> for how data is handled.
        </p>
      </Section>

      <Section title="AI-generated content">
        <p>
          Insights, predictions, stories and summaries are generated automatically and may be inaccurate or
          incomplete. They are not financial, legal or professional advice. Check important figures before making
          decisions.
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>
          Do not attempt to break, overload or gain unauthorised access to the service, or use it for unlawful
          purposes. Shared report links are your responsibility; anyone with the link (and password, if set) can view
          the report.
        </p>
      </Section>

      <Section title="Plans and payment">
        <p>
          Plans, prices and limits are shown on the <Link to="/pricing" className="text-primary underline">Pricing page</Link>.
          Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for
          all our orders. Paddle provides all customer service inquiries and handles returns. Payment, billing, tax,
          renewal and cancellation terms are set out in Paddle's{" "}
          <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">Buyer Terms</a>.
          Subscriptions renew automatically until cancelled; cancellation takes effect at the end of the current
          billing period. Refunds are described in our <Link to="/refunds" className="text-primary underline">Refund Policy</Link>.
        </p>
        <p>
          You must not misuse the service, including unlawful use, fraud or spam, infringing others' intellectual
          property, or interfering with security (malware, probing or scraping). Cognilytix retains ownership of the
          service, its software, documentation and branding. We may suspend or end access for material breach,
          non-payment, security or fraud risk, or repeated or serious policy violations. The service is provided
          without a guarantee of uninterrupted or error-free performance.
        </p>
      </Section>

      <Section title="Availability and liability">
        <p>
          The service is provided "as is" and may change or be unavailable at times.{" "}
          <OwnerConfirm>warranty disclaimer and limitation-of-liability wording reviewed by a legal adviser</OwnerConfirm>
        </p>
      </Section>

      <Section title="Contact and changes">
        <p>
          <OwnerConfirm>contact email for terms questions</OwnerConfirm> We will update the date above when these terms change.
        </p>
      </Section>
    </LegalLayout>
  );
}
