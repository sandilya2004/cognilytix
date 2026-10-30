import { Link } from "react-router-dom";
import LegalLayout, { Section } from "@/components/legal/LegalLayout";

export default function Refunds() {
  return (
    <LegalLayout title="Refund Policy" updated="October 30, 2026">
      <Section title="14-day money-back guarantee">
        <p>
          If you're not satisfied with a Cognilytix subscription, you can request a full refund within 14 days of
          your order date.
        </p>
      </Section>
      <Section title="How to request a refund">
        <p>
          Refunds are processed by our payment provider and merchant of record, Paddle. To request a refund, visit{" "}
          <a href="https://paddle.net" target="_blank" rel="noopener noreferrer" className="text-primary underline">paddle.net</a>{" "}
          and look up your order using the email address you paid with, or contact us at{" "}
          <a href="mailto:support@cognilytix.app" className="text-primary underline">support@cognilytix.app</a>.
        </p>
        <p>
          You can also see Paddle's{" "}
          <a href="https://www.paddle.com/legal/refund-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline">refund policy</a>.
        </p>
      </Section>
      <Section title="Cancelling">
        <p>
          You can cancel any time from your <Link to="/account/subscription" className="text-primary underline">Subscription page</Link>.
          Your plan stays active until the end of the period you've paid for, and your data and projects are not deleted.
        </p>
      </Section>
    </LegalLayout>
  );
}
