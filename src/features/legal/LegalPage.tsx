import type { ReactNode } from 'react';
import { Feather } from 'lucide-react';

/** When the terms and the privacy policy last changed. Update with every edit. */
const UPDATED = '12 October 2026';

/** Where people reach the team about their account or their data. */
const CONTACT = 'https://swegrowth.id';

const contact = (
  <a href={CONTACT} target="_blank" rel="noreferrer">
    SWE Growth
  </a>
);

const TERMS: { title: string; body: ReactNode }[] = [
  {
    title: 'Using Notis',
    body: (
      <p>
        Notis (notis.swegrowth.id) is a notes and writing app with a public page for each writer. By
        signing in, you agree to these terms. If you do not agree, please do not use Notis.
      </p>
    ),
  },
  {
    title: 'Your account',
    body: (
      <p>
        You sign in with Google or with your SWE Growth account. Keep that account safe: what
        happens under it is your responsibility. One person per account.
      </p>
    ),
  },
  {
    title: 'Your content',
    body: (
      <>
        <p>
          You own what you write and upload. You give us permission to store it, show it to you, and
          show the parts you publish to anyone who visits your public page, only so that Notis can
          work.
        </p>
        <p>
          Boards, cards, to-do lists, the work journal and unpublished pages are private. Anything
          you publish, including your public page at /@handle, can be read, linked and shared by
          anyone until you take it down.
        </p>
      </>
    ),
  },
  {
    title: 'What you may not do',
    body: (
      <ul>
        <li>Publish anything illegal, hateful, harassing or sexually explicit.</li>
        <li>Publish someone else's work or private information without their permission.</li>
        <li>Pretend to be someone else, or mislead readers about who you are.</li>
        <li>Spam, spread malware, or try to break into, overload or scrape the service.</li>
      </ul>
    ),
  },
  {
    title: 'Resume import',
    body: (
      <p>
        If you upload a resume to fill in your public page, the text it suggests is a draft. Check
        it before you publish; you are responsible for what goes live.
      </p>
    ),
  },
  {
    title: 'Taking content down and closing accounts',
    body: (
      <p>
        We may remove published content or suspend an account that breaks these terms, and we will
        tell you why when we can. You can unpublish your pages at any time, and ask us to delete
        your account through {contact}.
      </p>
    ),
  },
  {
    title: 'The service',
    body: (
      <p>
        Notis is provided as it is. We work to keep it running and your notes safe, but we cannot
        promise it will never be down or lose data, so keep copies of anything you cannot afford to
        lose. As far as the law allows, we are not liable for indirect losses from using Notis.
        Features may change over time.
      </p>
    ),
  },
  {
    title: 'Changes and law',
    body: (
      <p>
        We may update these terms and will change the date at the top when we do. Continuing to use
        Notis after a change means you accept it. These terms are governed by the laws of the
        Republic of Indonesia.
      </p>
    ),
  },
];

const PRIVACY: { title: string; body: ReactNode }[] = [
  {
    title: 'What we collect',
    body: (
      <ul>
        <li>
          <strong>Account details</strong> from Google or SWE Growth when you sign in: your name,
          email address and profile picture.
        </li>
        <li>
          <strong>Your content</strong>: boards, cards, to-do lists, journal entries, pages, images
          you upload, and your public page settings (handle, bio, projects, links).
        </li>
        <li>
          <strong>Settings on your device</strong>: the app keeps a copy of your workspace and your
          preferences in your browser so it works quickly and offline.
        </li>
      </ul>
    ),
  },
  {
    title: 'How we use it',
    body: (
      <p>
        Only to run Notis: to sign you in, save and sync your work, and show the pages you publish.
        We do not sell your data, do not show ads, and do not use tracking or advertising cookies.
      </p>
    ),
  },
  {
    title: 'What is public',
    body: (
      <p>
        Only what you publish: your public page at /@handle (Me, Blog, About and what you are up to
        now) and the pages you publish there. Everything else stays private to your account.
      </p>
    ),
  },
  {
    title: 'Services we rely on',
    body: (
      <ul>
        <li>Supabase stores your account and content.</li>
        <li>Netlify hosts the app and public pages.</li>
        <li>Google handles Google sign-in and serves fonts.</li>
        <li>
          Google Gemini reads a resume when you choose to import one. The resume is sent to it to
          draft your public page and is not stored by Notis.
        </li>
      </ul>
    ),
  },
  {
    title: 'Your choices',
    body: (
      <p>
        You can edit or unpublish any page at any time. You can ask for a copy of your data, a
        correction, or the deletion of your account and content through {contact}. When an account
        is deleted, its private and published content is removed.
      </p>
    ),
  },
  {
    title: 'Security and changes',
    body: (
      <p>
        Data is sent over HTTPS and access to private content is limited to your account. We handle
        personal data in line with Indonesia's Personal Data Protection Law (UU No. 27 Tahun 2022).
        If this policy changes, we will update the date at the top.
      </p>
    ),
  },
];

const DOCS = {
  '/terms': { title: 'Terms of Service', sections: TERMS },
  '/privacy': { title: 'Privacy Policy', sections: PRIVACY },
} as const;

/** The terms of service or the privacy policy, readable without signing in. */
export function LegalPage({ pathname }: { pathname: string }) {
  const doc = DOCS[pathname.replace(/\/$/, '') as keyof typeof DOCS] ?? DOCS['/terms'];
  return (
    <div className="home legal">
      <header className="home-nav">
        <a className="home-logo" href="/">
          <span className="home-logo-mark">
            <Feather size={16} />
          </span>
          Notis
        </a>
      </header>
      <main>
        <article className="legal-doc">
          <h1>{doc.title}</h1>
          <p className="legal-updated">Last updated {UPDATED}</p>
          {doc.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.body}
            </section>
          ))}
        </article>
      </main>
      <LegalFooter />
    </div>
  );
}

/** The footer shared by the home page and the legal pages. */
export function LegalFooter() {
  return (
    <footer className="home-footer">
      <span>Notis · Write notes, get noticed.</span>
      <nav className="home-footer-links">
        <a href="/terms">Terms</a>
        <a href="/privacy">Privacy</a>
      </nav>
    </footer>
  );
}
