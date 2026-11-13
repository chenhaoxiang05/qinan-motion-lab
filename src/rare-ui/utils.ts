import { clsx, type ClassValue } from 'clsx';

// Rare utilities are prefixed; clsx preserves them without stripping the namespace.
export function cn(...values: ClassValue[]) {
  return clsx(values);
}
