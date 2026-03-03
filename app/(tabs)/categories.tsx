import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { tmdb } from "@/lib/tmdb";
import { GenreGrid } from "@/components/GenreGrid";
import { HorizontalList } from "@/components/HorizontalList";

type Tab = "movie" | "tv";

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>("movie");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: movieGenres, isLoading: lgm } = useQuery({
    queryKey: ["/api/tmdb/genres/movies"],
    queryFn: tmdb.getMovieGenres,
    staleTime: 1000 * 60 * 60,
  });

  const { data: tvGenres, isLoading: lgt } = useQuery({
    queryKey: ["/api/tmdb/genres/tv"],
    queryFn: tmdb.getTVGenres,
    staleTime: 1000 * 60 * 60,
  });

  const { data: topRatedMovies, isLoading: ltrm } = useQuery({
    queryKey: ["/api/tmdb/top-rated/movies"],
    queryFn: () => tmdb.getTopRatedMovies(1),
    staleTime: 1000 * 60 * 30,
  });

  const { data: topRatedTV, isLoading: ltrt } = useQuery({
    queryKey: ["/api/tmdb/top-rated/tv"],
    queryFn: () => tmdb.getTopRatedTV(1),
    staleTime: 1000 * 60 * 30,
  });

  const { data: nowPlaying, isLoading: lnp } = useQuery({
    queryKey: ["/api/tmdb/now-playing"],
    queryFn: () => tmdb.getNowPlaying(1),
    staleTime: 1000 * 60 * 30,
    enabled: activeTab === "movie",
  });

  const { data: onAir, isLoading: loa } = useQuery({
    queryKey: ["/api/tmdb/popular/tv"],
    queryFn: () => tmdb.getPopularTV(1),
    staleTime: 1000 * 60 * 30,
    enabled: activeTab === "tv",
  });

  const genres = activeTab === "movie" ? movieGenres : tvGenres;
  const genresLoading = activeTab === "movie" ? lgm : lgt;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Text style={styles.title}>Categories</Text>
        <View style={styles.tabs}>
          {(["movie", "tv"] as Tab[]).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === "movie" ? "Movies" : "TV Shows"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 100 },
          Platform.OS === "web" && { paddingBottom: 34 },
        ]}
      >
        {activeTab === "movie" ? (
          <>
            <HorizontalList
              title="Top Rated Movies"
              data={topRatedMovies?.results}
              type="movie"
              isLoading={ltrm}
            />
            <HorizontalList
              title="Now Playing"
              data={nowPlaying?.results}
              type="movie"
              isLoading={lnp}
            />
          </>
        ) : (
          <>
            <HorizontalList
              title="Top Rated TV Shows"
              data={topRatedTV?.results}
              type="tv"
              isLoading={ltrt}
            />
            <HorizontalList
              title="Popular Now"
              data={onAir?.results}
              type="tv"
              isLoading={loa}
            />
          </>
        )}

        <View style={styles.genreSection}>
          <Text style={styles.genresTitle}>Browse by Genre</Text>
          {genresLoading || !genres ? (
            <View style={styles.genresLoading}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <View key={i} style={styles.genreSkeleton} />
              ))}
            </View>
          ) : (
            <GenreGrid genres={genres as { id: number; name: string }[]} type={activeTab} />
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginBottom: 16,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
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
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  tabTextActive: {
    color: Colors.white,
  },
  scroll: {
    flex: 1,
  },
  content: {},
  genreSection: {
    marginTop: 4,
  },
  genresTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  genresLoading: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },
  genreSkeleton: {
    width: "47%",
    height: 72,
    borderRadius: 10,
    backgroundColor: Colors.surface,
  },
});
