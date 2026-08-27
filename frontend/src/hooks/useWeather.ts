import { useEffect, useState } from "react";
import { getDeviceLocationOnce } from "@/src/utils/location";
import { fetchCurrentWeather, interpretWeatherCode } from "@/src/utils/weather";

export type WeatherState = { tempC: number; hint: string; code: number };

/**
 * Extrait de `WeatherChip.tsx` pour que l'appelant (Dashboard) puisse savoir
 * AVANT de rendre s'il y a une donnée réelle — nécessaire pour ne pas
 * envelopper un `WeatherChip` vide dans une carte glass qui resterait
 * visible comme un rectangle vide (bug corrigé : la carte ne doit exister
 * que quand il y a vraiment quelque chose à afficher dedans). `undefined` =
 * chargement initial, `null` = géolocalisation refusée ou appel échoué.
 */
export function useWeather(): WeatherState | null | undefined {
  const [state, setState] = useState<WeatherState | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loc = await getDeviceLocationOnce();
      if (!loc) {
        if (!cancelled) setState(null);
        return;
      }
      const weather = await fetchCurrentWeather(loc.lat, loc.lon);
      if (cancelled) return;
      if (!weather) {
        setState(null);
        return;
      }
      setState({
        tempC: weather.tempC,
        code: weather.weatherCode,
        hint: interpretWeatherCode(weather.weatherCode, weather.tempC, weather.precipitationMm),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
