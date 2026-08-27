export function todayLocal(): string {
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const beijing = new Date(utc + 8 * 3600000);
  return `${beijing.getFullYear()}-${String(beijing.getMonth() + 1).padStart(2, "0")}-${String(beijing.getDate()).padStart(2, "0")}`;
}
