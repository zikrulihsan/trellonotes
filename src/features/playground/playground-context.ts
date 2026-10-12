import { createContext, useContext } from 'react';
import type { Landing } from '@/lib/supabase/landing';

/** The playground's sample landing page, kept in memory like the rest of its workspace. */
export interface PlaygroundValue {
  landing: Landing;
  saveLanding: (landing: Landing) => void;
}

/** Set inside the playground, where the workspace is sample data that is never saved. */
export const PlaygroundContext = createContext<PlaygroundValue | null>(null);

export const usePlayground = () => useContext(PlaygroundContext);
