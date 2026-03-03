import React from "react";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { profileUrl } from "@/lib/tmdb";

type Props = {
  id: number;
  name: string;
  character?: string;
  profile_path: string | null;
};

export function CastCard({ id, name, character, profile_path }: Props) {
  const photo = profileUrl(profile_path, "w185");

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/person/[id]", params: { id: String(id) } })}
      style={styles.container}
    >
      {({ pressed }) => (
        <View style={{ opacity: pressed ? 0.7 : 1 }}>
          <View style={styles.photo}>
            {photo ? (
              <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
            ) : (
              <View style={styles.placeholder}>
                <Ionicons name="person" size={24} color={Colors.textMuted} />
              </View>
            )}
          </View>
          <Text style={styles.name} numberOfLines={2}>{name}</Text>
          {character ? <Text style={styles.character} numberOfLines={1}>{character}</Text> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 80,
    marginRight: 14,
    alignItems: "center",
  },
  photo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.surface,
    overflow: "hidden",
    marginBottom: 6,
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 14,
  },
  character: {
    color: Colors.textMuted,
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 2,
  },
});
