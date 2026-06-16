import { Router } from "express";
import OpenAI from "openai";

const router = Router();

type ImageResult = {
  ok: true;
  provider: "openai" | "stability" | "replicate";
  model: string;
  imageUrl: string;
  mimeType: string;
  prompt: string;
};

function dataUrlFromBase64(base64: string, mimeType = "image/png") {
  return `data:${mimeType};base64,${base64}`;
}

async function generateWithOpenAI(prompt: string, size: string): Promise<ImageResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY missing");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const models = [
    process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
    "dall-e-3",
  ];

  let lastError: unknown;

  for (const model of models) {
    try {
      const response = await client.images.generate({
        model,
        prompt,
        size: size as any,
        n: 1,
        // IMPORTANT:
        // Do NOT send response_format here.
        // gpt-image-1 rejects it with: Unknown parameter response_format
      } as any);

      const image = response.data?.[0];

      if (image?.b64_json) {
        return {
          ok: true,
          provider: "openai",
          model,
          imageUrl: dataUrlFromBase64(image.b64_json),
          mimeType: "image/png",
          prompt,
        };
      }

      if (image?.url) {
        return {
          ok: true,
          provider: "openai",
          model,
          imageUrl: image.url,
          mimeType: "image/png",
          prompt,
        };
      }

      throw new Error("OpenAI returned no image data");
    } catch (error: any) {
      lastError = error;
      console.warn(`[imageGenerate] OpenAI model failed: ${model}`, {
        status: error?.status,
        message: error?.message,
      });

      const msg = String(error?.message || "");
      const status = Number(error?.status || 0);

      const shouldTryNext =
        status === 400 ||
        status === 403 ||
        msg.includes("does not have access") ||
        msg.includes("Unknown parameter") ||
        msg.includes("model");

      if (!shouldTryNext) break;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("OpenAI image generation failed");
}

async function generateWithStability(prompt: string, size: string): Promise<ImageResult> {
  if (!process.env.STABILITY_API_KEY) {
    throw new Error("STABILITY_API_KEY missing");
  }

  const [width, height] = size.split("x").map(Number);
  const form = new FormData();
  form.append("prompt", prompt);
  form.append("output_format", "png");
  form.append("aspect_ratio", width === height ? "1:1" : "16:9");

  const res = await fetch("https://api.stability.ai/v2beta/stable-image/generate/core", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
      Accept: "image/*",
    },
    body: form as any,
  });

  if (!res.ok) {
    throw new Error(`Stability failed: ${res.status} ${await res.text()}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  return {
    ok: true,
    provider: "stability",
    model: "stable-image-core",
    imageUrl: dataUrlFromBase64(buffer.toString("base64")),
    mimeType: "image/png",
    prompt,
  };
}

async function generateWithReplicate(prompt: string): Promise<ImageResult> {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN missing");
  }

  const model =
    process.env.REPLICATE_IMAGE_MODEL ||
    "black-forest-labs/flux-schnell";

  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
      Prefer: "wait",
    },
    body: JSON.stringify({
      version: model,
      input: {
        prompt,
        num_outputs: 1,
        output_format: "png",
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Replicate failed: ${res.status} ${await res.text()}`);
  }

  const json: any = await res.json();
  const output = Array.isArray(json.output) ? json.output[0] : json.output;

  if (!output) {
    throw new Error("Replicate returned no image output");
  }

  return {
    ok: true,
    provider: "replicate",
    model,
    imageUrl: output,
    mimeType: "image/png",
    prompt,
  };
}

async function handler(req: any, res: any) {
  const prompt = String(req.body?.prompt || "").trim();
  const size = String(req.body?.size || "1024x1024");

  if (!prompt) {
    return res.status(400).json({
      ok: false,
      error: "Prompt is required",
    });
  }

  const errors: string[] = [];

  try {
    const result = await generateWithOpenAI(prompt, size);
    return res.json(result);
  } catch (error: any) {
    errors.push(`OpenAI: ${error?.message || error}`);
  }

  try {
    const result = await generateWithStability(prompt, size);
    return res.json(result);
  } catch (error: any) {
    errors.push(`Stability: ${error?.message || error}`);
  }

  try {
    const result = await generateWithReplicate(prompt);
    return res.json(result);
  } catch (error: any) {
    errors.push(`Replicate: ${error?.message || error}`);
  }

  return res.status(502).json({
    ok: false,
    error: "All image providers failed",
    details: errors,
    fix: [
      "Your OpenAI project currently has no access to gpt-image-1.",
      "Either enable OpenAI image access, or add STABILITY_API_KEY / REPLICATE_API_TOKEN.",
      "The old response_format parameter has been removed.",
    ],
  });
}

router.post("/", handler);
router.post("/generate", handler);
router.post("/image", handler);
router.post("/image/generate", handler);
router.post("/images/generate", handler);

export default router;
