import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Platform,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { colors, radius, spacing } from "@/src/theme";
import {
  _consumePending,
  _resolvePending,
  CropperOptions,
} from "@/src/utils/imageCropper";

const MIN_SCALE = 1;
const MAX_SCALE = 6;

export default function PhotoCropScreen() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [source, setSource] = useState<{
    uri: string;
    width: number;
    height: number;
    options: CropperOptions;
  } | null>(null);

  const [box, setBox] = useState<{
    containerW: number;
    containerH: number;
    frameW: number;
    frameH: number;
    baseW: number;
    baseH: number;
  } | null>(null);

  // rotation in degrees, only 0/90/180/270 for now
  const [rotationDeg, setRotationDeg] = useState(0);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTy = useSharedValue(0);

  // Load pending source on mount
  useEffect(() => {
    const p = _consumePending();
    if (!p) {
      // Nothing to crop; just go back (deferred so navigator can mount).
      setTimeout(() => {
        try {
          router.back();
        } catch {}
      }, 0);
      return;
    }
    Image.getSize(
      p.sourceUri,
      (w, h) => {
        setSource({ uri: p.sourceUri, width: w, height: h, options: p.options });
      },
      () => {
        Alert.alert("Erreur", "Impossible de charger l'image.");
        _resolvePending(null);
        setTimeout(() => {
          try {
            router.back();
          } catch {}
        }, 0);
      },
    );
  }, [router]);

  // Compute box sizes once source is known
  useEffect(() => {
    if (!source) return;
    const screen = Dimensions.get("window");
    const containerW = screen.width;
    // Leave room for header (~60) + controls (~120) + safe padding
    const containerH = Math.max(300, screen.height - 260);

    const aspect = source.options.aspectRatio ?? 1;
    const maxFrameW = containerW * 0.9;
    const maxFrameH = containerH * 0.85;
    let frameW = maxFrameW;
    let frameH = frameW / aspect;
    if (frameH > maxFrameH) {
      frameH = maxFrameH;
      frameW = frameH * aspect;
    }

    // Effective image dims after rotation
    const isSideways = rotationDeg === 90 || rotationDeg === 270;
    const imgW = isSideways ? source.height : source.width;
    const imgH = isSideways ? source.width : source.height;

    // Base fit: cover the frame
    const imgAspect = imgW / imgH;
    const frameAspect = frameW / frameH;
    let baseW: number;
    let baseH: number;
    if (imgAspect > frameAspect) {
      baseH = frameH;
      baseW = baseH * imgAspect;
    } else {
      baseW = frameW;
      baseH = baseW / imgAspect;
    }
    setBox({ containerW, containerH, frameW, frameH, baseW, baseH });
    // Reset transforms whenever rotation/frame changes
    scale.value = 1;
    savedScale.value = 1;
    tx.value = 0;
    ty.value = 0;
    savedTx.value = 0;
    savedTy.value = 0;
    setReady(true);
  }, [source, rotationDeg, scale, savedScale, tx, ty, savedTx, savedTy]);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      const next = savedScale.value * e.scale;
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((e) => {
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const composed = Gesture.Simultaneous(pinch, pan);

  const imgStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  const zoom = (delta: number) => {
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale.value * delta));
    scale.value = withTiming(next, { duration: 120 });
    savedScale.value = next;
  };

  const resetTransforms = () => {
    scale.value = withSpring(1);
    tx.value = withSpring(0);
    ty.value = withSpring(0);
    savedScale.value = 1;
    savedTx.value = 0;
    savedTy.value = 0;
  };

  const rotate = () => {
    setRotationDeg((d) => (d + 90) % 360);
  };

  const cancel = () => {
    _resolvePending(null);
    router.back();
  };

  const confirm = async () => {
    if (!source || !box || processing) return;
    setProcessing(true);
    try {
      const {
        containerW,
        containerH,
        frameW,
        frameH,
        baseW,
        baseH,
      } = box;

      const isSideways = rotationDeg === 90 || rotationDeg === 270;
      const effImgW = isSideways ? source.height : source.width;
      const effImgH = isSideways ? source.width : source.height;

      const currentScale = scale.value;
      const currentTx = tx.value;
      const currentTy = ty.value;

      // Compute displayed image rect on screen (centered + translated + scaled)
      const displayW = baseW * currentScale;
      const displayH = baseH * currentScale;
      const imgLeft = containerW / 2 + currentTx - displayW / 2;
      const imgTop = containerH / 2 + currentTy - displayH / 2;

      // Crop frame rect
      const frameLeft = containerW / 2 - frameW / 2;
      const frameTop = containerH / 2 - frameH / 2;

      // Frame offset within displayed image (display coords)
      const offsetInDisplayX = frameLeft - imgLeft;
      const offsetInDisplayY = frameTop - imgTop;

      // Convert to source pixel coords (effective, post-rotation)
      const pxPerDisplay = effImgW / displayW; // === effImgH / displayH
      let originX = offsetInDisplayX * pxPerDisplay;
      let originY = offsetInDisplayY * pxPerDisplay;
      let cropW = frameW * pxPerDisplay;
      let cropH = frameH * pxPerDisplay;

      // Clamp to image bounds
      const clampedX = Math.max(0, Math.min(effImgW - 1, originX));
      const clampedY = Math.max(0, Math.min(effImgH - 1, originY));
      cropW = Math.max(
        1,
        Math.min(cropW - (clampedX - originX), effImgW - clampedX),
      );
      cropH = Math.max(
        1,
        Math.min(cropH - (clampedY - originY), effImgH - clampedY),
      );
      originX = clampedX;
      originY = clampedY;

      const actions: ImageManipulator.Action[] = [];
      if (rotationDeg !== 0) actions.push({ rotate: rotationDeg });
      actions.push({
        crop: {
          originX: Math.round(originX),
          originY: Math.round(originY),
          width: Math.round(cropW),
          height: Math.round(cropH),
        },
      });
      const outputW = source.options.outputWidth ?? 900;
      actions.push({ resize: { width: outputW } });

      const manipulated = await ImageManipulator.manipulateAsync(
        source.uri,
        actions,
        {
          compress: source.options.jpegQuality ?? 0.85,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        },
      );
      if (!manipulated.base64) {
        throw new Error("Base64 vide");
      }
      const result = {
        base64: manipulated.base64,
        width: manipulated.width,
        height: manipulated.height,
      };
      _resolvePending(result);
      router.back();
    } catch (e) {
      console.error("Crop error", e);
      Alert.alert("Erreur", "Impossible de recadrer l'image.");
      setProcessing(false);
    }
  };

  const title = source?.options.title ?? "Recadrer l'image";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          testID="crop-cancel"
          onPress={cancel}
          hitSlop={16}
          style={styles.headerBtn}
        >
          <Ionicons name="close" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Pressable
          testID="crop-confirm"
          onPress={confirm}
          hitSlop={16}
          style={({ pressed }) => [
            styles.confirmBtn,
            pressed && { opacity: 0.75 },
            processing && { opacity: 0.5 },
          ]}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={14} color="#fff" />
              <Text style={styles.confirmText}>VALIDER</Text>
            </>
          )}
        </Pressable>
      </View>

      {ready && source && box ? (
        <>
          <GestureDetector gesture={composed}>
            <View
              style={[
                styles.canvas,
                { width: box.containerW, height: box.containerH },
              ]}
              collapsable={false}
            >
              <Animated.View
                style={[
                  {
                    position: "absolute",
                    left: box.containerW / 2 - box.baseW / 2,
                    top: box.containerH / 2 - box.baseH / 2,
                    width: box.baseW,
                    height: box.baseH,
                  },
                  imgStyle,
                ]}
              >
                <Image
                  source={{ uri: source.uri }}
                  style={{
                    width: box.baseW,
                    height: box.baseH,
                    transform: [{ rotate: `${rotationDeg}deg` }],
                  }}
                  resizeMode="contain"
                />
              </Animated.View>

              {/* Overlay dimming outside frame */}
              <View
                style={[
                  styles.overlay,
                  {
                    width: box.containerW,
                    height: box.containerH,
                    pointerEvents: "none",
                  },
                ]}
              >
                {/* Top */}
                <View
                  style={[
                    styles.dim,
                    {
                      left: 0,
                      right: 0,
                      top: 0,
                      height: (box.containerH - box.frameH) / 2,
                    },
                  ]}
                />
                {/* Bottom */}
                <View
                  style={[
                    styles.dim,
                    {
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: (box.containerH - box.frameH) / 2,
                    },
                  ]}
                />
                {/* Left */}
                <View
                  style={[
                    styles.dim,
                    {
                      top: (box.containerH - box.frameH) / 2,
                      height: box.frameH,
                      left: 0,
                      width: (box.containerW - box.frameW) / 2,
                    },
                  ]}
                />
                {/* Right */}
                <View
                  style={[
                    styles.dim,
                    {
                      top: (box.containerH - box.frameH) / 2,
                      height: box.frameH,
                      right: 0,
                      width: (box.containerW - box.frameW) / 2,
                    },
                  ]}
                />
                {/* Frame border */}
                <View
                  style={[
                    styles.frame,
                    {
                      left: (box.containerW - box.frameW) / 2,
                      top: (box.containerH - box.frameH) / 2,
                      width: box.frameW,
                      height: box.frameH,
                    },
                  ]}
                >
                  {/* Grid rule of thirds */}
                  <View
                    style={[
                      styles.gridV,
                      { left: box.frameW / 3 },
                    ]}
                  />
                  <View
                    style={[
                      styles.gridV,
                      { left: (box.frameW * 2) / 3 },
                    ]}
                  />
                  <View
                    style={[
                      styles.gridH,
                      { top: box.frameH / 3 },
                    ]}
                  />
                  <View
                    style={[
                      styles.gridH,
                      { top: (box.frameH * 2) / 3 },
                    ]}
                  />
                </View>
              </View>
            </View>
          </GestureDetector>

          {/* Controls */}
          <View style={styles.controls}>
            <ControlBtn
              icon="remove-circle"
              label="Zoom -"
              onPress={() => zoom(0.8)}
              testID="crop-zoom-out"
            />
            <ControlBtn
              icon="add-circle"
              label="Zoom +"
              onPress={() => zoom(1.25)}
              testID="crop-zoom-in"
            />
            <ControlBtn
              icon="refresh"
              label="Rotation"
              onPress={rotate}
              testID="crop-rotate"
            />
            <ControlBtn
              icon="reload"
              label="Reset"
              onPress={resetTransforms}
              testID="crop-reset"
            />
          </View>

          <Text style={styles.hint}>
            {Platform.OS === "web"
              ? "Astuce : utilise la molette + glisser (ou les boutons) pour cadrer."
              : "Pince pour zoomer, glisse pour déplacer."}
          </Text>
        </>
      ) : (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.loadingText}>Chargement de l&apos;image…</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function ControlBtn({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      hitSlop={8}
      style={({ pressed }) => [
        styles.ctrlBtn,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Ionicons name={icon} size={22} color={colors.brand} />
      <Text style={styles.ctrlLabel}>{label}</Text>
    </Pressable>
  );
}

// Also expose a runOnJS-friendly hook for potential future double-tap etc.
// (unused right now – kept in case we add gestures that run on UI thread)
export const _crop_runOnJS = runOnJS;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: "#000",
  },
  headerBtn: { padding: 4 },
  title: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brand,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    minWidth: 72,
    justifyContent: "center",
  },
  confirmText: {
    color: "#fff",
    fontWeight: "800",
    letterSpacing: 0.6,
    fontSize: 11,
  },
  canvas: {
    alignSelf: "center",
    backgroundColor: "#000",
    overflow: "hidden",
  },
  overlay: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  dim: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  frame: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#fff",
  },
  gridV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  gridH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: "#000",
  },
  ctrlBtn: {
    alignItems: "center",
    gap: 4,
    minWidth: 60,
  },
  ctrlLabel: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  hint: {
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    fontSize: 11,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  loadingText: {
    color: "#fff",
    fontSize: 12,
  },
});
