import LegalLayout, { OwnerConfirm, Section } from "@/components/legal/LegalLayout";

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="October 30, 2026">
      <Section title="Who we are">
        <p>
          Cognilytix AI ("the service") is a web application for analysing spreadsheet data.{" "}
          <OwnerConfirm>legal name and address of the business or person operating the service</OwnerConfirm>
        </p>
        <p>
          Contact: <OwnerConfirm>privacy contact email (the site currently lists hello@cognilytix.app)</OwnerConfirm>
        </p>
      </Section>

      <Section title="Account information">
        <p>
          When you sign up with email or Google, we store your email address, display name, profile picture (if Google
          provides one), your account role (user or admin), and sign-in timestamps. Passwords are handled by our
          authentication provider and are not visible to us in readable form.
        </p>
      </Section>

      <Section title="Files you upload">
        <p>
          CSV and Excel files are read and processed inside your browser. The full file is not uploaded to our servers
          when you analyse it.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>AI features</strong> (chat, insights, predictions, prediction insights, story, executive summary)
            send a limited excerpt to our server-side functions: column names, summary figures (such as totals and
            averages), a small number of sample rows, and your typed questions. This excerpt is forwarded to a
            third-party AI model provider to generate the response.{" "}
            <OwnerConfirm>names of the AI providers and their data-retention terms</OwnerConfirm>
          </li>
          <li>
            <strong>Saved projects</strong> (Save / Ctrl+S) are stored in your own browser's local storage on that
            device, not on our servers.
          </li>
          <li>
            <strong>Shared reports</strong>: when you create a share link, a snapshot of that report (titles, charts,
            figures and text) is stored in our database with your account, plus an optional password (stored hashed)
            and optional expiry date.
          </li>
        </ul>
      </Section>

      <Section title="Retention and deletion">
        <ul className="list-disc pl-5 space-y-1">
          <li>Data held in your browser stays until you delete the project, clear your browser data, or press Reset.</li>
          <li>Shared reports stay until you delete them on the Reports page. Expired links stop opening, but the stored snapshot is not automatically removed. <OwnerConfirm>whether expired reports should be purged and on what schedule</OwnerConfirm></li>
          <li>Account data stays while your account exists. An administrator can delete accounts. <OwnerConfirm>how users request account deletion and how long backups are kept</OwnerConfirm></li>
          <li>AI request excerpts are not stored in our database by the app. <OwnerConfirm>how long AI providers and server logs retain request content</OwnerConfirm></li>
        </ul>
      </Section>

      <Section title="Sharing with others">
        <p>
          We use service providers for hosting, the database, authentication (including Google sign-in), and AI
          processing. We do not sell your data. <OwnerConfirm>complete list of service providers</OwnerConfirm>
        </p>
        <p>The public website shows a total count of registered users only — never names, emails or IDs.</p>
      </Section>

      <Section title="Your choices and rights">
        <p>
          You can avoid AI features if you do not want excerpts sent for processing, delete shared reports, and clear
          saved projects from your browser. <OwnerConfirm>applicable privacy laws, user rights, and how to exercise them</OwnerConfirm>
        </p>
      </Section>

      <Section title="Security">
        <p>
          Access to stored data is restricted per account by database access rules, and shared-report passwords are
          checked on the server. No method of storage or transmission is completely secure.
        </p>
      </Section>

      <Section title="Changes">
        <p>We will update the date above when this policy changes.</p>
      </Section>
    </LegalLayout>
  );
}
