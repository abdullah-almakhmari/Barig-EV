import { Client } from "@replit/object-storage";
import { Response } from "express";
import { randomUUID } from "crypto";

let objectStorageClient: Client | null = null;
let clientInitialized = false;

async function getClient(): Promise<Client> {
  if (!objectStorageClient || !clientInitialized) {
    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    if (!bucketId) {
      throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID not set");
    }
    objectStorageClient = new Client({ bucketId });
    clientInitialized = true;
  }
  return objectStorageClient;
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  async uploadFile(file: Buffer, contentType?: string): Promise<string> {
    const client = await getClient();
    const objectId = randomUUID();
    const objectName = `uploads/${objectId}`;
    
    const result = await client.uploadFromBytes(objectName, file);

    if (result.error) {
      throw new Error(`Failed to upload file: ${result.error.message}`);
    }

    return `/objects/${objectName}`;
  }

  async downloadFile(objectPath: string): Promise<Buffer> {
    const client = await getClient();
    const objectName = this.extractObjectName(objectPath);
    
    const result = await client.downloadAsBytes(objectName);
    
    if (result.error) {
      if (result.error.message?.includes("not found") || result.error.message?.includes("404")) {
        throw new ObjectNotFoundError();
      }
      throw new Error(`Failed to download file: ${result.error.message}`);
    }

    return result.value as unknown as Buffer;
  }

  async downloadToResponse(objectPath: string, res: Response, cacheTtlSec: number = 3600, contentType?: string): Promise<void> {
    const client = await getClient();
    const objectName = this.extractObjectName(objectPath);
    
    try {
      const stream = client.downloadAsStream(objectName);
      
      // Try to infer content type from file extension or use provided contentType
      let mimeType = contentType || "application/octet-stream";
      if (!contentType) {
        if (objectName.match(/\.(jpg|jpeg)$/i)) mimeType = "image/jpeg";
        else if (objectName.match(/\.png$/i)) mimeType = "image/png";
        else if (objectName.match(/\.gif$/i)) mimeType = "image/gif";
        else if (objectName.match(/\.webp$/i)) mimeType = "image/webp";
        else if (objectName.match(/\.svg$/i)) mimeType = "image/svg+xml";
        // For UUIDs without extensions, assume image/jpeg as most common for profile pictures
        else if (objectPath.includes("/uploads/")) mimeType = "image/jpeg";
      }
      
      res.set({
        "Content-Type": mimeType,
        "Cache-Control": `public, max-age=${cacheTtlSec}`,
      });

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  async exists(objectPath: string): Promise<boolean> {
    const client = await getClient();
    const objectName = this.extractObjectName(objectPath);
    const result = await client.exists(objectName);
    if (result.error) {
      return false;
    }
    return result.value;
  }

  async deleteFile(objectPath: string): Promise<void> {
    const client = await getClient();
    const objectName = this.extractObjectName(objectPath);
    const result = await client.delete(objectName);
    if (result.error) {
      throw new Error(`Failed to delete file: ${result.error.message}`);
    }
  }

  private extractObjectName(objectPath: string): string {
    if (objectPath.startsWith("/objects/")) {
      return objectPath.slice("/objects/".length);
    }
    if (objectPath.startsWith("objects/")) {
      return objectPath.slice("objects/".length);
    }
    return objectPath;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (rawPath.startsWith("https://storage.googleapis.com/")) {
      const url = new URL(rawPath);
      const pathname = url.pathname;
      const parts = pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        const objectName = parts.slice(1).join("/");
        return `/objects/${objectName}`;
      }
    }
    return rawPath;
  }
}

export { getClient as getObjectStorageClient };
