export function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return "오늘";
  if (sameDay(date, yesterday)) return "어제";
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
}

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
