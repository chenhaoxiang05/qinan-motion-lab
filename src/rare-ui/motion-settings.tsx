import React, { createContext, useContext } from 'react';
import { useReducedMotion } from 'motion/react';

export const MotionPausedContext = createContext(false);
export function useMotionPaused() {
  const manual = useContext(MotionPausedContext);
  const system = useReducedMotion();
  return manual || !!system;
}
