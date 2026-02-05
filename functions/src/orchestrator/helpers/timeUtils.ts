/**
 * Time Utilities
 * Zaman ve mood ile ilgili yardımcı fonksiyonlar
 */

export type TimeOfDay = "morning" | "noon" | "afternoon" | "evening" | "night";

/**
 * TRT saatine göre günün zamanını belirle
 */
export function getTimeOfDay(): TimeOfDay {
  const hourStr = new Date().toLocaleString("en-US", {
    timeZone: "Europe/Istanbul",
    hour: "numeric",
    hour12: false
  });
  const hour = parseInt(hourStr);

  if (hour >= 6 && hour < 11) return "morning";
  if (hour >= 11 && hour < 14) return "noon";
  if (hour >= 14 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 20) return "evening";
  return "night";
}

/**
 * Zamana göre mood belirle
 * ID'ler gemini-presets/mood-definitions collection'daki ID'lerle eşleşmeli
 * Mevcut preset ID'leri: morning-ritual, cozy-intimate, bright-airy
 */
export function getMoodFromTime(timeOfDay?: TimeOfDay): string {
  const time = timeOfDay || getTimeOfDay();

  // Gemini presets ile uyumlu ID'ler
  const moodMap: Record<TimeOfDay, string> = {
    morning: "morning-ritual",    // Sabah ritüeli - taze, aydınlık
    noon: "bright-airy",          // Aydınlık/Ferah - öğle için uygun
    afternoon: "bright-airy",     // Aydınlık/Ferah - öğleden sonra için uygun
    evening: "cozy-intimate",     // Samimi/Sıcak - akşam için uygun
    night: "cozy-intimate",       // Samimi/Sıcak - gece için uygun
  };

  return moodMap[time] || "cozy-intimate";
}
