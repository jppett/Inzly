import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, DATA_SOURCE } from "./storage";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import { insertPropertySchema, insertIssueSchema } from "@shared/schema";
import { getOpenAI, isAiConfigured, AiNotConfiguredError } from "./openai-client";
import bcrypt from "bcrypt";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Which data connection is live. Handy when the UI looks empty and you
  // need to know whether you're on Postgres or the platform.
  app.get("/api/data-source", (_req, res) => {
    res.json({
      source: DATA_SOURCE,
      platformUrl: DATA_SOURCE === "platform" ? process.env.PLATFORM_API_URL : undefined,
    });
  });

  // Register AI integration routes
  registerChatRoutes(app);
  registerImageRoutes(app);

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, name, password } = req.body;
      if (!email || !name || !password) {
        return res.status(400).json({ error: "Email, name, and password are required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "An account with this email already exists" });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.createUser(email, name, passwordHash);
      req.session.userId = user.id;
      res.status(201).json({ id: user.id, email: user.email, name: user.name });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      req.session.userId = user.id;
      res.json({ id: user.id, email: user.email, name: user.name });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    res.json({ id: user.id, email: user.email, name: user.name });
  });

  // Saved properties routes
  app.post("/api/saved/:propertyId", requireAuth, async (req, res) => {
    try {
      const saved = await storage.saveProperty(req.session.userId!, req.params.propertyId);
      res.status(201).json(saved);
    } catch (error) {
      console.error("Error saving property:", error);
      res.status(500).json({ error: "Failed to save property" });
    }
  });

  app.delete("/api/saved/:propertyId", requireAuth, async (req, res) => {
    try {
      await storage.unsaveProperty(req.session.userId!, req.params.propertyId);
      res.status(204).send();
    } catch (error) {
      console.error("Error unsaving property:", error);
      res.status(500).json({ error: "Failed to unsave property" });
    }
  });

  app.get("/api/saved", requireAuth, async (req, res) => {
    try {
      const saved = await storage.getSavedProperties(req.session.userId!);
      res.json(saved);
    } catch (error) {
      console.error("Error fetching saved properties:", error);
      res.status(500).json({ error: "Failed to fetch saved properties" });
    }
  });

  app.get("/api/saved/:propertyId/check", async (req, res) => {
    if (!req.session.userId) {
      return res.json({ saved: false });
    }
    try {
      const saved = await storage.isPropertySaved(req.session.userId, req.params.propertyId);
      res.json({ saved });
    } catch (error) {
      res.json({ saved: false });
    }
  });

  // Get all properties
  app.get("/api/properties", async (req, res) => {
    try {
      const properties = await storage.getAllProperties();
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ error: "Failed to fetch properties" });
    }
  });

  // Get single property with issues
  app.get("/api/properties/:id", async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      const issues = await storage.getIssuesByPropertyId(req.params.id);
      res.json({ ...property, issues });
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ error: "Failed to fetch property" });
    }
  });

  // Create property
  app.post("/api/properties", async (req, res) => {
    try {
      const validatedData = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(validatedData);
      res.status(201).json(property);
    } catch (error) {
      console.error("Error creating property:", error);
      res.status(400).json({ error: "Invalid property data" });
    }
  });

  // AI Analysis endpoint - analyze a property and generate issues
  app.post("/api/properties/:id/analyze", async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      // Delete existing issues
      await storage.deleteIssuesByPropertyId(property.id);

      // Generate AI analysis
      const prompt = `You are an expert real estate inspector. Analyze this property and identify potential issues, concerns, and positive aspects.

Property Details:
- Address: ${property.address}, ${property.city}, ${property.state}
- Year Built: ${property.yearBuilt}
- Size: ${property.beds} beds, ${property.baths} baths, ${property.sqft} sq ft
- Description: ${property.description}

Provide a JSON array of inspection insights. Each insight should have:
- title: Brief title of the issue/observation
- description: Detailed explanation (2-3 sentences)
- severity: "critical", "warning", "info", or "good"
- category: e.g., "Structural", "Electrical", "Exterior", "Mechanical", "Location", "Financial"
- costEstimate: Estimated repair cost or "N/A" for non-repair items

Generate 4-7 realistic insights based on the property age, location, and typical issues for homes of this era. Include at least one positive "good" finding if applicable.`;

      const response = await getOpenAI().chat.completions.create({
        model: "gpt-5.1",
        messages: [
          {
            role: "system",
            content: "You are a professional real estate inspector with 20 years of experience. Provide realistic, detailed property assessments."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 2048,
      });

      const analysis = JSON.parse(response.choices[0]?.message?.content || "{}");
      const insights = analysis.insights || [];

      // Assign image locations to some issues (roof, foundation, etc.)
      const imageAssignments: Record<string, { imageId: string; x: number; y: number }> = {
        "roof": { imageId: "hero", x: 50, y: 20 },
        "foundation": { imageId: "hero", x: 20, y: 85 },
        "siding": { imageId: "hero", x: 65, y: 55 },
        "electrical": { imageId: "living", x: 85, y: 60 },
        "hvac": { imageId: "backyard", x: 75, y: 75 },
        "plumbing": { imageId: "kitchen", x: 40, y: 65 },
      };

      // Create issues in database
      const createdIssues = [];
      for (const insight of insights) {
        const categoryLower = insight.category.toLowerCase();
        let imageLocation = undefined;

        // Try to assign image location based on category keywords
        for (const [keyword, location] of Object.entries(imageAssignments)) {
          if (categoryLower.includes(keyword) || insight.title.toLowerCase().includes(keyword)) {
            imageLocation = location;
            break;
          }
        }

        const issue = await storage.createIssue({
          propertyId: property.id,
          title: insight.title,
          description: insight.description,
          severity: insight.severity,
          category: insight.category,
          costEstimate: insight.costEstimate === "N/A" ? undefined : insight.costEstimate,
          imageLocation,
        });
        createdIssues.push(issue);
      }

      // Calculate Inzly Score based on severity of issues
      const criticalCount = createdIssues.filter(i => i.severity === "critical").length;
      const warningCount = createdIssues.filter(i => i.severity === "warning").length;
      const goodCount = createdIssues.filter(i => i.severity === "good").length;

      const foundlyScore = Math.max(0, Math.min(100,
        100 - (criticalCount * 20) - (warningCount * 10) + (goodCount * 5)
      ));

      // Update property with Inzly Score
      const updatedProperty = await storage.updateProperty(property.id, { foundlyScore });

      res.json({
        property: updatedProperty,
        issues: createdIssues,
      });
    } catch (error) {
      console.error("Error analyzing property:", error);
      res.status(500).json({ error: "Failed to analyze property" });
    }
  });

  // Delete property
  app.delete("/api/properties/:id", async (req, res) => {
    try {
      await storage.deleteProperty(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting property:", error);
      res.status(500).json({ error: "Failed to delete property" });
    }
  });

  // Ask a question about a property (streaming response)
  app.post("/api/properties/:id/ask", async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      const issues = await storage.getIssuesByPropertyId(req.params.id);
      const { question } = req.body;

      if (!question || typeof question !== "string") {
        return res.status(400).json({ error: "Question is required" });
      }

      // Build context about the property
      const issuesSummary = issues.map(i => 
        `- ${i.title} (${i.severity}): ${i.description}${i.costEstimate ? ` Est: ${i.costEstimate}` : ""}`
      ).join("\n");

      const systemPrompt = `You are a helpful real estate advisor for Inzly, an AI-powered property analysis platform. Answer questions about this specific property based on the data provided.

Property Details:
- Address: ${property.address}, ${property.city}, ${property.state} ${property.zip}
- Price: ${property.price}
- Beds: ${property.beds} | Baths: ${property.baths} | Sq Ft: ${property.sqft}
- Year Built: ${property.yearBuilt}
- Description: ${property.description}
- Inzly Score: ${property.foundlyScore ?? "Not yet analyzed"}/100

Inspection Insights:
${issuesSummary || "No inspection insights available yet."}

Be helpful, concise, and specific to this property. If asked about something not covered in the data, say so honestly. Keep responses focused and under 200 words unless the question requires more detail.`;

      // Set up SSE for streaming
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await getOpenAI().chat.completions.create({
        model: "gpt-5.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
        stream: true,
        max_completion_tokens: 1024,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error answering property question:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to answer question" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to answer question" });
      }
    }
  });

  return httpServer;
}
