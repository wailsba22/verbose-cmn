import { connect } from './db';

export const ok = (data, status = 200) => Response.json(data, { status });
export const fail = (error, status = 400, extra = {}) => Response.json({ error, ...extra }, { status });

export function handler(fn) {
  return async (req, ctx) => {
    try {
      await connect();
      return await fn(req, ctx);
    } catch (e) {
      console.error(e);
      return fail(e.name === 'CastError' ? 'Not found' : e.message || 'Server error', e.name === 'CastError' ? 404 : 500);
    }
  };
}
