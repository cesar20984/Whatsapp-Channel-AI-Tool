"use client";

import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [prompts, setPrompts] = useState<{id: string, title: string, content: string, negative_prompt?: string, color?: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{text?: string, image?: string, synthesizedPrompt?: string, originalResolvedPrompt?: string} | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<{id: string, title: string, content: string, negative_prompt?: string, color?: string} | null>(null);
  const [customContext, setCustomContext] = useState('');
  const [allowTextInImage, setAllowTextInImage] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ title: '', content: '', color: '#3b82f6' });
  
  // FEEDBACK STATE
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const canDragRef = useRef(false);
  const promptsRef = useRef(prompts);
  
  // Keep ref in sync with state
  useEffect(() => { promptsRef.current = prompts; }, [prompts]);

  useEffect(() => {
    fetch('/api/prompts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPrompts(data);
        else setPrompts([]);
      })
      .catch(() => setPrompts([]));
  }, []);

  const handleGenerate = async (promptId: string, actionType: 'text' | 'image' = 'text') => {
    const promptItem = prompts.find(p => p.id === promptId);
    let resolvedContent = promptItem?.content;

    if (resolvedContent && resolvedContent.includes('[INPUT]')) {
      const userInput = window.prompt("Escribe el contenido extra para este botón (ej: sugerencia, pasaje o solicitud):");
      if (userInput === null) return; // Canceló
      resolvedContent = resolvedContent.replace('[INPUT]', userInput);
    }

    setLoading(true);
    setResult(null);
    setCopiedText(false);
    setCopiedImage(false);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId, customPrompt: resolvedContent, userContext: customContext, actionType, allowTextInImage })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (actionType === 'text') setResult({ text: data.result, originalResolvedPrompt: data.originalResolvedPrompt });
      else setResult({ image: data.result, synthesizedPrompt: data.synthesizedPrompt, originalResolvedPrompt: data.originalResolvedPrompt });
    } catch (error) { alert(error); } 
    finally { setLoading(false); }
  };

  const handleSavePrompt = async () => {
    if (editingPrompt) {
      await fetch('/api/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: editingPrompt.id, title: editingPrompt.title, content: editingPrompt.content,
          negative_prompt: editingPrompt.negative_prompt, color: editingPrompt.color
        })
      });
      setPrompts(prompts.map(p => p.id === editingPrompt.id ? editingPrompt : p));
      setEditingPrompt(null);
    }
  };

  const handleAddNewPrompt = async () => {
    if (!newPrompt.title || !newPrompt.content) return;
    const res = await fetch('/api/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPrompt)
    });
    const data = await res.json();
    if (data.success) {
      setPrompts([...prompts, { id: data.id, ...newPrompt }]);
      setIsAddingNew(false);
      setNewPrompt({ title: '', content: '', color: '#3b82f6' });
    }
  };

  const handleDeletePrompt = async (id: string) => {
    if (!confirm('¿Eliminar?')) return;
    const res = await fetch('/api/prompts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (res.ok) {
      setPrompts(prompts.filter(p => p.id !== id));
      setEditingPrompt(null);
    }
  };

  const draggablePrompts = prompts.filter(p => p.id !== 'image_generation');
  const imagePrompt = prompts.find(p => p.id === 'image_generation');

  const onDragStart = (index: number) => setDraggedItemIndex(index);
  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    const reordered = [...draggablePrompts];
    const draggedItem = reordered[draggedItemIndex];
    reordered.splice(draggedItemIndex, 1);
    reordered.splice(index, 0, draggedItem);
    setDraggedItemIndex(index);
    // Rebuild full array: draggable items + image_generation at end
    setPrompts(imagePrompt ? [...reordered, imagePrompt] : reordered);
  };

  const onDragEnd = async () => {
    setDraggedItemIndex(null);
    canDragRef.current = false;
    const currentPrompts = promptsRef.current;
    const positions = currentPrompts.map((p, idx) => ({ id: p.id, position: idx }));
    try {
      await fetch('/api/prompts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions })
      });
    } catch (err) { console.error('Failed to save positions:', err); }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 3000);
  };

  const copyImage = async (url: string) => {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width; canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          canvas.toBlob(b => b ? resolve(b) : reject('Canvas fail'), 'image/png');
        };
        img.onerror = () => reject('Load fail');
        img.src = url;
      });
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 3000);
    } catch (err) { console.error('Error copy image:', err); }
  };

  return (
    <div className="container">
      
      {/* Context + Add Button */}
      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span className="form-label" style={{ margin: 0 }}>Contexto (Opcional)</span>
          <button className="btn btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem' }} onClick={() => setIsAddingNew(true)}>
            ➕ Nuevo Botón
          </button>
        </div>
        <textarea className="form-control" placeholder="Añadir contexto específico..." value={customContext} onChange={(e) => setCustomContext(e.target.value)} style={{ minHeight: '45px' }} />
      </div>

      {/* Loading */}
      {loading && (
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '1rem', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
          <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>Creando...</p>
        </div>
      )}

      {/* Text Result */}
      {result?.text && (
        <div className="glass-panel animate-fade-in" style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid var(--accent-color)' }}>
          <div style={{ whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '8px', marginBottom: '0.8rem', fontSize: '0.9rem' }}>{result.text}</div>
          <button 
            className="btn" 
            style={{ width: '100%', background: copiedText ? '#10b981' : 'var(--accent-color)', color: 'white', transition: 'all 0.3s' }} 
            onClick={() => copyToClipboard(result.text!)}
          >
            {copiedText ? '✅ ¡Copiado!' : '📋 Copiar Texto'}
          </button>
        </div>
      )}

      {/* Image Result */}
      {result?.image && (
        <div className="glass-panel animate-fade-in" style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid #ec4899', textAlign: 'center' }}>
          <img src={result.image} alt="Generado" style={{ width: '100%', maxWidth: '400px', borderRadius: '12px', marginBottom: '0.8rem' }} />
          <button 
            className="btn" 
            style={{ width: '100%', background: copiedImage ? '#10b981' : '#ec4899', color: 'white', transition: 'all 0.3s' }} 
            onClick={() => copyImage(result.image!)}
          >
            {copiedImage ? '✅ ¡Imagen Copiada!' : '🖼️ Copiar Imagen'}
          </button>
          <details style={{ marginTop: '0.8rem', cursor: 'pointer', textAlign: 'left' }}>
            <summary style={{ fontSize: '0.65rem', opacity: 0.6 }}>🔍 Datos técnicos</summary>
            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {result.originalResolvedPrompt && <div style={{ fontSize: '0.7rem', opacity: 0.8, padding: '0.5rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px' }}><p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{result.originalResolvedPrompt}</p></div>}
              {result.synthesizedPrompt && <div style={{ fontSize: '0.7rem', opacity: 0.8, padding: '0.5rem', border: '1px dashed #ec4899', borderRadius: '6px' }}><p style={{ margin: 0, fontStyle: 'italic', wordBreak: 'break-word' }}>{result.synthesizedPrompt}</p></div>}
            </div>
          </details>
        </div>
      )}

      {/* Image Generation Card */}
      {prompts.filter(p => p.id === 'image_generation').map(p => (
        <div key={p.id} className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', borderTop: '4px solid #ec4899', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#ec4899', fontSize: '1rem' }}>🎨 {p.title}</h3>
            <button className="btn btn-icon" onClick={() => setEditingPrompt(p)}>⚙️</button>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem' }}>
            <input type="checkbox" checked={allowTextInImage} onChange={(e) => setAllowTextInImage(e.target.checked)} style={{ width: '18px', height: '18px' }} />
            Incluir texto
          </label>
          <button className="btn" style={{ background: '#ec4899', color: 'white', padding: '0.8rem', fontWeight: 'bold' }} onClick={() => handleGenerate(p.id, 'image')} disabled={loading}>Crear Imagen</button>
        </div>
      ))}

      {/* Prompt Buttons Grid */}
      <div className="grid grid-cols-2">
        {draggablePrompts.map((p, index) => (
          <div 
            key={p.id}
            draggable
            onDragStart={(e) => {
              if (!canDragRef.current) {
                e.preventDefault();
                return;
              }
              onDragStart(index);
            }}
            onDragOver={(e) => onDragOver(e, index)}
            onDragEnd={onDragEnd}
            className="glass-panel" 
            style={{ 
              padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.6rem',
              borderLeft: `4px solid ${p.color || 'var(--accent-color)'}`,
              opacity: draggedItemIndex === index ? 0.4 : 1,
              transition: 'transform 0.2s, opacity 0.2s',
              transform: draggedItemIndex === index ? 'scale(1.02)' : 'scale(1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div 
                onMouseDown={() => { canDragRef.current = true; }}
                onMouseUp={() => { canDragRef.current = false; }}
                style={{ cursor: 'grab', padding: '0.2rem 0.4rem', fontSize: '1rem', opacity: 0.5, userSelect: 'none' }} 
                title="Arrastrar"
              >☰</div>
              <h3 style={{ margin: 0, fontSize: '0.85rem', flex: 1, marginLeft: '0.4rem' }}>{p.title}</h3>
              <button className="btn btn-icon" style={{ padding: '0.3rem' }} onClick={() => setEditingPrompt(p)}>⚙️</button>
            </div>
            <button 
              className="btn" 
              style={{ background: p.color || 'var(--accent-color)', color: 'white', width: '100%', fontSize: '0.85rem', padding: '0.6rem' }} 
              onClick={() => handleGenerate(p.id, 'text')} 
              disabled={loading}
            >
              {p.title}
            </button>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingPrompt && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEditingPrompt(null); }}>
          <div className="glass-panel modal-content">
            <h3 className="mb-3">Configurar</h3>
            <div className="form-group"><label className="form-label">Título</label><input className="form-control" value={editingPrompt.title} onChange={e => setEditingPrompt({...editingPrompt, title: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Color</label><input type="color" className="form-control" style={{ height: '40px' }} value={editingPrompt.color || '#3b82f6'} onChange={e => setEditingPrompt({...editingPrompt, color: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Prompt</label><textarea className="form-control" value={editingPrompt.content} onChange={e => setEditingPrompt({...editingPrompt, content: e.target.value})} /></div>
            <label className="form-label mt-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input type="checkbox" checked={editingPrompt.content.includes('[INPUT]')} onChange={e => {
                const add = e.target.checked;
                setEditingPrompt({...editingPrompt, content: add ? `${editingPrompt.content}\n\n[INPUT]` : editingPrompt.content.replace('\n\n[INPUT]', '').replace('[INPUT]', '')});
              }} style={{ width: '18px', height: '18px' }} />
              Pedir texto extra (ej. Versículo)
            </label>
            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'space-between', marginTop: '1rem' }}>
              <button className="btn" style={{ color: 'var(--danger-color)' }} onClick={() => handleDeletePrompt(editingPrompt.id)}>🗑️</button>
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <button className="btn" onClick={() => setEditingPrompt(null)}>Cerrar</button>
                <button className="btn btn-primary" onClick={handleSavePrompt}>Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Prompt Modal */}
      {isAddingNew && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsAddingNew(false); }}>
          <div className="glass-panel modal-content">
            <h3 className="mb-3">Nuevo Botón</h3>
            <div className="form-group"><label className="form-label">Título</label><input className="form-control" value={newPrompt.title} onChange={e => setNewPrompt({...newPrompt, title: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Color</label><input type="color" className="form-control" style={{ height: '40px' }} value={newPrompt.color} onChange={e => setNewPrompt({...newPrompt, color: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Instrucción</label><textarea className="form-control" value={newPrompt.content} onChange={e => setNewPrompt({...newPrompt, content: e.target.value})} /></div>
            <label className="form-label mt-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input type="checkbox" checked={newPrompt.content.includes('[INPUT]')} onChange={e => {
                const add = e.target.checked;
                setNewPrompt({...newPrompt, content: add ? `${newPrompt.content}\n\n[INPUT]` : newPrompt.content.replace('\n\n[INPUT]', '').replace('[INPUT]', '')});
              }} style={{ width: '18px', height: '18px' }} />
              Pedir texto extra (ej. Versículo)
            </label>
            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn" onClick={() => setIsAddingNew(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddNewPrompt}>Crear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
