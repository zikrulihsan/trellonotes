import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { writerPath } from '@/lib/supabase/published-pages';
import {
  defaultLanding,
  getLanding,
  LANDING_LIMITS,
  saveLanding,
  socialPlatform,
  toLinkUrl,
  type Landing,
  type LandingAbout,
  type LandingExperience,
  type LandingProject,
} from '@/lib/supabase/landing';
import { useProfile } from '@/features/pages/useProfile';
import { visibility } from '@/features/pages/publish-state';
import { PublicAddress } from '@/features/pages/PublicAddress';
import { applyResume } from '@/lib/resume-import';
import { ResumeImport } from './ResumeImport';

type ListKey = 'links' | 'helps' | 'projects';

/** Where the writer sets up their public page: hero, links, what they help with, projects and notes. */
export function LandingSettingsPage() {
  const { workspace, cloudEnabled } = useWorkspace();
  const { user } = useAuth();
  const { profile, author, displayName, ensure } = useProfile();
  const userId = user?.id;
  const [draft, setDraft] = useState<Landing>();
  const [saved, setSaved] = useState('');
  const [loadError, setLoadError] = useState('');
  const [status, setStatus] = useState<{ busy?: boolean; error?: string; done?: boolean }>({});

  useEffect(() => {
    if (!supabase || !userId) return;
    let active = true;
    getLanding(supabase, userId).then(
      (landing) => {
        if (!active) return;
        const start = landing ?? defaultLanding(displayName);
        setDraft(start);
        setSaved(landing ? JSON.stringify(landing) : '');
      },
      (reason: unknown) =>
        active &&
        setLoadError(reason instanceof Error ? reason.message : 'Could not load your page.'),
    );
    return () => {
      active = false;
    };
    // The default greeting uses the name only when nothing is saved yet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Only listed pages: unlisted ones are shared by link and never shown on the public page.
  const listedPages = (workspace.pages ?? []).filter((page) => visibility(page) === 'published');
  const listedIds = new Set(listedPages.map((page) => page.id));

  if (!cloudEnabled || !userId)
    return (
      <div className="pages-view landing-admin">
        <Header />
        <p className="landing-admin-note">Sign in to set up your public page.</p>
      </div>
    );
  if (loadError)
    return (
      <div className="pages-view landing-admin">
        <Header />
        <p className="publish-error" role="alert">
          {loadError}
        </p>
      </div>
    );
  if (!draft)
    return (
      <div className="pages-view landing-admin">
        <Header />
        <p className="landing-admin-note" role="status">
          Loading…
        </p>
      </div>
    );

  const set = (patch: Partial<Landing>) => {
    setDraft({ ...draft, ...patch });
    setStatus({});
  };
  function edit<K extends ListKey>(key: K, index: number, patch: Partial<Landing[K][number]>) {
    const items = [...draft![key]] as Landing[K][number][];
    items[index] = { ...items[index], ...patch };
    set({ [key]: items });
  }
  const remove = (key: ListKey, index: number) =>
    set({ [key]: draft[key].filter((_, at) => at !== index) });
  function move(key: ListKey, index: number, by: number) {
    const items = [...draft![key]];
    const [item] = items.splice(index, 1);
    items.splice(index + by, 0, item);
    set({ [key]: items });
  }
  const setAbout = (patch: Partial<LandingAbout>) => set({ about: { ...draft.about, ...patch } });
  const dirty = JSON.stringify(draft) !== saved;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !userId || !draft) return;
    const badLink = draft.links.find((link) => link.label.trim() && !toLinkUrl(link.url));
    if (badLink)
      return setStatus({
        error: `The "${badLink.label}" button needs a web address, email or phone number.`,
      });
    const badSocial = draft.socials.find((url) => url.trim() && !toLinkUrl(url));
    if (badSocial) return setStatus({ error: `"${badSocial}" isn't a link to a profile.` });
    setStatus({ busy: true });
    try {
      // The landing page lives on the profile, which also holds the public address.
      if (!(await ensure())) throw new Error('Public addresses are not set up yet.');
      const clean = await saveLanding(supabase, userId, draft);
      setDraft(clean);
      setSaved(JSON.stringify(clean));
      setStatus({ done: true });
    } catch (reason) {
      setStatus({ error: reason instanceof Error ? reason.message : 'Could not save.' });
    }
  }

  const pageTitle = (project: LandingProject) =>
    workspace.pages?.find((page) => page.id === project.pageId)?.title;

  return (
    <div className="pages-view landing-admin">
      <Header>
        {author && profile && (
          <a
            className="landing-admin-view"
            href={writerPath(author)}
            target="_blank"
            rel="noreferrer"
          >
            View page <ExternalLink size={14} />
          </a>
        )}
      </Header>
      <div className="landing-form landing-form-top">
        <ResumeImport
          onRead={(resume) => {
            setDraft(applyResume(draft, resume));
            setStatus({});
          }}
        />
      </div>
      <form className="landing-form" onSubmit={submit}>
        <Section title="Hero">
          <Field label="Greeting">
            <input
              value={draft.greeting}
              maxLength={80}
              placeholder="Hi, Zikrul Here"
              onChange={(event) => set({ greeting: event.target.value })}
            />
          </Field>
          <Field label="Tagline">
            <input
              value={draft.tagline}
              maxLength={160}
              placeholder="Delivering Impact Through Software"
              onChange={(event) => set({ tagline: event.target.value })}
            />
          </Field>
        </Section>

        <Section
          title="Buttons"
          hint="The first button stands out. Use a web address, an email, or a short link like /s/cv."
        >
          {draft.links.map((link, index) => (
            <Row key={index} onRemove={() => remove('links', index)} label={`button ${index + 1}`}>
              <input
                aria-label="Button label"
                value={link.label}
                maxLength={30}
                placeholder={index === 0 ? 'Contact' : 'CV'}
                onChange={(event) => edit('links', index, { label: event.target.value })}
              />
              <input
                aria-label="Button link"
                value={link.url}
                maxLength={500}
                placeholder={index === 0 ? 'you@example.com' : '/s/cv'}
                onChange={(event) => edit('links', index, { url: event.target.value })}
              />
            </Row>
          ))}
          {draft.links.length < LANDING_LIMITS.links && (
            <Button onClick={() => set({ links: [...draft.links, { label: '', url: '' }] })}>
              <Plus size={15} />
              Add button
            </Button>
          )}
        </Section>

        <Section
          title="Social links"
          hint="Paste your profile links. They show as icons under the buttons: GitHub, LinkedIn, Instagram, X, YouTube, TikTok and more are recognised, anything else shows as a website."
        >
          {draft.socials.map((url, index) => {
            const known = toLinkUrl(url);
            return (
              <div className="landing-row landing-social-row" key={index}>
                <div className="landing-row-fields">
                  <input
                    aria-label={`Social link ${index + 1}`}
                    value={url}
                    maxLength={500}
                    placeholder="linkedin.com/in/you"
                    onChange={(event) => {
                      const socials = [...draft.socials];
                      socials[index] = event.target.value;
                      set({ socials });
                    }}
                  />
                  <span className="landing-social-kind">
                    {known ? socialPlatform(known).label : url.trim() ? 'Not a link' : ''}
                  </span>
                </div>
                <div className="landing-row-actions">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove social link ${index + 1}`}
                    onClick={() => set({ socials: draft.socials.filter((_, at) => at !== index) })}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
          {draft.socials.length < LANDING_LIMITS.socials && (
            <Button onClick={() => set({ socials: [...draft.socials, ''] })}>
              <Plus size={15} />
              Add social link
            </Button>
          )}
        </Section>

        <Section title="Helps people to" hint="Up to three columns per row.">
          <Field label="Heading">
            <input
              value={draft.helpsHeading}
              maxLength={80}
              onChange={(event) => set({ helpsHeading: event.target.value })}
            />
          </Field>
          {draft.helps.map((help, index) => (
            <Row
              key={index}
              label={`column ${index + 1}`}
              onRemove={() => remove('helps', index)}
              onMove={(by) => move('helps', index, by)}
              first={index === 0}
              last={index === draft.helps.length - 1}
            >
              <input
                aria-label="What you help with"
                value={help.title}
                maxLength={80}
                placeholder="Build Impactful Software"
                onChange={(event) => edit('helps', index, { title: event.target.value })}
              />
              <input
                aria-label="As"
                value={help.subtitle}
                maxLength={120}
                placeholder="as engineer at [Company] & indie builder"
                onChange={(event) => edit('helps', index, { subtitle: event.target.value })}
              />
            </Row>
          ))}
          {draft.helps.length < LANDING_LIMITS.helps && (
            <Button onClick={() => set({ helps: [...draft.helps, { title: '', subtitle: '' }] })}>
              <Plus size={15} />
              Add column
            </Button>
          )}
        </Section>

        <Section
          title="Projects"
          hint="Link a project to one of your published pages to give it a detail page. Unlisted pages can't be picked, since they stay off your public page."
        >
          <Field label="Heading">
            <input
              value={draft.projectsHeading}
              maxLength={80}
              onChange={(event) => set({ projectsHeading: event.target.value })}
            />
          </Field>
          {draft.projects.map((project, index) => {
            const hidden = project.pageId && !listedIds.has(project.pageId);
            return (
              <Row
                key={project.id}
                label={`project ${index + 1}`}
                onRemove={() => remove('projects', index)}
                onMove={(by) => move('projects', index, by)}
                first={index === 0}
                last={index === draft.projects.length - 1}
                wide
              >
                <input
                  aria-label="Project name"
                  value={project.title}
                  maxLength={100}
                  placeholder="Project name"
                  onChange={(event) => edit('projects', index, { title: event.target.value })}
                />
                <input
                  aria-label="One-line result"
                  value={project.summary}
                  maxLength={140}
                  placeholder="One-line result"
                  onChange={(event) => edit('projects', index, { summary: event.target.value })}
                />
                <input
                  aria-label="Category"
                  value={project.category}
                  maxLength={30}
                  placeholder="Software"
                  onChange={(event) => edit('projects', index, { category: event.target.value })}
                />
                <input
                  aria-label="Year"
                  value={project.year}
                  maxLength={12}
                  placeholder={String(new Date().getFullYear())}
                  onChange={(event) => edit('projects', index, { year: event.target.value })}
                />
                <input
                  aria-label="Image link"
                  value={project.image}
                  maxLength={500}
                  placeholder="Image link (https://…), optional"
                  onChange={(event) => edit('projects', index, { image: event.target.value })}
                />
                <select
                  aria-label="Detail page"
                  value={project.pageId ?? ''}
                  onChange={(event) => {
                    const pageId = event.target.value || null;
                    const page = listedPages.find((item) => item.id === pageId);
                    edit('projects', index, {
                      pageId,
                      ...(page && !project.title.trim() && { title: page.title }),
                    });
                  }}
                >
                  <option value="">No detail page</option>
                  {hidden && (
                    <option value={project.pageId!}>{pageTitle(project) ?? 'Removed page'}</option>
                  )}
                  {listedPages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.title || 'Untitled'}
                    </option>
                  ))}
                </select>
                {hidden && (
                  <p className="landing-admin-warning">
                    This page isn&apos;t on your public list anymore, so the project won&apos;t link
                    to it.
                  </p>
                )}
              </Row>
            );
          })}
          {draft.projects.length < LANDING_LIMITS.projects && (
            <Button
              onClick={() =>
                set({
                  projects: [
                    ...draft.projects,
                    {
                      id: crypto.randomUUID(),
                      title: '',
                      summary: '',
                      category: '',
                      year: String(new Date().getFullYear()),
                      image: '',
                      pageId: null,
                    },
                  ],
                })
              }
            >
              <Plus size={15} />
              Add project
            </Button>
          )}
        </Section>

        <Section
          title="Notes"
          hint="Your latest published pages, newest first. Pages used as project details aren't repeated here."
        >
          <Field label="Heading">
            <input
              value={draft.notesHeading}
              maxLength={80}
              onChange={(event) => set({ notesHeading: event.target.value })}
            />
          </Field>
          <Field label="How many to show">
            <input
              type="number"
              min={1}
              max={LANDING_LIMITS.notes}
              value={draft.notesCount}
              onChange={(event) => set({ notesCount: Number(event.target.value) || 1 })}
            />
          </Field>
        </Section>

        <h2 className="landing-admin-group">About page</h2>
        <p className="landing-admin-hint landing-admin-group-hint">
          Shown as About in the menu of your public page once you fill something in.
        </p>
        <Section title="Intro">
          <Field label="Subtitle">
            <input
              value={draft.about.subtitle}
              maxLength={80}
              onChange={(event) => setAbout({ subtitle: event.target.value })}
            />
          </Field>
          <Field label="Photo link (https://…)">
            <input
              value={draft.about.photo}
              maxLength={500}
              placeholder="https://…/me.jpg"
              onChange={(event) => setAbout({ photo: event.target.value })}
            />
          </Field>
          <Field label="Role">
            <input
              value={draft.about.role}
              maxLength={120}
              placeholder="Software Engineer at [Company]"
              onChange={(event) => setAbout({ role: event.target.value })}
            />
          </Field>
          <Field label="About you (leave a blank line between paragraphs)">
            <textarea
              rows={7}
              value={draft.about.intro}
              maxLength={2500}
              onChange={(event) => setAbout({ intro: event.target.value })}
            />
          </Field>
          <Field label="Tools you love (separate with commas)">
            <input
              value={draft.about.stack.join(', ')}
              placeholder="React, TypeScript, Supabase"
              onChange={(event) => setAbout({ stack: event.target.value.split(/,\s*/) })}
            />
          </Field>
        </Section>

        <Section title="What you're up to now" hint="One item per line.">
          <Field label="Heading">
            <input
              value={draft.about.nowHeading}
              maxLength={80}
              onChange={(event) => setAbout({ nowHeading: event.target.value })}
            />
          </Field>
          <textarea
            aria-label="What you're up to now"
            rows={4}
            value={draft.about.now.join('\n')}
            placeholder={'Building Notis\nMentoring at SWE Growth'}
            onChange={(event) => setAbout({ now: event.target.value.split('\n') })}
          />
        </Section>

        <Section
          title="Your story in writing"
          hint="Pick published pages that tell your story, like yearly retrospectives. Unlisted pages can't be picked."
        >
          <Field label="Heading">
            <input
              value={draft.about.storiesHeading}
              maxLength={80}
              onChange={(event) => setAbout({ storiesHeading: event.target.value })}
            />
          </Field>
          {draft.about.stories.map((story, index) => {
            const hidden = story.pageId && !listedIds.has(story.pageId);
            return (
              <Row
                key={story.id}
                label={`story ${index + 1}`}
                onRemove={() =>
                  setAbout({ stories: draft.about.stories.filter((_, at) => at !== index) })
                }
                onMove={(by) => setAbout({ stories: moved(draft.about.stories, index, by) })}
                first={index === 0}
                last={index === draft.about.stories.length - 1}
              >
                <input
                  aria-label="Label"
                  value={story.label}
                  maxLength={40}
                  placeholder="2025"
                  onChange={(event) =>
                    setAbout({
                      stories: replaced(draft.about.stories, index, { label: event.target.value }),
                    })
                  }
                />
                <select
                  aria-label="Page"
                  value={story.pageId ?? ''}
                  onChange={(event) =>
                    setAbout({
                      stories: replaced(draft.about.stories, index, {
                        pageId: event.target.value || null,
                      }),
                    })
                  }
                >
                  <option value="">Choose a page</option>
                  {hidden && <option value={story.pageId!}>Not on your public list</option>}
                  {listedPages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.title || 'Untitled'}
                    </option>
                  ))}
                </select>
              </Row>
            );
          })}
          {draft.about.stories.length < LANDING_LIMITS.stories && (
            <Button
              onClick={() =>
                setAbout({
                  stories: [
                    ...draft.about.stories,
                    { id: crypto.randomUUID(), label: '', pageId: null },
                  ],
                })
              }
            >
              <Plus size={15} />
              Add story
            </Button>
          )}
        </Section>

        <Section title="Experience" hint="Newest first. Highlights: one per line.">
          {draft.about.experiences.map((job, index) => {
            const update = (patch: Partial<LandingExperience>) =>
              setAbout({ experiences: replaced(draft.about.experiences, index, patch) });
            return (
              <Row
                key={job.id}
                label={`experience ${index + 1}`}
                onRemove={() =>
                  setAbout({
                    experiences: draft.about.experiences.filter((_, at) => at !== index),
                  })
                }
                onMove={(by) =>
                  setAbout({ experiences: moved(draft.about.experiences, index, by) })
                }
                first={index === 0}
                last={index === draft.about.experiences.length - 1}
                wide
              >
                <input
                  aria-label="Job title"
                  value={job.title}
                  maxLength={100}
                  placeholder="Software Engineer"
                  onChange={(event) => update({ title: event.target.value })}
                />
                <input
                  aria-label="Period"
                  value={job.period}
                  maxLength={40}
                  placeholder="Jan 2024 – Present"
                  onChange={(event) => update({ period: event.target.value })}
                />
                <input
                  aria-label="Company"
                  value={job.company}
                  maxLength={80}
                  placeholder="Company"
                  onChange={(event) => update({ company: event.target.value })}
                />
                <input
                  aria-label="Company link"
                  value={job.companyUrl}
                  maxLength={500}
                  placeholder="company.com (optional)"
                  onChange={(event) => update({ companyUrl: event.target.value })}
                />
                <input
                  aria-label="Location"
                  value={job.location}
                  maxLength={60}
                  placeholder="Remote · Jakarta"
                  onChange={(event) => update({ location: event.target.value })}
                />
                <span />
                <textarea
                  className="landing-row-full"
                  aria-label="Description"
                  rows={2}
                  value={job.description}
                  maxLength={500}
                  placeholder="What you did there, in a sentence or two"
                  onChange={(event) => update({ description: event.target.value })}
                />
                <textarea
                  className="landing-row-full"
                  aria-label="Highlights"
                  rows={3}
                  value={job.highlights.join('\n')}
                  placeholder={'Led the design system\nCut page load time in half'}
                  onChange={(event) => update({ highlights: event.target.value.split('\n') })}
                />
              </Row>
            );
          })}
          {draft.about.experiences.length < LANDING_LIMITS.experiences && (
            <Button
              onClick={() =>
                setAbout({
                  experiences: [
                    ...draft.about.experiences,
                    {
                      id: crypto.randomUUID(),
                      period: '',
                      title: '',
                      company: '',
                      companyUrl: '',
                      location: '',
                      description: '',
                      highlights: [],
                    },
                  ],
                })
              }
            >
              <Plus size={15} />
              Add experience
            </Button>
          )}
        </Section>

        <div className="landing-form-actions">
          {status.error && (
            <p className="publish-error" role="alert">
              {status.error}
            </p>
          )}
          {status.done && !dirty && <p className="landing-admin-note">Saved.</p>}
          <Button type="submit" variant="primary" disabled={status.busy || !dirty}>
            {status.busy ? 'Saving…' : 'Save landing page'}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** A copy of `items` with the one at `index` changed. */
function replaced<T>(items: T[], index: number, patch: Partial<T>): T[] {
  return items.map((item, at) => (at === index ? { ...item, ...patch } : item));
}

/** A copy of `items` with the one at `index` moved `by` places. */
function moved<T>(items: T[], index: number, by: number): T[] {
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(index + by, 0, item);
  return next;
}

function Header({ children }: { children?: ReactNode }) {
  return (
    <section className="board-header">
      <div>
        <div className="eyebrow">LANDING PAGE</div>
        <h1>Your public page</h1>
        <p>What visitors see first at your public address, above your published notes.</p>
        <PublicAddress />
      </div>
      {children && <div className="board-actions">{children}</div>}
    </section>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="landing-fieldset">
      <legend>{title}</legend>
      {hint && <p className="landing-admin-hint">{hint}</p>}
      {children}
    </fieldset>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="landing-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Row({
  label,
  children,
  onRemove,
  onMove,
  first,
  last,
  wide,
}: {
  label: string;
  children: ReactNode;
  onRemove: () => void;
  onMove?: (by: number) => void;
  first?: boolean;
  last?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={`landing-row ${wide ? 'is-wide' : ''}`}>
      <div className="landing-row-fields">{children}</div>
      <div className="landing-row-actions">
        {onMove && (
          <>
            <button
              type="button"
              className="icon-button"
              aria-label={`Move ${label} up`}
              disabled={first}
              onClick={() => onMove(-1)}
            >
              <ArrowUp size={15} />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label={`Move ${label} down`}
              disabled={last}
              onClick={() => onMove(1)}
            >
              <ArrowDown size={15} />
            </button>
          </>
        )}
        <button
          type="button"
          className="icon-button"
          aria-label={`Remove ${label}`}
          onClick={onRemove}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
