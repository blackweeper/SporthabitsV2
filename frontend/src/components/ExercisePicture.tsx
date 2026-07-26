import { View, Text, StyleSheet, Image } from 'react-native';
import { colors, radius } from '@/src/theme';
import { iconEmojiForExercise } from '@/src/data/exercise-icons';

type Props = {
  photoBase64?: string | null;
  iconKey?: string | null;
  name: string;
  size?: number;
  square?: boolean;
};

/** Small avatar showing exercise photo (if provided) or emoji icon fallback. */
export default function ExercisePicture({
  photoBase64,
  iconKey,
  name,
  size = 44,
  square = false,
}: Props) {
  const style = {
    width: size,
    height: size,
    borderRadius: square ? radius.sm : radius.md,
  } as const;

  if (photoBase64) {
    return (
      <Image
        source={{ uri: `data:image/jpeg;base64,${photoBase64}` }}
        style={[style, styles.img]}
      />
    );
  }
  const emoji = iconEmojiForExercise(name, iconKey);
  return (
    <View style={[style, styles.iconBox]}>
      <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  img: {
    backgroundColor: colors.surfaceTertiary,
  },
  iconBox: {
    backgroundColor: colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
