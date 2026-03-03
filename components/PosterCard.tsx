import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import { posterUrl, TMDBMovie, TMDBTVShow } from "@/lib/tmdb";

type Props = {
  item: TMDBMovie | TMDBTVShow;
  type: "movie" | "tv";
  width?: number;
  height?: number;
};

export function PosterCard({ item, type, width = 120, height = 180 }: Props) {
  const title = "title" in item ? item.title : item.name;
  const poster = posterUrl(item.poster_path, "w342");
  const rating = item.vote_average;

  const handlePress = () => {
    if (type === "movie") {
      router.push({ pathname: "/movie/[id]", params: { id: String(item.id) } });
    } else {
      router.push({ pathname: "/tv/[id]", params: { id: String(item.id) } });
    }
  };

  return (
    <Pressable onPress={handlePress} style={[styles.container, { width }]}>
      {({ pressed }) => (
        <View style={{ opacity: pressed ? 0.75 : 1 }}>
          <View style={[styles.imageContainer, { width, height }]}>
            {poster ? (
              <Image
                source={{ uri: poster }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={300}
              />
            ) : (
              <View style={styles.placeholder}>
                <Ionicons name="film-outline" size={32} color={Colors.textMuted} />
              </View>
            )}
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={8} color={Colors.starYellow} />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            </View>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: 12,
  },
  imageContainer: {
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: Colors.surface,
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  ratingBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 3,
    gap: 3,
  },
  ratingText: {
    color: Colors.textPrimary,
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  title: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 6,
    lineHeight: 16,
  },
});
