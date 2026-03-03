import React from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useFavorites, FavoriteItem } from "@/context/favorites";
import { posterUrl, profileUrl } from "@/lib/tmdb";

const { width } = Dimensions.get("window");
const COLS = 3;
const GAP = 8;
const CARD_WIDTH = (width - 32 - GAP * (COLS - 1)) / COLS;
const CARD_HEIGHT = CARD_WIDTH * 1.5;

function FavoriteCard({ item }: { item: FavoriteItem }) {
  const { removeFavorite } = useFavorites();
  const imageUri =
    item.type === "person"
      ? profileUrl(item.profile_path || null, "w185")
      : posterUrl(item.poster_path, "w342");

  const handlePress = () => {
    if (item.type === "movie") router.push({ pathname: "/movie/[id]", params: { id: String(item.id) } });
    else if (item.type === "tv") router.push({ pathname: "/tv/[id]", params: { id: String(item.id) } });
    else router.push({ pathname: "/person/[id]", params: { id: String(item.id) } });
  };

  return (
    <Pressable onPress={handlePress} style={styles.card}>
      {({ pressed }) => (
        <View style={{ opacity: pressed ? 0.75 : 1 }}>
          <View style={[styles.poster, item.type === "person" && styles.personPoster]}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
            ) : (
              <View style={styles.placeholder}>
                <Ionicons name={item.type === "person" ? "person" : "film-outline"} size={24} color={Colors.textMuted} />
              </View>
            )}
            <Pressable
              onPress={() => removeFavorite(item.id, item.type)}
              style={styles.removeBtn}
              hitSlop={4}
            >
              <Ionicons name="heart" size={16} color={Colors.accent} />
            </Pressable>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { favorites } = useFavorites();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.screen, { paddingTop: topPad + 8 }]}>
      <Text style={styles.title}>My Favorites</Text>
      {favorites.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the heart icon on any movie, TV show, or person to add it here
          </Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          numColumns={COLS}
          contentContainerStyle={[
            styles.grid,
            Platform.OS === "web" && { paddingBottom: 34 },
          ]}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => <FavoriteCard item={item} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  row: {
    gap: GAP,
    marginBottom: GAP,
  },
  card: {
    width: CARD_WIDTH,
  },
  poster: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: Colors.surface,
  },
  personPoster: {
    borderRadius: CARD_WIDTH / 2,
    height: CARD_WIDTH,
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 12,
    padding: 4,
  },
  cardTitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 5,
    lineHeight: 15,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
  },
  emptySubtitle: {
    color: Colors.textMuted,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
  },
});
