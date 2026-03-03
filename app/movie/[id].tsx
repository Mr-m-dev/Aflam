import React, { useCallback } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  FlatList,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { tmdb, backdropUrl, posterUrl } from "@/lib/tmdb";
import { useFavorites } from "@/context/favorites";
import { CastCard } from "@/components/CastCard";
import { PosterCard } from "@/components/PosterCard";

const { width } = Dimensions.get("window");

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const movieId = parseInt(id, 10);
  const insets = useSafeAreaInsets();
  const { isFavorite, toggleFavorite } = useFavorites();

  const { data: movie, isLoading, error } = useQuery({
    queryKey: ["/api/tmdb/movie", id],
    queryFn: () => tmdb.getMovieDetails(movieId),
    staleTime: 1000 * 60 * 30,
  });

  const fav = isFavorite(movieId, "movie");

  const handleFavorite = async () => {
    if (!movie) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await toggleFavorite({
      id: movieId,
      type: "movie",
      title: (movie.title || movie.original_title) as string,
      poster_path: movie.poster_path as string | null,
      vote_average: movie.vote_average as number,
      overview: movie.overview as string,
      release_date: movie.release_date as string,
    });
  };

  const handleTrailer = () => {
    const media = movie?.media as { trailers?: { key: string }[] } | undefined;
    const trailerKey = media?.trailers?.[0]?.key;
    if (trailerKey) {
      Linking.openURL(`https://www.youtube.com/watch?v=${trailerKey}`);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingSkeleton} />
      </View>
    );
  }

  if (error || !movie) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.errorText}>Failed to load movie</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const backdrop = backdropUrl(movie.backdrop_path as string | null, "w1280");
  const poster = posterUrl(movie.poster_path as string | null, "w342");
  const genres = (movie.genres as { id: number; name: string }[]) || [];
  const credits = movie.credits as { cast?: Record<string, unknown>[]; crew?: Record<string, unknown>[] } | undefined;
  const cast = (credits?.cast || []).filter((c) => c.profile_path).slice(0, 15) as {
    id: number; name: string; character: string; profile_path: string | null
  }[];
  const similar = ((movie.similar_movies || []) as Record<string, unknown>[]).slice(0, 10);
  const media = movie.media as { trailers?: { key: string }[] } | undefined;
  const hasTrailer = (media?.trailers?.length ?? 0) > 0;
  const runtime = movie.runtime as number | undefined;
  const releaseDate = movie.release_date as string | undefined;
  const year = releaseDate?.slice(0, 4);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <Pressable
        onPress={() => router.back()}
        style={[styles.backButton, { top: topPad + 8 }]}
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={24} color={Colors.white} />
      </Pressable>

      <Pressable
        onPress={handleFavorite}
        style={[styles.favoriteButton, { top: topPad + 8 }]}
        hitSlop={8}
      >
        <Ionicons
          name={fav ? "heart" : "heart-outline"}
          size={24}
          color={fav ? Colors.accent : Colors.white}
        />
      </Pressable>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          {backdrop ? (
            <Image source={{ uri: backdrop }} style={styles.backdrop} contentFit="cover" transition={300} />
          ) : (
            <View style={[styles.backdrop, { backgroundColor: Colors.surface }]} />
          )}
          <LinearGradient
            colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.6)", "#000000"]}
            locations={[0.3, 0.7, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.posterOverlay}>
            {poster ? (
              <Image source={{ uri: poster }} style={styles.poster} contentFit="cover" />
            ) : (
              <View style={[styles.poster, styles.posterPlaceholder]}>
                <Ionicons name="film-outline" size={40} color={Colors.textMuted} />
              </View>
            )}
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.movieTitle}>{(movie.title || movie.original_title) as string}</Text>

          <View style={styles.metaRow}>
            {movie.vote_average ? (
              <View style={styles.ratingChip}>
                <Ionicons name="star" size={13} color={Colors.starYellow} />
                <Text style={styles.ratingText}>{(movie.vote_average as number).toFixed(1)}</Text>
              </View>
            ) : null}
            {year ? <Text style={styles.metaText}>{year}</Text> : null}
            {runtime ? <Text style={styles.metaText}>{`${runtime}m`}</Text> : null}
          </View>

          {genres.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genres}>
              {genres.map((g) => (
                <View key={g.id} style={styles.genreChip}>
                  <Text style={styles.genreText}>{g.name}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.actions}>
            {hasTrailer && (
              <Pressable onPress={handleTrailer} style={styles.trailerBtn}>
                <Ionicons name="play-circle-outline" size={18} color={Colors.white} />
                <Text style={styles.trailerBtnText}>Watch Trailer</Text>
              </Pressable>
            )}
            <Pressable
              onPress={handleFavorite}
              style={[styles.favBtn, fav && styles.favBtnActive]}
            >
              <Ionicons name={fav ? "heart" : "heart-outline"} size={18} color={fav ? Colors.white : Colors.textSecondary} />
              <Text style={[styles.favBtnText, fav && styles.favBtnTextActive]}>
                {fav ? "Saved" : "Save"}
              </Text>
            </Pressable>
          </View>

          {movie.overview ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Overview</Text>
              <Text style={styles.overview}>{movie.overview as string}</Text>
            </View>
          ) : null}

          {cast.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cast</Text>
              <FlatList
                horizontal
                data={cast}
                keyExtractor={(c) => String(c.id)}
                renderItem={({ item }) => (
                  <CastCard
                    id={item.id}
                    name={item.name}
                    character={item.character}
                    profile_path={item.profile_path}
                  />
                )}
                showsHorizontalScrollIndicator={false}
              />
            </View>
          )}

          {similar.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>More Like This</Text>
              <FlatList
                horizontal
                data={similar}
                keyExtractor={(item) => String((item as Record<string, unknown>).id)}
                renderItem={({ item }) => (
                  <PosterCard
                    item={item as unknown as import("@/lib/tmdb").TMDBMovie}
                    type="movie"
                    width={110}
                    height={165}
                  />
                )}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 0 }}
              />
            </View>
          )}

          <View style={{ height: Platform.OS === "web" ? 34 : 100 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, backgroundColor: Colors.background },
  loadingSkeleton: { height: 480, backgroundColor: Colors.surface },
  errorContainer: { flex: 1, backgroundColor: Colors.background, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  errorText: { color: Colors.textSecondary, fontSize: 16, fontFamily: "Inter_400Regular" },
  backBtn: { backgroundColor: Colors.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { color: Colors.white, fontFamily: "Inter_600SemiBold" },
  backButton: {
    position: "absolute",
    left: 16,
    zIndex: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    padding: 6,
  },
  favoriteButton: {
    position: "absolute",
    right: 16,
    zIndex: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    padding: 6,
  },
  scroll: { flex: 1 },
  hero: { height: 420, position: "relative" },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  posterOverlay: {
    position: "absolute",
    bottom: -60,
    left: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  poster: {
    width: 120,
    height: 180,
    borderRadius: 10,
    overflow: "hidden",
  },
  posterPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { paddingTop: 80, paddingHorizontal: 20 },
  movieTitle: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    lineHeight: 32,
    marginBottom: 10,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  ratingChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { color: Colors.textPrimary, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  metaText: { color: Colors.textMuted, fontSize: 13, fontFamily: "Inter_400Regular" },
  genres: { marginBottom: 16 },
  genreChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 8,
  },
  genreText: { color: Colors.textSecondary, fontSize: 12, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", gap: 10, marginBottom: 24 },
  trailerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    gap: 6,
  },
  trailerBtnText: { color: Colors.white, fontSize: 14, fontFamily: "Inter_700Bold" },
  favBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 6,
  },
  favBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  favBtnText: { color: Colors.textSecondary, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  favBtnTextActive: { color: Colors.white },
  section: { marginBottom: 28 },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 14,
  },
  overview: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
});
