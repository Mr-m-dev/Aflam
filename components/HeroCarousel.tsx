import React, { useRef, useState, useEffect } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { TMDBMovie, TMDBTVShow, backdropUrl, posterUrl } from "@/lib/tmdb";
import { HeroSkeleton } from "@/components/SkeletonCard";

const { width } = Dimensions.get("window");
const HERO_HEIGHT = 480;

type Props = {
  data: (TMDBMovie | TMDBTVShow)[] | undefined;
  type: "movie" | "tv";
  isLoading?: boolean;
};

type HeroItemProps = { item: TMDBMovie | TMDBTVShow; type: "movie" | "tv" };

function HeroItem({ item, type }: HeroItemProps) {
  const title = "title" in item ? item.title : item.name;
  const backdrop = backdropUrl(item.backdrop_path, "w1280");
  const poster = posterUrl(item.poster_path, "w342");

  const handlePress = () => {
    if (type === "movie") {
      router.push({ pathname: "/movie/[id]", params: { id: String(item.id) } });
    } else {
      router.push({ pathname: "/tv/[id]", params: { id: String(item.id) } });
    }
  };

  return (
    <Pressable onPress={handlePress} style={[styles.heroItem, { width }]}>
      {({ pressed }) => (
        <View style={[StyleSheet.absoluteFill, { opacity: pressed ? 0.85 : 1 }]}>
          {backdrop ? (
            <Image source={{ uri: backdrop }} style={StyleSheet.absoluteFill} contentFit="cover" transition={500} />
          ) : poster ? (
            <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} contentFit="cover" transition={500} />
          ) : (
            <View style={styles.heroBg} />
          )}

          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.92)", "#000000"]}
            locations={[0.3, 0.55, 0.8, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.heroContent}>
            <Text style={styles.heroTitle} numberOfLines={2}>{title}</Text>
            <View style={styles.heroMeta}>
              <View style={styles.ratingPill}>
                <Ionicons name="star" size={12} color={Colors.starYellow} />
                <Text style={styles.ratingText}>{item.vote_average.toFixed(1)}</Text>
              </View>
              <View style={styles.typePill}>
                <Text style={styles.typeText}>{type === "movie" ? "Movie" : "TV Show"}</Text>
              </View>
            </View>
            {item.overview ? (
              <Text style={styles.heroOverview} numberOfLines={2}>{item.overview}</Text>
            ) : null}
            <View style={styles.heroButtons}>
              <Pressable onPress={handlePress} style={styles.watchBtn}>
                <Ionicons name="play" size={16} color={Colors.black} />
                <Text style={styles.watchBtnText}>Details</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
}

export function HeroCarousel({ data, type, isLoading }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]) {
        setActiveIndex(viewableItems[0].index ?? 0);
      }
    }
  ).current;

  useEffect(() => {
    if (!data || data.length === 0) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % Math.min(data.length, 8);
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [data]);

  if (isLoading || !data) return <HeroSkeleton />;

  const displayData = data.slice(0, 8);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={displayData}
        keyExtractor={(item) => String(item.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => <HeroItem item={item} type={type} />}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
      />
      <View style={styles.dots}>
        {displayData.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: HERO_HEIGHT,
    marginBottom: 28,
  },
  heroItem: {
    height: HERO_HEIGHT,
    overflow: "hidden",
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.surface,
  },
  heroContent: {
    position: "absolute",
    bottom: 36,
    left: 20,
    right: 20,
  },
  heroTitle: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    lineHeight: 34,
    marginBottom: 10,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  ratingText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  typePill: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeText: {
    color: Colors.white,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  heroOverview: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    marginBottom: 14,
  },
  heroButtons: {
    flexDirection: "row",
    gap: 10,
  },
  watchBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  watchBtnText: {
    color: Colors.black,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  dots: {
    position: "absolute",
    bottom: 16,
    right: 20,
    flexDirection: "row",
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dotActive: {
    backgroundColor: Colors.white,
    width: 18,
  },
});
