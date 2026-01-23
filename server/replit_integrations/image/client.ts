import fs from "node:fs";
import OpenAI, { toFile } from "openai";
import { Buffer } from "node:buffer";

export const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

/**
 * Analyze a charging screen photo and extract the kWh value using AI vision.
 * Returns the extracted energy value in kWh, or null if not found.
 */
export async function analyzeChargingScreenshot(imageUrl: string): Promise<{
  energyKwh: number | null;
  confidence: "high" | "medium" | "low";
  rawText: string | null;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert at reading EV charging station screens. Your task is to extract the energy delivered (kWh) from the charging screen photo.

INSTRUCTIONS:
1. Look for the total energy delivered value, usually shown as "kWh", "Energy", "الطاقة", or similar
2. Focus on the FINAL or TOTAL energy value, not partial readings
3. The value is typically between 0.1 and 100 kWh for a single charging session
4. Return ONLY the numeric value without units
5. If you cannot find or read the value clearly, return null

RESPONSE FORMAT (JSON only):
{
  "energyKwh": <number or null>,
  "confidence": "high" | "medium" | "low",
  "rawText": "<what you read from the screen>"
}`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the energy (kWh) value from this EV charging screen photo:"
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 200,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { energyKwh: null, confidence: "low", rawText: null };
    }

    const parsed = JSON.parse(content);
    return {
      energyKwh: typeof parsed.energyKwh === "number" ? parsed.energyKwh : null,
      confidence: parsed.confidence || "low",
      rawText: parsed.rawText || null
    };
  } catch (error) {
    console.error("Error analyzing charging screenshot:", error);
    return { energyKwh: null, confidence: "low", rawText: null };
  }
}

/**
 * Generate an image and return as Buffer.
 * Uses gpt-image-1 model via Replit AI Integrations.
 */
export async function generateImageBuffer(
  prompt: string,
  size: "1024x1024" | "512x512" | "256x256" = "1024x1024"
): Promise<Buffer> {
  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    size,
  });
  const base64 = response.data[0]?.b64_json ?? "";
  return Buffer.from(base64, "base64");
}

/**
 * Edit/combine multiple images into a composite.
 * Uses gpt-image-1 model via Replit AI Integrations.
 */
export async function editImages(
  imageFiles: string[],
  prompt: string,
  outputPath?: string
): Promise<Buffer> {
  const images = await Promise.all(
    imageFiles.map((file) =>
      toFile(fs.createReadStream(file), file, {
        type: "image/png",
      })
    )
  );

  const response = await openai.images.edit({
    model: "gpt-image-1",
    image: images,
    prompt,
  });

  const imageBase64 = response.data[0]?.b64_json ?? "";
  const imageBytes = Buffer.from(imageBase64, "base64");

  if (outputPath) {
    fs.writeFileSync(outputPath, imageBytes);
  }

  return imageBytes;
}

