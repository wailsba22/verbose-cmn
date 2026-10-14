export const dynamic = 'force-dynamic';
import { connect } from '@/lib/db';

export async function GET() {
  try {
    const m = await connect();
    return Response.json({ ok: true, db: m.connection.name });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
