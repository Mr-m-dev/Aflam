import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View, Dimensions } from "react-native";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { Genre } from "@/lib/tmdb";

const GENRE_COLORS = [
  "#E50914", "#1DB954", "#0F3460", "#F5A623",
  "#8B5CF6", "#06B6D4", "#EF4444", "#10B981",
  "#F59E0B", "#6366F1", "#EC4899", "#14B8A6",
  "#F97316", "#84CC16", "#A855F7", "#3B82F6",
];

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

type Props = {
  genres: Genre[];
  type: "movie" | "tv";
};

export function GenreGrid({ genres, type }: Props) {
  return (
    <FlatList
      data={genres}
      keyExtractor={(item) => String(item.id)}
      numColumns={2}
      contentContainerStyle={styles.container}
      columnWrapperStyle={styles.row}
      renderItem={({ item, index }) => (
        <Pressable
          onPress={() => router.push({
            pathname: "/genre/[type]/[id]",
            params: { type, id: String(item.id), name: item.name }
          })}
          style={[styles.card, { width: CARD_WIDTH, backgroundColor: GENRE_COLORS[index % GENRE_COLORS.length] + "22" }]}
        >
          {({ pressed }) => (
            <View style={[styles.cardInner, { opacity: pressed ? 0.7 : 1 }]}>
              <View style={[styles.accent, { backgroundColor: GENRE_COLORS[index % GENRE_COLORS.length] }]} />
              <Text style={styles.name}>{item.name}</Text>
            </View>
          )}
        </Pressable>
      )}
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  card: {
    height: 72,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "center",
  },
  cardInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
  },
  accent: {
    width: 4,
    height: 32,
    borderRadius: 2,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
});
