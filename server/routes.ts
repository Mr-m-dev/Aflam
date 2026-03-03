import type { Express } from "express";
import { createServer, type Server } from "node:http";
import {
  getTrendingMovies,
  getTrendingTVShows,
  getPopularMovies,
  getPopularTVShows,
  getNowPlayingMovies,
  getUpcomingMovies,
  getTopRatedMovies,
  getTopRatedTVShows,
  getMovieGenres,
  getTVGenres,
  getMoviesByGenre,
  getTVShowsByGenre,
  searchAll,
  getMovieDetails,
  getTVShowDetails,
  getSeasonDetails,
  getPersonDetails,
} from "./tmdb";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/tmdb/trending/movies", async (_req, res) => {
    try {
      const data = await getTrendingMovies();
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch trending movies" });
    }
  });

  app.get("/api/tmdb/trending/tv", async (_req, res) => {
    try {
      const data = await getTrendingTVShows();
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch trending TV shows" });
    }
  });

  app.get("/api/tmdb/popular/movies", async (req, res) => {
    try {
      const page = parseInt(String(req.query.page || "1"), 10);
      const data = await getPopularMovies(page);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch popular movies" });
    }
  });

  app.get("/api/tmdb/popular/tv", async (req, res) => {
    try {
      const page = parseInt(String(req.query.page || "1"), 10);
      const data = await getPopularTVShows(page);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch popular TV shows" });
    }
  });

  app.get("/api/tmdb/now-playing", async (req, res) => {
    try {
      const page = parseInt(String(req.query.page || "1"), 10);
      const data = await getNowPlayingMovies(page);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch now playing movies" });
    }
  });

  app.get("/api/tmdb/upcoming", async (req, res) => {
    try {
      const page = parseInt(String(req.query.page || "1"), 10);
      const data = await getUpcomingMovies(page);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch upcoming movies" });
    }
  });

  app.get("/api/tmdb/top-rated/movies", async (req, res) => {
    try {
      const page = parseInt(String(req.query.page || "1"), 10);
      const data = await getTopRatedMovies(page);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch top rated movies" });
    }
  });

  app.get("/api/tmdb/top-rated/tv", async (req, res) => {
    try {
      const page = parseInt(String(req.query.page || "1"), 10);
      const data = await getTopRatedTVShows(page);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch top rated TV shows" });
    }
  });

  app.get("/api/tmdb/genres/movies", async (_req, res) => {
    try {
      const data = await getMovieGenres();
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch movie genres" });
    }
  });

  app.get("/api/tmdb/genres/tv", async (_req, res) => {
    try {
      const data = await getTVGenres();
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch TV genres" });
    }
  });

  app.get("/api/tmdb/genre/movies/:genreId", async (req, res) => {
    try {
      const genreId = parseInt(req.params.genreId, 10);
      const page = parseInt(String(req.query.page || "1"), 10);
      const data = await getMoviesByGenre(genreId, page);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch movies by genre" });
    }
  });

  app.get("/api/tmdb/genre/tv/:genreId", async (req, res) => {
    try {
      const genreId = parseInt(req.params.genreId, 10);
      const page = parseInt(String(req.query.page || "1"), 10);
      const data = await getTVShowsByGenre(genreId, page);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch TV shows by genre" });
    }
  });

  app.get("/api/tmdb/search", async (req, res) => {
    try {
      const query = String(req.query.query || "");
      const page = parseInt(String(req.query.page || "1"), 10);
      const data = await searchAll(query, page);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: "Search failed" });
    }
  });

  app.get("/api/tmdb/movie/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const data = await getMovieDetails(id);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch movie details" });
    }
  });

  app.get("/api/tmdb/tv/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const data = await getTVShowDetails(id);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch TV show details" });
    }
  });

  app.get("/api/tmdb/tv/:id/season/:seasonNumber", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const seasonNumber = parseInt(req.params.seasonNumber, 10);
      const data = await getSeasonDetails(id, seasonNumber);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch season details" });
    }
  });

  app.get("/api/tmdb/person/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const data = await getPersonDetails(id);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch person details" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
