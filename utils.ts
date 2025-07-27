

export function customDateNow(): string {
  const now = new Date();
  return now.toLocaleString("id-ID", {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short"
  });
}
