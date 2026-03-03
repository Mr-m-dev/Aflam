import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Colors from "@/constants/colors";

function SkeletonBlock({ width, height, borderRadius = 8, style }: {
  width: number | string;
  height: number | string;
  borderRadius?: number;
  style?: object;
}) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        { width: width as number, height: height as number, borderRadius, backgroundColor: Colors.surface, opacity },
        style,
      ]}
    />
  );
}

export function PosterSkeleton({ width = 120, height = 180 }: { width?: number; height?: number }) {
  return (
    <View style={{ marginRight: 12 }}>
      <SkeletonBlock width={width} height={height} />
      <SkeletonBlock width={width * 0.8} height={12} borderRadius={4} style={{ marginTop: 8 }} />
      <SkeletonBlock width={width * 0.5} height={10} borderRadius={4} style={{ marginTop: 4 }} />
    </View>
  );
}

export function HeroSkeleton() {
  return (
    <View style={styles.heroSkeleton}>
      <SkeletonBlock width="100%" height="100%" />
    </View>
  );
}

export function GridSkeleton({ cols = 3, rows = 2, cardWidth = 110, cardHeight = 165 }: {
  cols?: number; rows?: number; cardWidth?: number; cardHeight?: number;
}) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: cols * rows }).map((_, i) => (
        <View key={i} style={styles.gridItem}>
          <SkeletonBlock width={cardWidth} height={cardHeight} />
          <SkeletonBlock width={cardWidth * 0.8} height={10} borderRadius={4} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  heroSkeleton: {
    height: 480,
    backgroundColor: Colors.surface,
    overflow: "hidden",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },
  gridItem: {
    alignItems: "center",
  },
});
