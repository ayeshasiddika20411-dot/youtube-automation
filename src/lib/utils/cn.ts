import { clsx, type ClassValue } from "clsx";

/** Merge Tailwind classes with clsx */
export function cn(...inputs: ClassValue[]) {
  return clsx(...inputs);
}
