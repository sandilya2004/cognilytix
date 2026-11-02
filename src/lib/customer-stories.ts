import { z } from "zod";

export const customerStorySchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100),
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address.").max(254),
  description: z.string().trim().min(1, "Description is required.").max(2000),
  suggestions: z.string().trim().max(1000).optional(),
});

export type CustomerStory = {
  id: string;
  name: string;
  description: string;
  suggestions: string | null;
  created_at: string;
};