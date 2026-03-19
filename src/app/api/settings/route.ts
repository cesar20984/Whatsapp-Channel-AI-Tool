import { NextResponse } from 'next/server';
import { getSettings, saveSetting } from '@/lib/services';

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { key, value } = await request.json();
    if (!key || value === undefined) return NextResponse.json({ error: 'Missing key or value' }, { status: 400 });
    await saveSetting(key, value);
    return NextResponse.json({ success: true, key, value });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
