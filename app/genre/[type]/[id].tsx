import React, { useState } from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { tmdb, posterUrl, TMDBMovie, TMDBTVShow } from "@/lib/tmdb";

const { width } = Dimensions.get("window");
const COLS = 3;
const GAP = 8;
const CARD_WIDTH = (width - 32 - GAP * (COLS - 1)) / COLS;
const CARD_HEIGHT = CARD_WIDTH * 1.5;

function GridCard({ item, type }: { item: TMDBMovie | TMDBTVShow; type: "movie" | "tv" }) {
  const title = "title" in item ? item.title : item.name;
  const poster = posterUrl(item.poster_path, "w342");
  return (
    <Pressable
      onPress={() => {
        if (type === "movie") router.push({ pathname: "/movie/[id]", params: { id: String(item.id) } });
        else router.push({ pathname: "/tv/[id]", params: { id: String(item.id) } });
      }}
    >
      {({ pressed }) => (
        <View style={{ opacity: pressed ? 0.75 : 1 }}>
          <View style={[styles.card, { width: CARD_WIDTH, height: CARD_HEIGHT }]}>
            {poster ? (
              <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
            ) : (
              <View style={styles.placeholder}>
                <Ionicons name="film-outline" size={24} color={Colors.textMuted} />
              </View>
            )}
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={8} color={Colors.starYellow} />
              <Text style={styles.ratingText}>{item.vote_average.toFixed(1)}</Text>
            </View>
          </View>
          <Text style={[styles.cardTitle, { width: CARD_WIDTH }]} numberOfLines={2}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function GenreScreen() {
  const { type, id, name } = useLocalSearchParams<{ type: string; id: string; name: string }>();
  const genreId = parseInt(id, 10);
  const isMovie = type === "movie";
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<(TMDBMovie | TMDBTVShow)[]>([]);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading } = useQuery({
    queryKey: [isMovie ? "/api/tmdb/genre/movies" : "/api/tmdb/genre/tv", id, page],
    queryFn: () =>
      isMovie ? tmdb.getMoviesByGenre(genreId, page) : tmdb.getTVByGenre(genreId, page),
    staleTime: 1000 * 60 * 30,
  });

  React.useEffect(() => {
    if (data?.results && data.results.length > 0) {
      if (page === 1) {
        setAllItems(data.results);
      } else {
        setAllItems((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          return [...prev, ...data.results.filter((r) => !ids.has(r.id))];
        });
      }
    }
  }, [data, page]);

  const handleLoadMore = () => {
    if (!isLoading && data && page < data.total_pages) {
      setPage((p) => p + 1);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.title}>{decodeURIComponent(name || "Genre")}</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={allItems}
        keyExtractor={(item) => String(item.id)}
        numColumns={COLS}
        contentContainerStyle={[
          styles.grid,
          { paddingTop: topPad + 70 },
          Platform.OS === "web" && { paddingBottom: 34 },
        ]}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => <GridCard item={item} type={isMovie ? "movie" : "tv"} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <View key={i} style={[styles.card, { width: CARD_WIDTH, height: CARD_HEIGHT, backgroundColor: Colors.surface }]} />
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="film-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No content found</Text>
            </View>
          )
        }
        ListFooterComponent={isLoading && page > 1 ? (
          <View style={styles.footer}>
            <Text style={styles.footerText}>Loading more...</Text>
          </View>
        ) : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  backButton: { padding: 6 },
  title: { color: Colors.textPrimary, fontSize: 20, fontFamily: "Inter_700Bold", flex: 1, textAlign: "center" },
  grid: { paddingHorizontal: 16, paddingBottom: 24 },
  row: { gap: GAP, marginBottom: GAP },
  card: { borderRadius: 6, overflow: "hidden", backgroundColor: Colors.surface },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  ratingBadge: { position: "absolute", bottom: 5, left: 5, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.8)", borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2, gap: 2 },
  ratingText: { color: Colors.textPrimary, fontSize: 9, fontFamily: "Inter_600SemiBold" },
  cardTitle: { color: Colors.textSecondary, fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4, lineHeight: 15 },
  loadingContainer: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 8 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 16 },
  emptyText: { color: Colors.textMuted, fontSize: 16, fontFamily: "Inter_400Regular" },
  footer: { padding: 20, alignItems: "center" },
  footerText: { color: Colors.textMuted, fontSize: 14 },
});
