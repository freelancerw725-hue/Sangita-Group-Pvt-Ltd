// Centralised error types + error-handling middleware

export class AppError extends Error {
  constructor(status, message, details = undefined) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.details = details
  }
}

export const badRequest = (msg, details) => new AppError(400, msg, details)
export const notFound = (msg = 'Resource not found') => new AppError(404, msg)
export const unauthorized = (msg = 'Unauthorized', details) => new AppError(401, msg, details)
export const conflict = (msg, details) => new AppError(409, msg, details)
export const unprocessable = (msg, details) => new AppError(422, msg, details)
export const badGateway = (msg = 'Upstream service error', details) => new AppError(502, msg, details)

// Wrap async route handlers so rejected promises reach the error middleware
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.originalUrl}` } })
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Body-parser JSON syntax errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Invalid JSON body' } })
  }
  if (err.code === 'EBADCSRFTOKEN') err.status = 403

  const status = err.status || err.statusCode || 500
  const body = {
    error: {
      message: status >= 500 && !err.expose ? (err.message || 'Internal server error') : err.message,
    },
  }
  if (err.details) body.error.details = err.details
  if (status >= 500) req.log?.error(err)
  else if (status >= 400) req.log?.debug(`${status} ${req.method} ${req.originalUrl}: ${err.message}`)
  res.status(status).json(body)
}
