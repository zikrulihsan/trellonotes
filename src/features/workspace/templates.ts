/** Starting lists for a new board. Names are only a start: every list can be renamed. */
export interface BoardTemplate {
  id: string;
  name: string;
  /** One line on what the board is for, shown when picking it. */
  hint: string;
  color: string;
  lists: string[];
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: 'blank',
    name: 'Blank board',
    hint: 'Three plain lists for anything.',
    color: '#a78bfa',
    lists: ['To do', 'Doing', 'Done'],
  },
  {
    id: 'weekly',
    name: 'Weekly plan',
    hint: 'Plan the week, see what got done.',
    color: '#60a5fa',
    lists: ['This week', 'Today', 'Waiting', 'Done'],
  },
  {
    id: 'job-hunt',
    name: 'Job hunt',
    hint: 'Track roles from wishlist to offer.',
    color: '#f59e0b',
    lists: ['Wishlist', 'Applied', 'Interviewing', 'Offer', 'Closed'],
  },
  {
    id: 'clients',
    name: 'Client work',
    hint: 'Leads, projects and what you delivered.',
    color: '#34d399',
    lists: ['Leads', 'In progress', 'Waiting on client', 'Delivered'],
  },
  {
    id: 'learning',
    name: 'Learning',
    hint: 'What you want to learn, and what you shared.',
    color: '#f472b6',
    lists: ['Want to learn', 'Learning', 'Practicing', 'Shared'],
  },
  {
    id: 'side-project',
    name: 'Side project',
    hint: 'From idea to shipped.',
    color: '#fb923c',
    lists: ['Ideas', 'Building', 'Testing', 'Shipped'],
  },
  {
    id: 'writing',
    name: 'Writing',
    hint: 'Ideas on their way to published pages.',
    color: '#818cf8',
    lists: ['Ideas', 'Drafting', 'Ready', 'Published'],
  },
];

export const templateById = (id?: string) =>
  BOARD_TEMPLATES.find((template) => template.id === id) ?? BOARD_TEMPLATES[0];
