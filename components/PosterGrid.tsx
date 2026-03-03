import React from "react";
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { TMDBMovie, TMDBTVShow, posterUrl } from "@/lib/tmdb";
import { GridSkeleton } from "@/components/SkeletonCard";

const { width } = Dimensions.get("window");
const COLS = 3;
const GAP = 8;
const CARD_WIDTH = (width - 32 - GAP * (COLS - 1)) / COLS;
const CARD_HEIGHT = CARD_WIDTH * 1.5;

type Props = {
  data: (TMDBMovie | TMDBTVShow)[] | undefined;
  type: "movie" | "tv";
  isLoading?: boolean;
  onEndReached?: () => void;
  ListHeaderComponent?: React.ComponentType<unknown> | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType<unknown> | React.ReactElement | null;
};

type CardProps = { item: TMDBMovie | TMDBTVShow; type: "movie" | "tv" };

function GridCard({ item, type }: CardProps) {
  const title = "title" in item ? item.title : item.name;
  const poster = posterUrl(item.poster_path, "w342");

  return (
    <Pressable
      onPress={() => {
        if (type === "movie") router.push({ pathname: "/movie/[id]", params: { id: String(item.id) } });
        else router.push({ pathname: "/tv/[id]", params: { id: String(item.id) } });
      }}
      style={styles.card}
    >
      {({ pressed }) => (
        <View style={{ opacity: pressed ? 0.75 : 1 }}>
          <View style={[styles.image, { width: CARD_WIDTH, height: CARD_HEIGHT }]}>
            {poster ? (
              <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
            ) : (
              <View style={styles.placeholder}>
                <Ionicons name="film-outline" size={24} color={Colors.textMuted} />
              </View>
            )}
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={8} color={Colors.starYellow} />
              <Text style={styles.rating}>{item.vote_average.toFixed(1)}</Text>
            </View>
          </View>
          <Text style={[styles.title, { width: CARD_WIDTH }]} numberOfLines={2}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function PosterGrid({ data, type, isLoading, onEndReached, ListHeaderComponent, ListFooterComponent }: Props) {
  if (isLoading || !data) {
    return (
      <View>
        {ListHeaderComponent && React.isValidElement(ListHeaderComponent) ? ListHeaderComponent : null}
        <GridSkeleton cols={COLS} rows={3} cardWidth={CARD_WIDTH} cardHeight={CARD_HEIGHT} />
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => `${item.id}`}
      numColumns={COLS}
      contentContainerStyle={styles.container}
      columnWrapperStyle={styles.row}
      renderItem={({ item }) => <GridCard item={item} type={type} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  row: {
    gap: GAP,
    marginBottom: GAP,
  },
  card: {},
  image: {
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: Colors.surface,
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingBadge: {
    position: "absolute",
    bottom: 5,
    left: 5,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 2,
  },
  rating: {
    color: Colors.textPrimary,
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
  },
  title: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    lineHeight: 15,
  },
});
