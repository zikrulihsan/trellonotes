import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

/** The rich-text features shared by the writing editor and the public reader. */
export function writingExtensions(placeholder?: string) {
  return [
    StarterKit.configure({
      link: {
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      },
    }),
    ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
  ];
}
