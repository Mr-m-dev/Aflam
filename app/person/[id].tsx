import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { tmdb, profileUrl, posterUrl } from "@/lib/tmdb";
import { useFavorites } from "@/context/favorites";
import { PosterCard } from "@/components/PosterCard";

type CreditsTab = "movies" | "tv";

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const personId = parseInt(id, 10);
  const insets = useSafeAreaInsets();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [activeTab, setActiveTab] = useState<CreditsTab>("movies");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: person, isLoading, error } = useQuery({
    queryKey: ["/api/tmdb/person", id],
    queryFn: () => tmdb.getPersonDetails(personId),
    staleTime: 1000 * 60 * 30,
  });

  const fav = isFavorite(personId, "person");

  const handleFavorite = async () => {
    if (!person) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await toggleFavorite({
      id: personId,
      type: "person",
      title: person.name as string,
      poster_path: null,
      profile_path: person.profile_path as string | null,
    });
  };

  if (isLoading) {
    return <View style={styles.loading}><View style={styles.loadingSkeleton} /></View>;
  }

  if (error || !person) {
    return (
      <View style={styles.error}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.errorText}>Failed to load person</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const photo = profileUrl(person.profile_path as string | null, "original");
  const smallPhoto = profileUrl(person.profile_path as string | null, "h632");
  const credits = person.credits as {
    movie: { cast: Record<string, unknown>[] };
    tv: { cast: Record<string, unknown>[] };
  } | undefined;
  const movieCredits = credits?.movie?.cast || [];
  const tvCredits = credits?.tv?.cast || [];
  const biography = person.biography as string || "";
  const birthday = person.birthday as string || "";
  const birthplace = person.place_of_birth as string || "";
  const department = person.known_for_department as string || "";

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <Pressable onPress={() => router.back()} style={[styles.backButton, { top: topPad + 8 }]} hitSlop={8}>
        <Ionicons name="chevron-back" size={24} color={Colors.white} />
      </Pressable>
      <Pressable onPress={handleFavorite} style={[styles.favoriteButton, { top: topPad + 8 }]} hitSlop={8}>
        <Ionicons name={fav ? "heart" : "heart-outline"} size={24} color={fav ? Colors.accent : Colors.white} />
      </Pressable>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.heroImage} contentFit="cover" transition={300} />
          ) : (
            <View style={[styles.heroImage, { backgroundColor: Colors.surface }]} />
          )}
          <LinearGradient
            colors={["rgba(0,0,0,0.0)", "rgba(0,0,0,0.5)", "#000000"]}
            locations={[0.4, 0.7, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <View style={styles.content}>
          <View style={styles.profileRow}>
            <View style={styles.profilePhoto}>
              {smallPhoto ? (
                <Image source={{ uri: smallPhoto }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <View style={styles.profilePhotoPlaceholder}>
                  <Ionicons name="person" size={32} color={Colors.textMuted} />
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.name}>{person.name as string}</Text>
              {department ? <Text style={styles.department}>{department}</Text> : null}
              <Pressable onPress={handleFavorite} style={[styles.favBtn, fav && styles.favBtnActive]}>
                <Ionicons name={fav ? "heart" : "heart-outline"} size={14} color={fav ? Colors.white : Colors.textSecondary} />
                <Text style={[styles.favBtnText, fav && styles.favBtnTextActive]}>{fav ? "Saved" : "Save"}</Text>
              </Pressable>
            </View>
          </View>

          {(birthday || birthplace) && (
            <View style={styles.bioMeta}>
              {birthday ? (
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.metaText}>{birthday}</Text>
                </View>
              ) : null}
              {birthplace ? (
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.metaText} numberOfLines={1}>{birthplace}</Text>
                </View>
              ) : null}
            </View>
          )}

          {biography ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Biography</Text>
              <Text style={styles.bio}>{biography}</Text>
            </View>
          ) : null}

          {(movieCredits.length > 0 || tvCredits.length > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Known For</Text>
              <View style={styles.creditsTabRow}>
                {(["movies", "tv"] as CreditsTab[]).map((tab) => (
                  <Pressable
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    style={[styles.creditsTab, activeTab === tab && styles.creditsTabActive]}
                  >
                    <Text style={[styles.creditsTabText, activeTab === tab && styles.creditsTabTextActive]}>
                      {tab === "movies" ? "Movies" : "TV Shows"}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <FlatList
                horizontal
                data={activeTab === "movies" ? movieCredits : tvCredits}
                keyExtractor={(item) => String((item as Record<string, unknown>).id)}
                renderItem={({ item }) => (
                  <PosterCard
                    item={item as unknown as import("@/lib/tmdb").TMDBMovie}
                    type={activeTab === "movies" ? "movie" : "tv"}
                    width={110}
                    height={165}
                  />
                )}
                showsHorizontalScrollIndicator={false}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No {activeTab === "movies" ? "movies" : "TV shows"} found</Text>
                }
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
  loading: { flex: 1, backgroundColor: Colors.background },
  loadingSkeleton: { height: 420, backgroundColor: Colors.surface },
  error: { flex: 1, backgroundColor: Colors.background, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  errorText: { color: Colors.textSecondary, fontSize: 16, fontFamily: "Inter_400Regular" },
  backBtn: { backgroundColor: Colors.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { color: Colors.white, fontFamily: "Inter_600SemiBold" },
  backButton: { position: "absolute", left: 16, zIndex: 20, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 20, padding: 6 },
  favoriteButton: { position: "absolute", right: 16, zIndex: 20, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 20, padding: 6 },
  scroll: { flex: 1 },
  hero: { height: 380, position: "relative" },
  heroImage: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  content: { paddingHorizontal: 20 },
  profileRow: { flexDirection: "row", gap: 16, marginBottom: 16, marginTop: -50 },
  profilePhoto: { width: 90, height: 90, borderRadius: 45, overflow: "hidden", backgroundColor: Colors.surface, borderWidth: 3, borderColor: Colors.background },
  profilePhotoPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  profileInfo: { flex: 1, justifyContent: "flex-end", paddingBottom: 4, gap: 4 },
  name: { color: Colors.textPrimary, fontSize: 22, fontFamily: "Inter_700Bold" },
  department: { color: Colors.textMuted, fontSize: 13, fontFamily: "Inter_400Regular" },
  favBtn: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, gap: 4, alignSelf: "flex-start" },
  favBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  favBtnText: { color: Colors.textSecondary, fontSize: 12, fontFamily: "Inter_500Medium" },
  favBtnTextActive: { color: Colors.white },
  bioMeta: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { color: Colors.textMuted, fontSize: 13, fontFamily: "Inter_400Regular" },
  section: { marginBottom: 24 },
  sectionTitle: { color: Colors.textPrimary, fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 12 },
  bio: { color: Colors.textSecondary, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  creditsTabRow: { flexDirection: "row", backgroundColor: Colors.surface, borderRadius: 8, padding: 3, marginBottom: 14, gap: 2 },
  creditsTab: { flex: 1, paddingVertical: 7, borderRadius: 6, alignItems: "center" },
  creditsTabActive: { backgroundColor: Colors.accent },
  creditsTabText: { color: Colors.textSecondary, fontSize: 13, fontFamily: "Inter_500Medium" },
  creditsTabTextActive: { color: Colors.white },
  emptyText: { color: Colors.textMuted, fontSize: 14, fontFamily: "Inter_400Regular", paddingVertical: 20 },
});
