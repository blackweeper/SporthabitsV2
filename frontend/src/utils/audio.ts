import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

// French voice with a fast rate for numeric countdown
const NUMBER_OPTS: Speech.SpeechOptions = {
  language: 'fr-FR',
  rate: 1.2,
  pitch: 1.1,
};

const PHRASE_OPTS: Speech.SpeechOptions = {
  language: 'fr-FR',
  rate: 1.0,
  pitch: 1.0,
};

export function speak(text: string, opts: Speech.SpeechOptions = PHRASE_OPTS) {
  try {
    // Cancel anything currently speaking so short countdown feels responsive
    Speech.stop();
    Speech.speak(text, opts);
  } catch {
    // Speech may not be available on web/older environments – silently ignore
  }
}

export function speakNumber(n: number) {
  speak(String(n), NUMBER_OPTS);
}

export function speakStop() {
  try {
    Speech.stop();
  } catch {}
}

// Trigger phrase used for "get ready" call-outs
export function speakGo(text = "C'est parti") {
  // Speech engine on web can be flaky right after first user gesture – wrap in setTimeout
  if (Platform.OS === 'web') {
    setTimeout(() => speak(text), 50);
    return;
  }
  speak(text);
}
