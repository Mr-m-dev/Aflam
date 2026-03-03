import React from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { PosterCard } from "@/components/PosterCard";
import { PosterSkeleton } from "@/components/SkeletonCard";
import { SectionHeader } from "@/components/SectionHeader";
import { TMDBMovie, TMDBTVShow } from "@/lib/tmdb";

type Props = {
  title: string;
  data: (TMDBMovie | TMDBTVShow)[] | undefined;
  type: "movie" | "tv";
  isLoading?: boolean;
  onSeeAll?: () => void;
  cardWidth?: number;
  cardHeight?: number;
};

export function HorizontalList({ title, data, type, isLoading, onSeeAll, cardWidth = 120, cardHeight = 180 }: Props) {
  return (
    <View style={styles.section}>
      <SectionHeader title={title} onSeeAll={onSeeAll} />
      {isLoading || !data ? (
        <FlatList
          horizontal
          data={[1, 2, 3, 4, 5]}
          keyExtractor={(i) => String(i)}
          renderItem={() => <PosterSkeleton width={cardWidth} height={cardHeight} />}
          contentContainerStyle={styles.list}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
        />
      ) : (
        <FlatList
          horizontal
          data={data}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <PosterCard item={item} type={type} width={cardWidth} height={cardHeight} />}
          contentContainerStyle={styles.list}
          showsHorizontalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  list: {
    paddingHorizontal: 16,
  },
});
