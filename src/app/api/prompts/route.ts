import { NextResponse } from 'next/server';
import { getPrompts, updatePrompt, createPrompt, deletePrompt, updatePromptPositions } from '@/lib/services';

export async function GET() {
  try { return NextResponse.json(getPrompts()); } 
  catch (error) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const { title, content, color } = await request.json();
    const id = title.toLowerCase().trim().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    const success = createPrompt(id, title, content, color || 'var(--accent-color)');
    return NextResponse.json({ success, id });
  } catch (error) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

export async function PUT(request: Request) {
  try {
    const { id, content, negative_prompt, title, color } = await request.json();
    const success = updatePrompt(id, content, negative_prompt || '', title, color);
    return NextResponse.json({ success, id });
  } catch (error) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    const { positions } = await request.json(); // Array of {id, position}
    updatePromptPositions(positions);
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    const success = deletePrompt(id);
    return NextResponse.json({ success });
  } catch (error) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}
