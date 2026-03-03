import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

export type FavoriteItem = {
  id: number;
  type: "movie" | "tv" | "person";
  title: string;
  poster_path: string | null;
  vote_average?: number;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  profile_path?: string | null;
};

type FavoritesContextValue = {
  favorites: FavoriteItem[];
  isFavorite: (id: number, type: FavoriteItem["type"]) => boolean;
  toggleFavorite: (item: FavoriteItem) => Promise<void>;
  removeFavorite: (id: number, type: FavoriteItem["type"]) => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);
const STORAGE_KEY = "@mrAflam:favorites";

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setFavorites(JSON.parse(raw));
        } catch {}
      }
    });
  }, []);

  const save = async (items: FavoriteItem[]) => {
    setFavorites(items);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  };

  const isFavorite = (id: number, type: FavoriteItem["type"]) =>
    favorites.some((f) => f.id === id && f.type === type);

  const toggleFavorite = async (item: FavoriteItem) => {
    if (isFavorite(item.id, item.type)) {
      await save(favorites.filter((f) => !(f.id === item.id && f.type === item.type)));
    } else {
      await save([item, ...favorites]);
    }
  };

  const removeFavorite = async (id: number, type: FavoriteItem["type"]) => {
    await save(favorites.filter((f) => !(f.id === id && f.type === type)));
  };

  const value = useMemo(
    () => ({ favorites, isFavorite, toggleFavorite, removeFavorite }),
    [favorites]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
