import type { RequestHandler } from 'express';
import prisma from '../../prisma/client.ts';
import { publicUserFields } from './auth.controller.ts';
import { HttpError } from '../utils/errors.ts';

const announcementFields = {
  id: true, title: true, description: true, price: true, category: true,
  createdAt: true, updatedAt: true, user: { select: publicUserFields },
} as const;

export const listAnnouncements: RequestHandler = async (_req, res) => {
  const { search, sort, page } = res.locals.query;
  const where = search ? { title: { contains: search, mode: 'insensitive' as const } } : {};
  const perPage = 10;
  const direction = sort === 'oldest' ? 'asc' : 'desc';
  const [data, total] = await prisma.$transaction([
    prisma.announcement.findMany({
      where, select: announcementFields,
      orderBy: [{ createdAt: direction }, { id: direction }],
      skip: (page - 1) * perPage, take: perPage,
    }),
    prisma.announcement.count({ where }),
  ], { isolationLevel: 'RepeatableRead' });
  res.json({ data, pagination: { total, page, totalPages: Math.ceil(total / perPage), perPage } });
};

export const getAnnouncement: RequestHandler = async (_req, res) => {
  const announcement = await prisma.announcement.findUnique({
    where: { id: res.locals.params.id }, select: announcementFields,
  });
  if (!announcement) throw new HttpError(404, 'Announcement not found');
  res.json(announcement);
};

export const createAnnouncement: RequestHandler = async (req, res) => {
  const announcement = await prisma.announcement.create({
    data: { ...res.locals.body, userId: req.user.sub }, select: announcementFields,
  });
  res.status(201).json(announcement);
};

async function checkOwnership(id: number, userId: number) {
  const announcement = await prisma.announcement.findUnique({ where: { id } });
  if (!announcement) throw new HttpError(404, 'Announcement not found');
  if (announcement.userId !== userId) throw new HttpError(403, 'Access denied');
}

export const updateAnnouncement: RequestHandler = async (req, res) => {
  const { id } = res.locals.params;
  await checkOwnership(id, req.user.sub);
  const announcement = await prisma.announcement.update({
    where: { id, userId: req.user.sub }, data: res.locals.body, select: announcementFields,
  });
  res.json(announcement);
};

export const deleteAnnouncement: RequestHandler = async (req, res) => {
  const { id } = res.locals.params;
  await checkOwnership(id, req.user.sub);
  await prisma.announcement.delete({ where: { id, userId: req.user.sub } });
  res.status(204).end();
};
