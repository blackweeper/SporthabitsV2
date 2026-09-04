import { Platform } from 'react-native';
import { getAppSettings } from '@/src/utils/app-settings';

/** Ce que le sélecteur de fichier (expo-document-picker) renvoie, sur toutes
 * plateformes. `webFile` n'existe que sur web (PWA) — c'est un vrai `File`
 * du navigateur (voir DocumentPickerAsset.file dans expo-document-picker) :
 * FormData exige un Blob/File réel sur web, l'objet {uri,name,type} qui
 * fonctionne sur iOS/Android n'y est pas exploitable. */
export type PickedPdfFile = {
  uri: string;
  name: string;
  webFile?: File;
};

/**
 * Client HTTP pour le backend d'import PDF via IA (routers/pdf_import.py,
 * routers/ai.py). Réutilise volontairement les mêmes réglages que la synchro
 * santé (`healthSyncBaseUrl`/`healthSyncToken` dans app-settings.ts) : c'est
 * le même backend, protégé par le même token partagé (HEALTH_IMPORT_TOKEN
 * côté serveur) — pas besoin d'un second écran de réglages.
 */

export type PdfUploadResponse = {
  draft_id: string;
  filename: string;
  page_count: number;
  total_chars: number;
  total_words: number;
  needs_ocr: boolean;
  extracted_text: string | null;
  message: string;
};

export type PdfExerciseAnalysis = {
  name: string;
  sets: number | null;
  reps: string | null;
  weight: string | null;
  duration: string | null;
  distance: string | null;
  rest: string | null;
  tempo: string | null;
  notes: string | null;
  ambiguous: boolean;
};

export type PdfDayAnalysis = { day: number; name: string | null; exercises: PdfExerciseAnalysis[] };
export type PdfWeekAnalysis = { week: number; days: PdfDayAnalysis[] };
export type PdfProgramAnalysis = {
  name: string;
  description: string | null;
  duration_weeks: number | null;
  weeks: PdfWeekAnalysis[];
};

export type PdfAmbiguity = { exercise_name: string; reason: string; possible_interpretations: string[] };

export type PdfAnalysisResult = {
  program: PdfProgramAnalysis;
  ambiguities: PdfAmbiguity[];
  missing_info: string[];
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
};

export type PdfAnalyzeResponse = {
  draft_id: string;
  status: string;
  analysis: PdfAnalysisResult | null;
  message: string;
};

/** Levée quand l'URL du backend / le token ne sont pas configurés. */
export class PdfImportConfigError extends Error {}

/** Levée pour toute réponse HTTP non-2xx du backend. */
export class PdfImportApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

async function getBackendConfig(): Promise<{ baseUrl: string; token: string }> {
  const settings = await getAppSettings();
  const baseUrl = settings.healthSyncBaseUrl?.trim();
  const token = settings.healthSyncToken?.trim();
  if (!baseUrl || !token) {
    throw new PdfImportConfigError(
      "Configure d'abord l'URL du backend et le token dans Réglages > Synchro santé.",
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ''), token };
}

async function extractErrorMessage(res: Response): Promise<string> {
  if (res.status === 401) return 'Token invalide.';
  try {
    const body = await res.json();
    if (typeof body?.detail === 'string') return body.detail;
  } catch {
    // pas de corps JSON exploitable — on retombe sur le message générique
  }
  return `Erreur serveur (${res.status}).`;
}

export async function uploadPdf(file: PickedPdfFile): Promise<PdfUploadResponse> {
  const { baseUrl, token } = await getBackendConfig();

  const formData = new FormData();
  // Ne jamais fixer 'Content-Type' à la main sur la requête, fetch doit
  // générer lui-même la boundary multipart — sur web comme sur natif.
  if (Platform.OS === 'web') {
    if (!file.webFile) {
      throw new PdfImportApiError("Fichier illisible dans ce navigateur — réessaie de le sélectionner.");
    }
    // Sur web, FormData exige un vrai Blob/File — l'objet {uri,name,type}
    // utilisé sur natif n'est pas exploitable ici.
    formData.append('file', file.webFile, file.name);
  } else {
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: 'application/pdf',
    } as any);
  }

  const res = await fetch(`${baseUrl}/api/pdf-import/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    throw new PdfImportApiError(await extractErrorMessage(res), res.status);
  }
  return res.json();
}

export async function analyzePdf(draftId: string): Promise<PdfAnalyzeResponse> {
  const { baseUrl, token } = await getBackendConfig();

  const res = await fetch(`${baseUrl}/api/pdf-import/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ draft_id: draftId }),
  });
  if (!res.ok) {
    throw new PdfImportApiError(await extractErrorMessage(res), res.status);
  }
  return res.json();
}

/**
 * Best-effort : marque le draft comme "validated" côté backend, pour l'audit
 * (historique Mongo des PDF importés). La création réelle du programme se
 * fait TOUJOURS localement via saveCustomProgram() — l'app est mono-
 * utilisateur/locale, il n'existe aucun programme côté serveur. Les erreurs
 * sont volontairement avalées : un souci réseau ici ne doit jamais empêcher
 * l'import local, déjà effectué au moment où cette fonction est appelée.
 */
export async function markDraftValidated(draftId: string): Promise<void> {
  try {
    const { baseUrl, token } = await getBackendConfig();
    await fetch(`${baseUrl}/api/pdf-import/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ draft_id: draftId }),
    });
  } catch (err) {
    if (__DEV__) console.warn('[PdfImport] validate (best-effort) a échoué :', err);
  }
}
