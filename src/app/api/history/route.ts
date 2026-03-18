import { NextResponse } from 'next/server';
import { getRecentGenerations } from '@/lib/services';

export async function GET() {
  try {
    const history = getRecentGenerations(30); // get last 30 days
    return NextResponse.json(history);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch history', details: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id, ids, deleteAll } = await request.json();
    const { deleteGeneration, deleteGenerations, deleteAllGenerations } = require('@/lib/services');

    if (deleteAll) {
      deleteAllGenerations();
      return NextResponse.json({ success: true, message: 'All history deleted' });
    }

    if (ids && Array.isArray(ids)) {
      const success = deleteGenerations(ids.map(Number));
      if (!success) {
        return NextResponse.json({ error: 'Failed to delete some or all items' }, { status: 404 });
      }
      return NextResponse.json({ success: true, deletedCount: ids.length });
    }

    if (id !== undefined) {
      const success = deleteGeneration(Number(id));
      if (!success) {
        return NextResponse.json({ error: 'Generation not found or not deleted' }, { status: 404 });
      }
      return NextResponse.json({ success: true, id });
    }

    return NextResponse.json({ error: 'Missing id, ids array, or deleteAll flag' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete history', details: String(error) }, { status: 500 });
  }
}
