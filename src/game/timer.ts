/**
 * Screen-reader text for the timer. It only changes at 30, 20 and 10 seconds left, so the live
 * region speaks every 10s instead of every second (PRD §4.4).
 */
export function timerAnnouncement(remainingMs: number): string {
  const bucket = Math.ceil(remainingMs / 10_000) * 10;
  return bucket > 0 ? `Restam ${bucket} segundos` : '';
}
