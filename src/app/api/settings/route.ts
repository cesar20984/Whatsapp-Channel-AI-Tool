import { NextResponse } from 'next/server';
import { getSettings, saveSetting } from '@/lib/services';

export async function GET() {
  try {
    const settings = getSettings();
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings', details: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { key, value } = await request.json();
    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Missing key or value' }, { status: 400 });
    }
    saveSetting(key, value);
    return NextResponse.json({ success: true, key, value });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save setting', details: String(error) }, { status: 500 });
  }
}
