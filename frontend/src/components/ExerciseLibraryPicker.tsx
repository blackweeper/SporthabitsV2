import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  SectionList,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { coloredShadow, colors, radius, spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import GlassCard from "@/src/components/ui/GlassCard";
import {
  EXERCISE_CATEGORY_COLOR,
  EXERCISE_CATEGORY_ICON,
  EXERCISE_CATEGORY_LABEL,
  ExerciseCategory,
} from "@/src/utils/exercise-category";
import {
  CustomExercise,
  deleteCustomExercise,
  saveCustomExercise,
  uid,
} from "@/src/utils/gym-storage";
import { iconEmojiForExercise } from "@/src/data/exercise-icons";
import { LIBRARY_MUSCLE_GROUPS, MuscleGroupKey } from "@/src/utils/muscle-groups";
import { pickAndCompressImage } from "@/src/utils/image-compress";
import SwipeableRow from "@/src/components/SwipeableRow";
import { ExerciseLibraryItem, useExerciseLibraryItems } from "@/src/hooks/useExerciseLibraryItems";
import { useExerciseMedia } from "@/src/hooks/useExerciseMedia";
import { isCoreVisible } from "@/src/utils/exercise-records";
import { CategoryTabRow, LibTab, MuscleChipRow } from "@/src/components/exercise-library/ExerciseFilterChips";
import { FUTURE_COLLECTION_LABEL, type FutureCollection } from "@/src/utils/exercise-collection";

const CATEGORIES: ExerciseCategory[] = ["musculation", "cardio_machine", "mobility"];

/** Résout sa propre image (id -> IronFlow -> WorkoutX -> emoji) plutôt que de
 * dépendre d'un champ précalculé — voir useExerciseMedia.ts. Composant à
 * part pour respecter les règles des hooks (un hook par ligne de liste, pas
 * dans le callback `renderItem` directement). */
function PickerRowImage({ item, color }: { item: ExerciseLibraryItem; color: string }) {
  const { uri: mediaUri } = useExerciseMedia(item.isCustom ? null : item.id);
  if (mediaUri) return <Image source={{ uri: mediaUri }} style={styles.rowImage} />;
  if (item.imageBase64) {
    return (
      <Image
        source={{ uri: `data:image/webp;base64,${item.imageBase64}` }}
        style={styles.rowImage}
      />
    );
  }
  return (
    <View style={[styles.rowIcon, { backgroundColor: withAlpha(color, 15) }]}>
      {item.emoji ? (
        <Text style={{ fontSize: 16 }}>{item.emoji}</Text>
      ) : (
        <Text style={{ fontSize: 16 }}>{iconEmojiForExercise(item.name, null)}</Text>
      )}
    </View>
  );
}

/**
 * Exercise picker sourced from the same data as Progression → Exercices
 * (the built-in library plus every exercise the user has actually logged),
 * with instant search, favorites, and a quick "create new" fallback.
 */
export default function ExerciseLibraryPicker({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  /** `exerciseRecordId` additif — `null`/absent pour un exercice personnalisé
   * ou la création rapide ; les appelants existants qui n'utilisent que
   * `name` continuent de fonctionner sans changement. */
  onPick: (name: string, exerciseRecordId?: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<LibTab>("all");
  const [muscle, setMuscle] = useState<MuscleGroupKey | null>(null);
  const [sheet, setSheet] = useState<{ mode: "create" | "edit"; draft: CustomExercise } | null>(
    null,
  );
  // Catalogue limité aux ~300 Core par défaut — déplié seulement si demandé.
  const [showDiscover, setShowDiscover] = useState(false);

  const {
    items,
    customExercises,
    reload,
    reloadCustom,
    toggleFavorite,
    toggleLibrary,
    addAllInCollection,
  } = useExerciseLibraryItems(visible);
  const [downloadingCollection, setDownloadingCollection] = useState<FutureCollection | null>(
    null,
  );

  useEffect(() => {
    if (!visible) return;
    setQuery("");
    setTab("all");
    setMuscle(null);
    setShowDiscover(false);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items;
    if (tab === "favorites") list = list.filter((i) => i.favorite);
    else if (tab !== "all") list = list.filter((i) => i.category === tab);
    if (tab === "musculation" && muscle) {
      list = list.filter((i) => i.muscleGroups?.includes(muscle));
    }
    if (q) list = list.filter((i) => i.name.toLowerCase().includes(q));
    return list.slice().sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });
  }, [items, query, tab, muscle]);

  const exactMatch = filtered.some(
    (i) => i.name.toLowerCase().trim() === query.trim().toLowerCase(),
  );

  const onToggleFavorite = toggleFavorite;

  // Recherche unifiée, sans changement de contexte : une seule liste, juste
  // partitionnée en sections. Une section vide n'affiche pas d'en-tête —
  // pas de "Ma bibliothèque (0)" qui casserait l'effet de continuité. V3 —
  // "Ma bibliothèque" contient nativement les ~300 exercices officiels
  // (isCoreVisible ⟹ inLibrary, voir useExerciseLibraryItems.ts) : plus de
  // section "Catalogue" séparée à remplir, elle serait toujours vide par
  // construction. Seul le reste (futures Collections) n'apparaît que si
  // l'utilisateur déplie "Afficher plus" — pas de nouvel écran, cohérent
  // avec library.tsx.
  const { sections, discoverCount } = useMemo(() => {
    const inLibrary = filtered.filter((i) => i.inLibrary);
    const discover = filtered.filter((i) => !i.inLibrary && !isCoreVisible(i.exerciseTier));
    const result: { key: string; title: string; data: ExerciseLibraryItem[] }[] = [];
    if (inLibrary.length > 0) {
      result.push({ key: "library", title: "Ma bibliothèque", data: inLibrary });
    }
    // Catalogue intelligent (Phase 1, POLISH V2) : une recherche active
    // déplie automatiquement la section "Autres exercices" — l'utilisateur
    // ne devrait pas avoir à deviner qu'un bouton "afficher plus" existe
    // pour trouver un exercice qu'il vient de chercher explicitement.
    if ((showDiscover || query.trim().length > 0) && discover.length > 0) {
      result.push({ key: "discover", title: "Autres exercices (Collections)", data: discover });
    }
    return { sections: result, discoverCount: discover.length };
  }, [filtered, showDiscover, query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable testID="close-ex-library" onPress={onClose} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>Bibliothèque d&apos;exercices</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={colors.onSurfaceTertiary} />
          <TextInput
            testID="ex-library-search"
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un exercice…"
            placeholderTextColor={colors.onSurfaceTertiary}
            autoFocus
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.onSurfaceTertiary} />
            </Pressable>
          )}
        </View>

        <CategoryTabRow tab={tab} onChange={setTab} />

        {tab === "musculation" && <MuscleChipRow muscle={muscle} onChange={setMuscle} />}

        <SectionList
          sections={sections}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          ListFooterComponent={
            !showDiscover && !query.trim() && discoverCount > 0 ? (
              <Pressable
                testID="ex-library-show-discover"
                style={styles.showMoreRow}
                onPress={() => setShowDiscover(true)}
              >
                <Ionicons name="chevron-down-circle-outline" size={18} color={colors.onSurfaceTertiary} />
                <Text style={styles.showMoreText}>
                  Afficher {discoverCount} exercice{discoverCount > 1 ? "s" : ""} supplémentaire
                  {discoverCount > 1 ? "s" : ""} (futures Collections)
                </Text>
              </Pressable>
            ) : null
          }
          ListHeaderComponent={
            query.trim() && !exactMatch ? (
              <Pressable
                testID="ex-library-create-new"
                style={styles.createRow}
                onPress={() =>
                  setSheet({
                    mode: "create",
                    draft: {
                      id: uid(),
                      nameFr: query.trim(),
                      nameEn: null,
                      category: "musculation",
                      muscleGroups: [],
                      equipment: null,
                      description: null,
                      imageBase64: null,
                      createdAt: new Date().toISOString(),
                    },
                  })
                }
              >
                <Ionicons name="add-circle" size={22} color={colors.brand} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.createRowTitle}>
                    Créer «{query.trim()}»
                  </Text>
                  <Text style={styles.createRowSub}>
                    Nouvel exercice, absent de la bibliothèque
                  </Text>
                </View>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            !query.trim() ? (
              <Text style={styles.emptyText}>
                {tab === "favorites"
                  ? "Aucun exercice favori pour l'instant."
                  : "Aucun exercice dans cette catégorie."}
              </Text>
            ) : null
          }
          renderItem={({ item }) => {
            const color = EXERCISE_CATEGORY_COLOR[item.category];
            const row = (
              <Pressable
                testID={`ex-library-item-${item.name}`}
                style={styles.row}
                // Choisir un exercice du Catalogue pour la séance en cours
                // ne l'ajoute PAS automatiquement à la bibliothèque — action
                // volontairement distincte du bouton dédié ci-dessous.
                // L'ajout automatique par usage réel relève de l'Étape G
                // (pas encore construite), pas de ce picker.
                onPress={() => onPick(item.name, item.isCustom ? null : item.id)}
              >
                <PickerRowImage item={item} color={color} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.rowSub}>
                    {!isCoreVisible(item.exerciseTier) && !item.inLibrary
                      ? "À découvrir · pas encore dans ta bibliothèque"
                      : item.count > 0
                        ? `${item.count} séance${item.count > 1 ? "s" : ""}`
                        : "Pas encore pratiqué"}
                  </Text>
                </View>
                {!item.inLibrary && !isCoreVisible(item.exerciseTier) && item.collections?.[0] && (
                  <Pressable
                    testID={`ex-library-pack-${item.name}`}
                    hitSlop={6}
                    onPress={async (e) => {
                      e.stopPropagation?.();
                      const pack = item.collections![0];
                      setDownloadingCollection(pack);
                      await addAllInCollection(pack);
                      setDownloadingCollection(null);
                    }}
                    style={styles.packBtn}
                  >
                    <Text style={styles.packBtnText}>
                      {downloadingCollection === item.collections[0]
                        ? "…"
                        : `Tout ${FUTURE_COLLECTION_LABEL[item.collections[0]]}`}
                    </Text>
                  </Pressable>
                )}
                {!item.inLibrary && (
                  <Pressable
                    testID={`ex-library-add-library-${item.name}`}
                    hitSlop={10}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      toggleLibrary(item.id);
                    }}
                    style={styles.favBtn}
                  >
                    <Ionicons name="add-circle-outline" size={20} color={colors.brand} />
                  </Pressable>
                )}
                <Pressable
                  testID={`ex-library-fav-${item.name}`}
                  hitSlop={10}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    onToggleFavorite(item.id);
                  }}
                  style={styles.favBtn}
                >
                  <Ionicons
                    name={item.favorite ? "star" : "star-outline"}
                    size={18}
                    color={item.favorite ? "#FFC107" : colors.onSurfaceTertiary}
                  />
                </Pressable>
              </Pressable>
            );

            if (!item.isCustom || !item.customId) return row;
            const customId = item.customId;
            return (
              <SwipeableRow
                testID={`ex-library-custom-${customId}`}
                onDelete={async () => {
                  await deleteCustomExercise(customId);
                  reloadCustom();
                }}
                deleteConfirm={{
                  title: "Supprimer cet exercice ?",
                  message: `"${item.name}" sera retiré de ta bibliothèque personnalisée.`,
                  confirmLabel: "SUPPRIMER",
                  destructive: true,
                }}
                onEdit={() => {
                  const full = customExercises.find((c) => c.id === customId);
                  if (full) setSheet({ mode: "edit", draft: full });
                }}
              >
                {row}
              </SwipeableRow>
            );
          }}
        />
      </View>

      <NewExerciseSheet
        state={sheet}
        onClose={() => setSheet(null)}
        onSave={async (exercise) => {
          await saveCustomExercise(exercise);
          await reloadCustom();
          setSheet(null);
          if (sheet?.mode === "create") onPick(exercise.nameFr);
        }}
        onDelete={
          sheet?.mode === "edit"
            ? async () => {
                await deleteCustomExercise(sheet.draft.id);
                await reloadCustom();
                setSheet(null);
              }
            : undefined
        }
      />
    </Modal>
  );
}

export function NewExerciseSheet({
  state,
  onClose,
  onSave,
  onDelete,
}: {
  state: { mode: "create" | "edit"; draft: CustomExercise } | null;
  onClose: () => void;
  onSave: (e: CustomExercise) => void;
  onDelete?: () => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<CustomExercise | null>(null);

  useEffect(() => {
    if (state) setDraft(state.draft);
  }, [state]);

  if (!state || !draft) return null;

  const set = <K extends keyof CustomExercise>(k: K, v: CustomExercise[K]) =>
    setDraft((prev) => (prev ? { ...prev, [k]: v } : prev));

  const toggleMuscle = (key: MuscleGroupKey) => {
    const cur = draft.muscleGroups ?? [];
    set("muscleGroups", cur.includes(key) ? cur.filter((m) => m !== key) : [...cur, key]);
  };

  const pickImage = async (source: "camera" | "library") => {
    const base64 = await pickAndCompressImage(source);
    if (base64) set("imageBase64", base64);
  };

  // Bottom Sheet à 3 zones (header fixe / corps scrollable / footer fixe) —
  // même correctif que `QuantityModal` (HabitCard.tsx) : cette feuille avait
  // le même bug de fond (`KeyboardAvoidingView` sans `flex:1`, `maxHeight`
  // en pourcentage résolu contre un ancêtre à hauteur indéfinie), ce qui la
  // laissait grandir sans borne fiable — "la popup devient trop grande" +
  // décalages au clavier. `KeyboardAvoidingView` remplit tout l'écran et
  // pousse son contenu au-dessus du clavier ; la feuille elle-même est
  // bornée par `maxHeight:"88%"` **relatif à cette box pleine hauteur**,
  // recalculé à chaque layout — jamais figé. Seul le corps (champs du
  // formulaire) défile ; le footer (Enregistrer/Supprimer) reste fixe et
  // toujours visible, jamais recouvert par le clavier ni par le contenu.
  return (
    <Modal
      visible={!!state}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.sheetBackdrop, { backgroundColor: theme.colors.overlay }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        {/* `blur={false}` — cause racine confirmée (voir `ExerciseLinkModal`) :
            le `Modal animationType="slide"` de React Native Web garde une
            animation CSS active (transform en matrice, `animationPlayState:
            "running"` en continu) sur son conteneur tant que la feuille est
            ouverte — casse la composition de `backdrop-filter` sur WebKit,
            même famille de bug que `Swipeable`. Vérifié en direct : sans ce
            correctif, tout le formulaire (champs, labels) restait flouté et
            illisible pendant toute l'ouverture de cette feuille. */}
        <GlassCard
          level="elevated"
          blur={false}
          style={[
            styles.sheet,
            { borderRadius: theme.radius.lg },
            theme.card.mode !== "glass" && { backgroundColor: theme.colors.surfaceSecondary },
          ]}
        >
          <View style={[styles.sheetHandle, { backgroundColor: theme.colors.border }]} />
          <Text style={[styles.sheetTitle, { color: theme.colors.onSurface }]}>
            {state.mode === "create" ? "Nouvel exercice" : "Modifier l'exercice"}
          </Text>
          <ScrollView
            style={styles.sheetBody}
            contentContainerStyle={styles.sheetBodyContent}
            keyboardShouldPersistTaps="handled"
          >

            <Text style={[styles.miniLabel, { color: theme.colors.onSurfaceTertiary }]}>Nom (français)</Text>
            <TextInput
              testID="new-ex-name-fr"
              style={[
                styles.input,
                { backgroundColor: theme.colors.surfaceTertiary, borderRadius: theme.radius.md, color: theme.colors.onSurface, borderColor: theme.colors.border },
              ]}
              value={draft.nameFr}
              onChangeText={(t) => set("nameFr", t)}
              placeholder="Ex: Développé incliné haltères"
              placeholderTextColor={theme.colors.onSurfaceTertiary}
            />

            <Text style={[styles.miniLabel, { color: theme.colors.onSurfaceTertiary }]}>Nom (anglais, optionnel)</Text>
            <TextInput
              testID="new-ex-name-en"
              style={[
                styles.input,
                { backgroundColor: theme.colors.surfaceTertiary, borderRadius: theme.radius.md, color: theme.colors.onSurface, borderColor: theme.colors.border },
              ]}
              value={draft.nameEn ?? ""}
              onChangeText={(t) => set("nameEn", t || null)}
              placeholder="Ex: Incline Dumbbell Press"
              placeholderTextColor={theme.colors.onSurfaceTertiary}
            />

            <Text style={[styles.miniLabel, { color: theme.colors.onSurfaceTertiary }]}>Catégorie</Text>
            <View style={styles.chipWrap}>
              {CATEGORIES.map((c) => {
                const active = draft.category === c;
                return (
                  <Pressable
                    key={c}
                    testID={`new-ex-cat-${c}`}
                    style={[
                      styles.tabChip,
                      { borderRadius: theme.radius.pill },
                      !active && { backgroundColor: theme.colors.surfaceTertiary, borderColor: theme.colors.border },
                      active &&
                        (theme.card.mode === "glass"
                          ? { backgroundColor: withAlpha(theme.colors.brand, 20), borderColor: withAlpha(theme.colors.brand, 50) }
                          : { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand }),
                    ]}
                    onPress={() => set("category", c)}
                  >
                    <Ionicons
                      name={EXERCISE_CATEGORY_ICON[c]}
                      size={12}
                      color={active ? (theme.card.mode === "glass" ? theme.colors.brand : "#fff") : EXERCISE_CATEGORY_COLOR[c]}
                    />
                    <Text
                      style={[
                        styles.tabChipText,
                        { color: active ? (theme.card.mode === "glass" ? theme.colors.brand : "#fff") : theme.colors.onSurfaceTertiary },
                      ]}
                    >
                      {EXERCISE_CATEGORY_LABEL[c]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.miniLabel, { color: theme.colors.onSurfaceTertiary }]}>Groupes musculaires</Text>
            <View style={styles.chipWrap}>
              {LIBRARY_MUSCLE_GROUPS.map((mg) => {
                const active = (draft.muscleGroups ?? []).includes(mg.key);
                return (
                  <Pressable
                    key={mg.key}
                    testID={`new-ex-muscle-${mg.key}`}
                    style={[
                      styles.muscleChip,
                      { borderRadius: theme.radius.pill },
                      !active && { backgroundColor: theme.colors.surfaceTertiary, borderColor: theme.colors.border },
                      active &&
                        (theme.card.mode === "glass"
                          ? { backgroundColor: withAlpha(theme.colors.brand, 20), borderColor: withAlpha(theme.colors.brand, 50) }
                          : { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand }),
                    ]}
                    onPress={() => toggleMuscle(mg.key)}
                  >
                    <Text style={styles.tabEmoji}>{mg.emoji}</Text>
                    <Text
                      style={[
                        styles.muscleChipText,
                        { color: active ? (theme.card.mode === "glass" ? theme.colors.brand : "#fff") : theme.colors.onSurfaceTertiary },
                      ]}
                    >
                      {mg.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.miniLabel, { color: theme.colors.onSurfaceTertiary }]}>Matériel (optionnel)</Text>
            <TextInput
              testID="new-ex-equipment"
              style={[
                styles.input,
                { backgroundColor: theme.colors.surfaceTertiary, borderRadius: theme.radius.md, color: theme.colors.onSurface, borderColor: theme.colors.border },
              ]}
              value={draft.equipment ?? ""}
              onChangeText={(t) => set("equipment", t || null)}
              placeholder="Ex: Haltères, banc incliné"
              placeholderTextColor={theme.colors.onSurfaceTertiary}
            />

            <Text style={[styles.miniLabel, { color: theme.colors.onSurfaceTertiary }]}>Description (optionnel)</Text>
            <TextInput
              testID="new-ex-description"
              style={[
                styles.input,
                { backgroundColor: theme.colors.surfaceTertiary, borderRadius: theme.radius.md, color: theme.colors.onSurface, borderColor: theme.colors.border },
                { minHeight: 70, textAlignVertical: "top" },
              ]}
              value={draft.description ?? ""}
              onChangeText={(t) => set("description", t || null)}
              placeholder="Consignes, points de repère…"
              placeholderTextColor={theme.colors.onSurfaceTertiary}
              multiline
            />

            <Text style={[styles.miniLabel, { color: theme.colors.onSurfaceTertiary }]}>Photo (optionnel)</Text>
            {draft.imageBase64 ? (
              <View style={styles.imagePreviewWrap}>
                <Image
                  source={{ uri: `data:image/webp;base64,${draft.imageBase64}` }}
                  style={[styles.imagePreview, { borderRadius: theme.radius.md }]}
                />
                <Pressable
                  testID="new-ex-image-remove"
                  style={styles.imageRemoveBtn}
                  onPress={() => set("imageBase64", null)}
                >
                  <Ionicons name="trash" size={14} color={theme.colors.error} />
                  <Text style={{ color: theme.colors.error, fontWeight: "700", fontSize: 11 }}>
                    Retirer
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.photoRow}>
                <Pressable
                  testID="new-ex-photo-camera"
                  style={[styles.photoBtn, { borderRadius: theme.radius.pill, borderColor: theme.colors.brand, backgroundColor: theme.colors.surfaceTertiary }]}
                  onPress={() => pickImage("camera")}
                >
                  <Ionicons name="camera" size={16} color={theme.colors.brand} />
                  <Text style={[styles.photoBtnText, { color: theme.colors.brand }]}>Caméra</Text>
                </Pressable>
                <Pressable
                  testID="new-ex-photo-library"
                  style={[styles.photoBtn, { borderRadius: theme.radius.pill, borderColor: theme.colors.brand, backgroundColor: theme.colors.surfaceTertiary }]}
                  onPress={() => pickImage("library")}
                >
                  <Ionicons name="images" size={16} color={theme.colors.brand} />
                  <Text style={[styles.photoBtnText, { color: theme.colors.brand }]}>Galerie</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>

          <View style={[styles.sheetActions, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
            {onDelete && (
              <Pressable
                testID="new-ex-delete"
                style={[styles.deleteBtn, { borderRadius: theme.radius.md, borderColor: theme.colors.error }]}
                onPress={onDelete}
              >
                <Ionicons name="trash" size={16} color={theme.colors.error} />
                <Text style={[styles.deleteBtnText, { color: theme.colors.error }]}>Supprimer</Text>
              </Pressable>
            )}
            <Pressable
              testID="new-ex-save"
              style={[
                styles.saveBtn,
                { borderRadius: theme.radius.md, flex: onDelete ? 1 : undefined },
                theme.card.mode === "glass"
                  ? [
                      { backgroundColor: withAlpha(theme.colors.brand, 18), borderWidth: 1, borderColor: withAlpha(theme.colors.brand, 50) },
                      coloredShadow(theme.colors.brand, { offsetY: 0, opacity: 0.3, radius: 10, elevation: 3 }),
                    ]
                  : { backgroundColor: theme.colors.brand },
              ]}
              onPress={() => draft.nameFr.trim() && onSave({ ...draft, nameFr: draft.nameFr.trim() })}
            >
              <Text
                style={[
                  styles.saveBtnText,
                  theme.card.mode === "glass" && { color: theme.colors.brand },
                ]}
              >
                ENREGISTRER
              </Text>
            </Pressable>
          </View>
        </GlassCard>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  title: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    margin: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: colors.onSurface,
    fontSize: 14,
  },
  tabRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabEmoji: { fontSize: 12 },
  tabChipText: {
    color: colors.onSurfaceTertiary,
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  muscleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  muscleChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  muscleChipText: {
    color: colors.onSurfaceTertiary,
    fontWeight: "700",
    fontSize: 10,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 40, gap: 8 },
  sectionHeader: {
    color: colors.onSurfaceTertiary,
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: spacing.sm,
    marginBottom: 6,
  },
  createRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderStyle: "dashed",
    marginBottom: 8,
  },
  createRowTitle: { color: colors.onSurface, fontWeight: "800", fontSize: 14 },
  createRowSub: { color: colors.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { color: colors.onSurface, fontWeight: "700", fontSize: 14 },
  rowSub: { color: colors.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  favBtn: { padding: 4 },
  packBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  packBtnText: { color: colors.brand, fontSize: 9, fontWeight: "800" },
  emptyText: {
    color: colors.onSurfaceTertiary,
    textAlign: "center",
    marginTop: spacing.xl,
    fontStyle: "italic",
  },
  showMoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.md,
  },
  showMoreText: { color: colors.onSurfaceTertiary, fontWeight: "700", fontSize: 12 },
  rowImage: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceTertiary,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    // Pourcentage relatif à la box `flex:1` du `KeyboardAvoidingView`
    // parent — recalculé à chaque layout (jamais un `Dimensions.get()`
    // figé). Seul `sheetBody` (`flex:1`) se partage l'espace restant entre
    // le header et le footer, tous deux de taille fixe.
    maxHeight: "88%",
  },
  sheetBody: {
    flex: 1,
  },
  sheetBodyContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  sheetHandle: {
    width: 48,
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    color: colors.onSurface,
    fontSize: 17,
    fontWeight: "800",
  },
  miniLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "700",
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
    fontWeight: "600",
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  photoRow: { flexDirection: "row", gap: spacing.sm },
  photoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderStyle: "dashed",
    backgroundColor: colors.surfaceTertiary,
  },
  photoBtnText: { color: colors.brand, fontWeight: "800", fontSize: 12 },
  imagePreviewWrap: { alignItems: "center", gap: 8 },
  imagePreview: {
    width: 140,
    height: 140,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
  },
  imageRemoveBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  sheetActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: spacing.lg,
  },
  deleteBtnText: { color: colors.error, fontWeight: "700", fontSize: 13 },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.brand,
    padding: 14,
    borderRadius: radius.md,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "800", letterSpacing: 1 },
});
