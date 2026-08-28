import { Redirect } from "expo-router";

/**
 * Route factice pour le slot "+" de la barre d'onglets — `tabBarButton`
 * (voir `_layout.tsx`) intercepte totalement l'appui et ouvre `QuickAddModal`
 * sans jamais déclencher la navigation par défaut, donc cet écran ne devrait
 * jamais réellement se monter. Ce repli existe uniquement pour le cas d'une
 * navigation programmatique/deep-link vers `/add` malgré tout.
 */
export default function AddTabPlaceholder() {
  return <Redirect href="/(tabs)" />;
}
