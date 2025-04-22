import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { playlistRequestSchema } from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // Generate playlist endpoint
  app.post('/api/playlist/generate', async (req, res) => {
    try {
      // Validate request body
      const validatedRequest = playlistRequestSchema.parse(req.body);
      
      // Generate playlist using storage
      const playlist = await storage.generatePlaylist(validatedRequest);
      
      res.json(playlist);
    } catch (error) {
      console.error('Error generating playlist:', error);
      
      if (error instanceof ZodError) {
        // Handle validation errors
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to generate playlist" });
    }
  });

  // Provide song data for autocomplete or browsing (optional enhancement)
  app.get('/api/songs', async (req, res) => {
    try {
      const songs = await storage.getSongs();
      res.json(songs);
    } catch (error) {
      console.error('Error fetching songs:', error);
      res.status(500).json({ message: "Failed to fetch songs" });
    }
  });

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  return httpServer;
}
