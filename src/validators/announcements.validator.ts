import { z } from 'zod';

export const announcementSchema = z.object({
  title: z.string().trim().min(5).max(50),
  description: z.string().trim().min(10),
  price: z.number().positive(),
  category: z.enum(['sale', 'service', 'job', 'other']),
});
export const updateAnnouncementSchema = announcementSchema.partial().refine(
  value => Object.keys(value).length > 0,
  { message: 'Provide at least one announcement field' },
);
export const idSchema = z.object({
  id: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(2147483647)),
});
export const querySchema = z.object({
  search: z.string().trim().optional(),
  sort: z.enum(['newest', 'oldest']).default('newest'),
  page: z.string().regex(/^[1-9]\d*$/).default('1').transform(Number)
    .pipe(z.number().int().max(214748364)),
});
