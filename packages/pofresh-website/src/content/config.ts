import { defineCollection, z } from 'astro:content';

const docsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    sidebar_position: z.number().optional(),
    tags: z.array(z.string()).optional(),
    version: z.string().optional(),
    lastUpdated: z.date().optional(),
    author: z.string().optional(),
    category: z.string(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  }),
});

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    author: z.string(),
    tags: z.array(z.string()),
    heroImage: z.string().optional(),
    category: z.string(),
  }),
});

const tutorialsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    level: z.enum(['beginner', 'intermediate', 'advanced']),
    estimatedTime: z.string(),
    prerequisites: z.array(z.string()).optional(),
    technologies: z.array(z.string()),
    githubUrl: z.string().optional(),
    demoUrl: z.string().optional(),
  }),
});

export const collections = {
  docs: docsCollection,
  blog: blogCollection,
  tutorials: tutorialsCollection,
};