import { View, Text, StyleSheet, Image } from "react-native";
import { useTheme } from "@/src/themes";
import { iconEmojiForExercise } from "@/src/data/exercise-icons";
import { ExerciseRecord } from "@/src/utils/exercise-records";
import { matchExerciseRecordLoose } from "@/src/utils/exercise-record-match";
import { CORE_LIBRARY_ASSETS } from "@/src/data/core-library-assets.generated";
import { useExerciseMedia } from "@/src/hooks/useExerciseMedia";

/**
 * Exercise thumbnail for list rows that only have a **name** (plan/program
 * rows, session history), not a library id — sibling to `ExercisePicture`
 * (left untouched, still used by its own ~10 call sites) rather than a
 * replacement for it. Resolution priority: `photoBase64` (custom user
 * photo, if the caller has one) → matched `ExerciseRecord` → bundled
 * illustration (`CORE_LIBRARY_ASSETS`, zero network) → cached network image
 * (`useExerciseMedia`) → emoji fallback (same visual language as
 * `ExercisePicture`, so mixed rows still feel consistent).
 */
export default function ExerciseThumbnail({
  name,
  records,
  photoBase64,
  iconKey,
  exerciseRecordId,
  size = 48,
  square = false,
}: {
  name: string;
  records: ExerciseRecord[];
  photoBase64?: string | null;
  iconKey?: string | null;
  /** Id déjà connu du record lié (évite de re-matcher par nom, qui échoue
   * silencieusement si le nom affiché diverge légèrement du `nameFr`/alias
   * enregistré) — additif, retombe sur la résolution par nom si absent. */
  exerciseRecordId?: string | null;
  size?: number;
  square?: boolean;
}) {
  const { theme } = useTheme();
  const byId = exerciseRecordId ? records.find((r) => r.id === exerciseRecordId) : undefined;
  const record = byId ?? matchExerciseRecordLoose(name, records);
  const bundled = record?.id ? CORE_LIBRARY_ASSETS[record.id] : undefined;
  const { uri: networkUri } = useExerciseMedia(!photoBase64 && !bundled ? record?.id ?? null : null);

  const style = {
    width: size,
    height: size,
    borderRadius: square ? theme.radius.sm : theme.radius.md,
  } as const;

  if (photoBase64) {
    return (
      <Image
        source={{ uri: `data:image/jpeg;base64,${photoBase64}` }}
        style={[style, { backgroundColor: theme.colors.surfaceTertiary }]}
        resizeMode="contain"
      />
    );
  }
  if (bundled) {
    return (
      <Image source={bundled} style={[style, { backgroundColor: theme.colors.surfaceTertiary }]} resizeMode="contain" />
    );
  }
  if (networkUri) {
    return (
      <Image
        source={{ uri: networkUri }}
        style={[style, { backgroundColor: theme.colors.surfaceTertiary }]}
        resizeMode="contain"
      />
    );
  }
  const emoji = iconEmojiForExercise(name, iconKey);
  return (
    <View style={[style, styles.iconBox, { backgroundColor: theme.colors.brandTertiary }]}>
      <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  iconBox: { alignItems: "center", justifyContent: "center" },
});
