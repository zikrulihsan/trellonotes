// What Gemini is asked when a writer fills their landing page from a resume. Shared by the
// edge function that calls Gemini (netlify/edge-functions/resume-import.ts) and the app,
// so it has no imports.

/** The largest resume file the import accepts, before base64. */
export const RESUME_MAX_BYTES = 4 * 1024 * 1024;

/** The largest pasted resume the import accepts. */
export const RESUME_MAX_CHARS = 30000;

export const RESUME_PROMPT = `You turn a resume into the content of a personal website for its owner.
Write in the first person where a sentence is needed, in the resume's language, plain and specific.
Use only facts in the resume. Never invent numbers, dates, employers, links or skills.
Leave out phone numbers, home addresses, dates of birth and anything else private; an email may be used.
Keep every field short: titles under 8 words, summaries under 14 words.

Fields:
- greeting: "Hi, <first name> Here".
- tagline: one line on what they do and for whom.
- contactEmail: the resume's email, or empty.
- socials: full profile links found in the resume (LinkedIn, GitHub, personal site...).
- helps: 3 things they help people do, each with a subtitle starting with "as" or "by" naming the role.
- projects: up to 6 notable products, systems or side projects, most impressive first. summary is the result or what it does; category is one or two words (AI, Software, Community, Side project...); year is a year or range from the resume, or empty; url is the project's link from the resume, or empty.
- about.role: current title and employer.
- about.intro: 2 or 3 short paragraphs separated by a blank line.
- about.stack: up to 15 tools they use most.
- about.now: up to 3 things they are working on now.
- about.experiences: jobs, newest first. period like "Oct 2024 – Present"; description is one sentence; highlights are up to 4 results, keeping the resume's numbers.`;

const text = { type: 'STRING' };
const texts = { type: 'ARRAY', items: text };

/** Gemini's response schema, so the answer is always this JSON shape. */
export const RESUME_SCHEMA = {
  type: 'OBJECT',
  properties: {
    greeting: text,
    tagline: text,
    contactEmail: text,
    socials: texts,
    helps: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { title: text, subtitle: text },
        required: ['title', 'subtitle'],
      },
    },
    projects: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { title: text, summary: text, category: text, year: text, url: text },
        required: ['title', 'summary', 'category', 'year'],
      },
    },
    about: {
      type: 'OBJECT',
      properties: {
        role: text,
        intro: text,
        stack: texts,
        now: texts,
        experiences: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              period: text,
              title: text,
              company: text,
              companyUrl: text,
              location: text,
              description: text,
              highlights: texts,
            },
            required: ['period', 'title', 'company', 'description', 'highlights'],
          },
        },
      },
      required: ['role', 'intro', 'stack', 'now', 'experiences'],
    },
  },
  required: ['greeting', 'tagline', 'contactEmail', 'socials', 'helps', 'projects', 'about'],
};
