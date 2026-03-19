import { NextResponse } from 'next/server';
import { getPrompts, updatePrompt, createPrompt, deletePrompt, updatePromptPositions } from '@/lib/services';

export async function GET() {
  try { return NextResponse.json(await getPrompts()); } 
  catch (error) { return NextResponse.json({ error: String(error) }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const { title, content, color } = await request.json();
    const id = title.toLowerCase().trim().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    const success = await createPrompt(id, title, content, color || 'var(--accent-color)');
    return NextResponse.json({ success, id });
  } catch (error) { return NextResponse.json({ error: String(error) }, { status: 500 }); }
}

export async function PUT(request: Request) {
  try {
    const { id, content, negative_prompt, title, color } = await request.json();
    const success = await updatePrompt(id, content, negative_prompt || '', title, color);
    return NextResponse.json({ success, id });
  } catch (error) { return NextResponse.json({ error: String(error) }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    const { positions } = await request.json(); 
    await updatePromptPositions(positions);
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: String(error) }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    const success = await deletePrompt(id);
    return NextResponse.json({ success });
  } catch (error) { return NextResponse.json({ error: String(error) }, { status: 500 }); }
}
