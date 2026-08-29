import { StatusBar } from "react-native";
import { useTheme } from "./ThemeProvider";

/**
 * `StatusBar` (Android — no-op sur iOS/web) piloté par le thème actif, à la
 * place d'un `backgroundColor` en dur : les deux thèmes sont proches (quasi
 * noir) mais restent chacun leur propre valeur (`theme.colors.surface`),
 * cohérent avec la règle "pas de couleur d'identité codée en dur" du reste
 * du Design System.
 */
export default function ThemedStatusBar() {
  const { theme } = useTheme();
  return <StatusBar barStyle="light-content" backgroundColor={theme.colors.surface} />;
}
