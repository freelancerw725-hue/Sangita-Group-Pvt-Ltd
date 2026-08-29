import { badRequest } from '../lib/errors.js'
import { formatZodError } from '../validation/schemas.js'

/** Express middleware: validate req.body / req.query against a zod schema. */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(source === 'query' ? req.query : req.body)
    if (!result.success) {
      return next(badRequest('Validation failed', formatZodError(result.error)))
    }
    if (source === 'query') req.validatedQuery = result.data
    else req.validatedBody = result.data
    next()
  }
}

export const ok = (res, data, status = 200) => res.status(status).json(data)
