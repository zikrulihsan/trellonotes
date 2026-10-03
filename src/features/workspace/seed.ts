import type { Workspace } from './types';
const sample = [
  [
    'small',
    'ideas',
    'The beauty of small beginnings',
    'Essay',
    'lilac',
    '<p>There is something quietly radical about beginning before you feel ready.</p><p>We tend to imagine beginnings as grand gestures. A new city, a blank notebook, a decision that changes everything. But most beginnings are smaller than that.</p><h2>Start where you are</h2><p>A sentence written on the train. A conversation that stays with you. Ten minutes, set aside for something you care about.</p><blockquote><p>You don’t need to see the whole staircase to take the first step.</p></blockquote><p>Maybe the practice is simply this: notice the small things, and give them a place to grow.</p>',
  ],
  [
    'ritual',
    'ideas',
    'A morning ritual worth keeping',
    'Personal',
    '',
    '<p>Before the notifications, before the first meeting, there is a little pocket of time that belongs to you.</p>',
  ],
  [
    'places',
    'ideas',
    'Places that make us feel at home',
    'Essay',
    '',
    '<p>Home is less a place than a collection of small, familiar details.</p>',
  ],
  [
    'attention',
    'drafting',
    'On the art of paying attention',
    'Essay',
    'peach',
    '<p>Last week, I walked the same route I have walked a hundred times. For the first time, I noticed the blue door.</p><h2>A different way of looking</h2><p>Attention is a kind of generosity. When we slow down enough to see what is already here, ordinary things become interesting again.</p><p>What would change if we gave our everyday lives the same curiosity we bring to a new place?</p>',
  ],
  [
    'notebook',
    'drafting',
    'Notes from a quiet afternoon',
    'Notes',
    '',
    '<p>The light moves slowly across the desk. A cup of coffee goes cold. For once, there is no hurry.</p><ul><li>The sound of rain against the window.</li><li>A line from a book I want to remember.</li><li>The idea that rest can be productive, too.</li></ul>',
  ],
  [
    'creative',
    'review',
    'Making room for creative work',
    'Guide',
    '',
    '<p>Creative work needs space. Not necessarily a studio or an empty schedule, but a little room in the day where ideas can land.</p><h2>Protect a small window</h2><p>Start with twenty minutes. Put your phone somewhere else. Choose one thing to work on, and give it your full attention.</p>',
  ],
  [
    'slow',
    'published',
    'A case for taking the slower road',
    'Essay',
    'mint',
    '<p>Not every journey needs a shortcut. Sometimes the long way is where the good stories happen.</p>',
  ],
];
export function seedWorkspace(): Workspace {
  return {
    boards: [
      {
        id: 'writing-room',
        title: 'The writing room',
        description: 'A little space for big ideas.',
        color: '#a78bfa',
        lists: [
          { id: 'ideas', title: 'Ideas' },
          { id: 'drafting', title: 'Drafting' },
          { id: 'review', title: 'In review' },
          { id: 'published', title: 'Published' },
        ],
      },
    ],
    cards: sample.map(([id, listId, title, tag, cover, content]) => ({
      id,
      boardId: 'writing-room',
      listId,
      title,
      tag,
      cover,
      content,
      updatedAt: Date.now(),
    })),
  };
}
