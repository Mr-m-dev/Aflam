import React from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { tmdb } from "@/lib/tmdb";
import { HeroCarousel } from "@/components/HeroCarousel";
import { HorizontalList } from "@/components/HorizontalList";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const { data: trendingMovies, isLoading: ltm, refetch: rtm } = useQuery({
    queryKey: ["/api/tmdb/trending/movies"],
    queryFn: tmdb.getTrendingMovies,
    staleTime: 1000 * 60 * 30,
  });

  const { data: trendingTV, isLoading: lttv, refetch: rttv } = useQuery({
    queryKey: ["/api/tmdb/trending/tv"],
    queryFn: tmdb.getTrendingTV,
    staleTime: 1000 * 60 * 30,
  });

  const { data: popularMovies, isLoading: lpm, refetch: rpm } = useQuery({
    queryKey: ["/api/tmdb/popular/movies", 1],
    queryFn: () => tmdb.getPopularMovies(1),
    staleTime: 1000 * 60 * 30,
  });

  const { data: popularTV, isLoading: lptv, refetch: rptv } = useQuery({
    queryKey: ["/api/tmdb/popular/tv", 1],
    queryFn: () => tmdb.getPopularTV(1),
    staleTime: 1000 * 60 * 30,
  });

  const { data: nowPlaying, isLoading: lnp, refetch: rnp } = useQuery({
    queryKey: ["/api/tmdb/now-playing", 1],
    queryFn: () => tmdb.getNowPlaying(1),
    staleTime: 1000 * 60 * 30,
  });

  const { data: upcoming, isLoading: lup, refetch: rup } = useQuery({
    queryKey: ["/api/tmdb/upcoming", 1],
    queryFn: () => tmdb.getUpcoming(1),
    staleTime: 1000 * 60 * 30,
  });

  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([rtm(), rttv(), rpm(), rptv(), rnp(), rup()]);
    setRefreshing(false);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Text style={styles.logo}>MR AFLAM</Text>
        <Ionicons
          name="search-outline"
          size={24}
          color={Colors.textPrimary}
          onPress={() => router.push("/(tabs)/search")}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.accent} />
        }
        contentContainerStyle={[
          styles.content,
          Platform.OS === "web" && { paddingBottom: 34 },
        ]}
      >
        <HeroCarousel data={trendingMovies} type="movie" isLoading={ltm} />

        <HorizontalList
          title="Popular Movies"
          data={popularMovies?.results}
          type="movie"
          isLoading={lpm}
        />

        <HeroCarousel data={trendingTV} type="tv" isLoading={lttv} />

        <HorizontalList
          title="Popular TV Shows"
          data={popularTV?.results}
          type="tv"
          isLoading={lptv}
        />

        <HorizontalList
          title="Now Playing"
          data={nowPlaying?.results}
          type="movie"
          isLoading={lnp}
        />

        <HorizontalList
          title="Upcoming Movies"
          data={upcoming?.results}
          type="movie"
          isLoading={lup}
        />

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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  logo: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: 0,
  },
});
