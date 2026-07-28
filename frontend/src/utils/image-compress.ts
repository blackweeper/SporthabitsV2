import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert } from 'react-native';

/**
 * Pick a photo (camera or gallery), resize and re-encode it as WebP to keep
 * local storage small — the app is fully AsyncStorage-based, so every image
 * added by the user is stored as base64 on-device.
 * Returns the base64 payload (no `data:` prefix, matching the existing
 * `photoBase64` convention) or null if the user cancelled / permission was
 * denied.
 */
export async function pickAndCompressImage(
  source: 'camera' | 'library',
  options?: { width?: number; compress?: number },
): Promise<string | null> {
  const fromCamera = source === 'camera';
  const perm = fromCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      'Permission requise',
      fromCamera
        ? "Autorise l'accès à la caméra pour prendre une photo."
        : "Autorise l'accès aux photos pour en choisir une.",
    );
    return null;
  }

  const res = fromCamera
    ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.85 })
    : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });
  if (res.canceled || !res.assets?.length) return null;

  try {
    const m = await ImageManipulator.manipulateAsync(
      res.assets[0].uri,
      [{ resize: { width: options?.width ?? 480 } }],
      {
        compress: options?.compress ?? 0.7,
        format: ImageManipulator.SaveFormat.WEBP,
        base64: true,
      },
    );
    return m.base64 ?? null;
  } catch {
    Alert.alert('Erreur', "Impossible de traiter cette image.");
    return null;
  }
}
