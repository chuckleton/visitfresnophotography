import { defineCollection, z } from "astro:content";

const portfolio = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    category: z.enum(["Wildlife", "Ski Mountaineering", "Climbing", "Landscapes", "Adventure"]),
    location: z.string().optional(),
    date: z.string().optional(),

    imageSlug: z.string(),     // folder name on CDN, e.g. "fox-in-wind"
    coverAlt: z.string().default("Photograph"),
    featured: z.boolean().default(false),
  }),
});

export const collections = { portfolio };
