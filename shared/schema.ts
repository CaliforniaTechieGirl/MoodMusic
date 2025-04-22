import { pgTable, text, serial, integer, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Song model
export const songs = pgTable("songs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  album: text("album"),
  genre: varchar("genre", { length: 50 }).array(),
  mood: varchar("mood", { length: 50 }).array(),
  duration: integer("duration").notNull(), // in seconds
});

// Suggestions model
export const suggestions = pgTable("suggestions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
});

// Playlist model
export const playlists = pgTable("playlists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  context: text("context").notNull(),
});

// Playlist Song junction
export const playlistSongs = pgTable("playlist_songs", {
  id: serial("id").primaryKey(),
  playlistId: integer("playlist_id").notNull(),
  songId: integer("song_id").notNull(),
  position: integer("position").notNull(),
});

// Insert schemas
export const insertSongSchema = createInsertSchema(songs).omit({ id: true });
export const insertSuggestionSchema = createInsertSchema(suggestions).omit({ id: true });
export const insertPlaylistSchema = createInsertSchema(playlists).omit({ id: true });
export const insertPlaylistSongSchema = createInsertSchema(playlistSongs).omit({ id: true });

// Insert types
export type InsertSong = z.infer<typeof insertSongSchema>;
export type InsertSuggestion = z.infer<typeof insertSuggestionSchema>;
export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
export type InsertPlaylistSong = z.infer<typeof insertPlaylistSongSchema>;

// Select types
export type Song = typeof songs.$inferSelect;
export type Suggestion = typeof suggestions.$inferSelect;
export type Playlist = typeof playlists.$inferSelect;
export type PlaylistSong = typeof playlistSongs.$inferSelect;

// Playlist generation request/response types
export const playlistRequestSchema = z.object({
  context: z.string().min(1, "Context is required"),
  suggestions: z.array(z.object({
    title: z.string().min(1, "Song title is required"),
    artist: z.string().min(1, "Artist name is required")
  })).min(1, "At least one song suggestion is required").max(3, "Maximum 3 song suggestions allowed")
});

export type PlaylistRequest = z.infer<typeof playlistRequestSchema>;

export type PlaylistResponse = {
  name: string;
  tracks: Array<{
    id: number;
    title: string;
    artist: string;
    album?: string;
    duration: number;
  }>;
};
