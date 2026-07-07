/* eslint-disable @typescript-eslint/no-explicit-any */

export function logInfo(...args: any[]): void {
  console.log(...args);
}

export function logWarning(...args: any[]): void {
  console.warn(...args);
}

export function logError(...args: any[]): void {
  console.error(...args);
}
