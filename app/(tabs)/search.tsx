import React, { useState, useCallback } from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { tmdb, posterUrl, profileUrl } from "@/lib/tmdb";

const { width } = Dimensions.get("window");

type SearchTab = "movies" | "tv" | "people";

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("movies");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading } = useQuery({
    queryKey: ["/api/tmdb/search", query],
    queryFn: () => tmdb.search(query),
    enabled: query.trim().length > 1,
    staleTime: 1000 * 60 * 5,
  });

  const { data: popular, isLoading: lp } = useQuery({
    queryKey: ["/api/tmdb/popular/movies"],
    queryFn: () => tmdb.getPopularMovies(1),
    enabled: query.trim().length < 2,
    staleTime: 1000 * 60 * 30,
  });

  const tabs: { key: SearchTab; label: string }[] = [
    { key: "movies", label: "Movies" },
    { key: "tv", label: "TV Shows" },
    { key: "people", label: "People" },
  ];

  const getResults = () => {
    if (!query.trim() || !data) return popular?.results || [];
    if (activeTab === "movies") return data.movies.results;
    if (activeTab === "tv") return data.tvShows.results;
    return data.people.results;
  };

  const renderMovieItem = useCallback(({ item }: { item: Record<string, unknown> }) => {
    const title = (item.title || item.name) as string;
    const poster = posterUrl(item.poster_path as string | null, "w185");
    const rating = (item.vote_average as number) || 0;
    const date = (item.release_date || item.first_air_date) as string || "";
    const year = date.slice(0, 4);
    const isMovie = "title" in item;

    return (
      <Pressable
        onPress={() => {
          if (isMovie) router.push({ pathname: "/movie/[id]", params: { id: String(item.id) } });
          else router.push({ pathname: "/tv/[id]", params: { id: String(item.id) } });
        }}
        style={styles.listItem}
      >
        {({ pressed }) => (
          <View style={[styles.listItemInner, { opacity: pressed ? 0.7 : 1 }]}>
            <View style={styles.listPoster}>
              {poster ? (
                <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
              ) : (
                <View style={styles.listPosterPlaceholder}>
                  <Ionicons name="film-outline" size={20} color={Colors.textMuted} />
                </View>
              )}
            </View>
            <View style={styles.listInfo}>
              <Text style={styles.listTitle} numberOfLines={2}>{title}</Text>
              <View style={styles.listMeta}>
                {rating > 0 ? (
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={10} color={Colors.starYellow} />
                    <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                  </View>
                ) : null}
                {year ? <Text style={styles.yearText}>{year}</Text> : null}
              </View>
              {item.overview ? (
                <Text style={styles.listOverview} numberOfLines={2}>{item.overview as string}</Text>
              ) : null}
            </View>
          </View>
        )}
      </Pressable>
    );
  }, []);

  const renderPersonItem = useCallback(({ item }: { item: Record<string, unknown> }) => {
    const photo = profileUrl(item.profile_path as string | null, "w185");
    return (
      <Pressable
        onPress={() => router.push({ pathname: "/person/[id]", params: { id: String(item.id) } })}
        style={styles.listItem}
      >
        {({ pressed }) => (
          <View style={[styles.listItemInner, { opacity: pressed ? 0.7 : 1 }]}>
            <View style={styles.personPhoto}>
              {photo ? (
                <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
              ) : (
                <View style={styles.listPosterPlaceholder}>
                  <Ionicons name="person" size={20} color={Colors.textMuted} />
                </View>
              )}
            </View>
            <View style={styles.listInfo}>
              <Text style={styles.listTitle}>{item.name as string}</Text>
              <Text style={styles.yearText}>{item.known_for_department as string}</Text>
            </View>
          </View>
        )}
      </Pressable>
    );
  }, []);

  const results = getResults() as Record<string, unknown>[];
  const showingSearch = query.trim().length > 1;

  return (
    <View style={[styles.screen, { paddingTop: topPad + 8 }]}>
      <Text style={styles.title}>Search</Text>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.input}
          placeholder="Movies, TV shows, people..."
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </Pressable>
        )}
      </View>

      {showingSearch && (
        <View style={styles.tabs}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {!showingSearch && (
        <Text style={styles.sectionLabel}>Popular Movies</Text>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        renderItem={showingSearch && activeTab === "people" ? renderPersonItem : renderMovieItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          Platform.OS === "web" && { paddingBottom: 34 },
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            {isLoading || lp ? (
              <Text style={styles.emptyText}>Searching...</Text>
            ) : (
              <>
                <Ionicons name="search-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No results found</Text>
              </>
            )}
          </View>
        }
      />
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
    marginBottom: 14,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  tabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: Colors.accent,
  },
  tabText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  tabTextActive: {
    color: Colors.white,
  },
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  list: {
    paddingBottom: 24,
  },
  listItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  listItemInner: {
    flexDirection: "row",
    gap: 12,
  },
  listPoster: {
    width: 64,
    height: 96,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: Colors.surface,
  },
  personPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    backgroundColor: Colors.surface,
  },
  listPosterPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  listTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
  },
  listMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  yearText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  listOverview: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 16,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
});
