import type { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Validation failed', details: { body: ['Invalid JSON format in request body'] } });
  } else if (error.status >= 400 && error.status < 500) {
    res.status(error.status).json({ error: error.message });
  } else if (error.code === 'P2025') {
    res.status(404).json({ error: 'Resource not found' });
  } else if (error.code === 'P2002') {
    res.status(409).json({ error: 'Unique constraint violation' });
  } else if (error.code === 'P2003') {
    res.status(400).json({ error: 'Foreign key constraint failed' });
  } else {
    console.error('Unexpected request error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};
