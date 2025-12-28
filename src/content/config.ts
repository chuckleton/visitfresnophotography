import { defineCollection, z } from "astro:content";

const portfolio = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    category: z.enum(["Wildlife", "Ski Mountaineering", "Landscapes"]),
    location: z.string().optional(),
    date: z.string().optional(),
    coverUrl: z.string(), // AWS URL (S3/CloudFront)
    coverAlt: z.string().default("Photograph"),
    featured: z.boolean().default(false),
  }),
});

export const collections = { portfolio };
