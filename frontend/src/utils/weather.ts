/**
 * Météo actuelle via Open-Meteo (gratuit, sans clé API). Conditions
 * actuelles uniquement — pas de prévision — pour le petit encart à côté du
 * calendrier du Dashboard.
 */
export type CurrentWeather = {
  tempC: number;
  weatherCode: number;
  precipitationMm: number;
};

export async function fetchCurrentWeather(lat: number, lon: number): Promise<CurrentWeather | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,weather_code&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const body = await res.json();
    const current = body?.current;
    if (!current || typeof current.temperature_2m !== "number") return null;
    return {
      tempC: current.temperature_2m,
      weatherCode: typeof current.weather_code === "number" ? current.weather_code : 0,
      precipitationMm: typeof current.precipitation === "number" ? current.precipitation : 0,
    };
  } catch {
    return null;
  }
}

const THUNDER_CODES = new Set([95, 96, 99]);
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const CLEAR_CODES = new Set([0, 1, 2]);

/** Court message FR indiquant si les conditions se prêtent à un entraînement
 * en extérieur — dérivé du code météo WMO (Open-Meteo) + température. */
export function interpretWeatherCode(code: number, tempC: number, precipitationMm: number): string {
  if (THUNDER_CODES.has(code)) return "Orage — mieux vaut s'entraîner à l'intérieur";
  if (precipitationMm > 0.3 || RAIN_CODES.has(code)) return "Pluie — pense à une séance en intérieur";
  if (SNOW_CODES.has(code)) return "Neige — prudence si tu sors";
  if (tempC <= 2) return "Très froid — couvre-toi bien si tu sors";
  if (tempC >= 32) return "Forte chaleur — hydrate-toi bien";
  if (CLEAR_CODES.has(code)) return "Bon pour s'entraîner dehors";
  return "Conditions correctes pour sortir";
}
