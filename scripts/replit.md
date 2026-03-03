# Mr Aflam — Movie & TV Discovery App

A cinematic dark-mode Expo React Native app for discovering movies and TV shows, powered by the TMDB API.

## Architecture

- **Frontend**: Expo Router (file-based routing), React Query for data fetching, AsyncStorage for favorites
- **Backend**: Express.js server that proxies TMDB API calls (keeps API keys server-side)
- **Data**: TMDB API with 48hr in-memory cache, multi-key rotation, retry logic

## Project Structure

```
app/
  (tabs)/
    _layout.tsx          # 4-tab navigation (Home, Categories, Search, Favorites)
    index.tsx            # Home screen — hero carousel + horizontal sections
    categories.tsx       # Categories — genre grid + top rated sections
    search.tsx           # Search — movies/TV/people with tabs
    favorites.tsx        # Favorites — locally saved items
  movie/[id].tsx         # Movie detail page
  tv/[id].tsx            # TV show detail page
  person/[id].tsx        # Person detail page
  genre/[type]/[id].tsx  # Genre browse page

components/
  HeroCarousel.tsx       # Auto-scrolling backdrop hero
  HorizontalList.tsx     # Horizontal scrollable poster list
  PosterCard.tsx         # Individual poster card with rating
  PosterGrid.tsx         # 3-column responsive poster grid
  GenreGrid.tsx          # 2-column genre browse grid
  CastCard.tsx           # Circular cast member card
  SectionHeader.tsx      # Section title with optional "See All"
  SkeletonCard.tsx       # Animated loading skeletons

context/
  favorites.tsx          # Favorites state + AsyncStorage persistence

lib/
  tmdb.ts               # Client-side TMDB API wrappers
  query-client.ts       # React Query + base API URL config

server/
  tmdb.ts               # Server-side TMDB functions (cache, retry, filter)
  routes.ts             # Express routes: /api/tmdb/*
```

## Features

- Dark cinema theme (#000000 background, #E50914 Netflix red accent)
- Hero carousel with auto-scroll and pagination dots
- Home sections: Trending Movies, Popular Movies, Trending TV, Popular TV, Now Playing, Upcoming
- Categories with genre grid (tap to browse paginated content)
- Search with Movies/TV/People result tabs
- Movie/TV/Person detail pages with cast, similar content, trailer links
- Seasons list for TV shows
- Favorites persisted locally via AsyncStorage
- Content filtering: excludes Arabic content, documentaries, news
- 48hr server-side cache; multi-key API rotation

## Environment Variables

- `TMDB_API_KEY` (secret) — TMDB API key from themoviedb.org

## Running

- Backend: `npm run server:dev` (port 5000)
- Frontend: `npm run expo:dev` (port 8081)
