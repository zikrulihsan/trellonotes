import { createContext, useContext } from 'react';

/** True inside the playground, where the workspace is sample data that is never saved. */
export const PlaygroundContext = createContext(false);

export const usePlayground = () => useContext(PlaygroundContext);
