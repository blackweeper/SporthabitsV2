import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { shadow } from "@/src/theme";
import { useTheme } from "@/src/themes";

/**
 * Remplacement direct des `View`+styles ad hoc des cartes du Dashboard.
 * Mode "flat" (Classique) : pur passe-plat — le `style` de l'appelant
 * (fond/bordure/radius déjà définis là-bas) s'applique tel quel, rendu
 * byte-identique à avant l'introduction du système de thèmes. Mode "glass"
 * (Sunset) : flou (`expo-blur`, déjà dépendance) + teinte semi-transparente
 * + radius généreux + ombre — le `style` de l'appelant reste appliqué pour
 * la mise en page (padding/gap/bordure d'accent type `borderLeftColor`),
 * seules les propriétés de fond/bordure générale/radius sont reprises.
 */
export default function GlassCard({
  children,
  style,
  testID,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { theme } = useTheme();

  if (theme.card.mode === "flat") {
    return (
      <View testID={testID} style={style}>
        {children}
      </View>
    );
  }

  return (
    <View
      testID={testID}
      style={[
        style,
        {
          backgroundColor: "transparent",
          borderColor: theme.colors.borderStrong,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: theme.radius.lg,
          overflow: "hidden",
          ...shadow.card,
        },
      ]}
    >
      <BlurView intensity={theme.card.blurIntensity} tint="dark" style={StyleSheet.absoluteFillObject} />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.card.tint }]} />
      {children}
    </View>
  );
}
