import { useEffect, useState } from "react";
import { Platform } from "react-native";

/**
 * Filet de sécurité pour l'inset de sécurité HAUT sur web/PWA — bug trouvé
 * en auditant `react-native-safe-area-context` : sa mesure web
 * (`NativeSafeAreaProvider.web.tsx`) ajoute un `<div>` sentinelle au DOM et
 * lit `getComputedStyle(...).paddingTop` en même temps, en une seule fois,
 * au tout premier montage — sans jamais se re-déclencher ensuite (pas
 * d'écouteur `resize`, la transition CSS censée re-déclencher la lecture ne
 * se produit jamais puisque le padding n'est jamais réellement ANIMÉ d'une
 * valeur à une autre). Au lancement à froid d'une PWA installée iOS,
 * `env(safe-area-inset-top)` peut ne pas encore être résolu par le moteur
 * de rendu au moment exact de cette lecture unique (transition de
 * lancement pas terminée) — la valeur lue reste alors bloquée à 0 pour
 * toute la session, jamais corrigée : exactement le symptôme "contenu
 * collé/coupé en haut, décalage visible parfois" (dépend du timing du
 * lancement, pas systématique).
 *
 * Mesure la même valeur nous-mêmes, à plusieurs instants (montage, 2
 * `requestAnimationFrame`, 500ms, `pageshow`, retour au premier plan) —
 * a le temps de capter la vraie valeur même si la bibliothèque a raté son
 * unique fenêtre de mesure. Ne fait jamais RÉDUIRE la valeur déjà connue
 * (seulement corriger un 0 resté bloqué) — jamais de régression si la
 * bibliothèque a déjà la bonne valeur. `0` sur natif/SSR (aucun DOM).
 */
export function useWebSafeAreaTopFallback(): number {
  const [top, setTop] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    const measure = () => {
      const el = document.createElement("div");
      el.style.position = "fixed";
      el.style.top = "0";
      el.style.left = "0";
      el.style.height = "0";
      el.style.width = "0";
      el.style.visibility = "hidden";
      el.style.pointerEvents = "none";
      (el.style as any).paddingTop = "env(safe-area-inset-top)";
      document.body.appendChild(el);
      const raw = window.getComputedStyle(el).paddingTop;
      document.body.removeChild(el);
      const value = raw ? parseInt(raw, 10) : 0;
      if (Number.isFinite(value) && value > 0) {
        setTop((prev) => (value > prev ? value : prev));
      }
    };

    measure();
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(measure);
    });
    const timeout = setTimeout(measure, 500);
    window.addEventListener("pageshow", measure);
    document.addEventListener("visibilitychange", measure);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(timeout);
      window.removeEventListener("pageshow", measure);
      document.removeEventListener("visibilitychange", measure);
    };
  }, []);

  return top;
}
