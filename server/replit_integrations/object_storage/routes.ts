import type { Express, Request, Response } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import multer, { Multer } from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  app.get("/api/uploads/health", async (req: Request, res: Response) => {
    try {
      const hasPrivateDir = !!process.env.PRIVATE_OBJECT_DIR;
      const hasPublicPaths = !!process.env.PUBLIC_OBJECT_SEARCH_PATHS;
      const hasBucketId = !!process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      
      if (!hasBucketId) {
        return res.status(503).json({
          status: "not_configured",
          hasPrivateDir,
          hasPublicPaths,
          hasBucketId,
        });
      }

      res.json({
        status: "ok",
        hasPrivateDir,
        hasPublicPaths,
        hasBucketId,
        sdkEnabled: true,
      });
    } catch (error: any) {
      console.error("Object storage health check failed:", error);
      res.status(503).json({
        status: "error",
        error: error.message || "Unknown error",
      });
    }
  });

  app.post("/api/uploads/upload", upload.single("file"), async (req: Request, res: Response) => {
    try {
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({
          error: "No file provided",
          errorAr: "لم يتم تقديم ملف",
        });
      }

      console.log(`[Upload] Uploading file: ${file.originalname}, size: ${file.size}, type: ${file.mimetype}`);
      
      const objectPath = await objectStorageService.uploadFile(file.buffer, file.mimetype);

      console.log(`[Upload] File uploaded successfully: ${objectPath}`);

      res.json({
        success: true,
        objectPath,
        metadata: { 
          name: file.originalname, 
          size: file.size, 
          contentType: file.mimetype 
        },
      });
    } catch (error: any) {
      console.error("Error uploading file:", error);
      res.status(500).json({ 
        error: "Failed to upload file",
        errorAr: "فشل رفع الملف",
        details: process.env.NODE_ENV !== "production" ? error.message : undefined 
      });
    }
  });

  app.get("/objects/*splat", async (req: Request, res: Response) => {
    try {
      await objectStorageService.downloadToResponse(req.path, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}
