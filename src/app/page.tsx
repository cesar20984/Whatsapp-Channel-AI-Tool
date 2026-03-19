"use client";

import { useState, useEffect } from 'react';

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

  const onDragStart = (index: number) => setDraggedItemIndex(index);
  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    const newPrompts = [...prompts];
    const draggedItem = newPrompts[draggedItemIndex];
    newPrompts.splice(draggedItemIndex, 1);
    newPrompts.splice(index, 0, draggedItem);
    setDraggedItemIndex(index);
    setPrompts(newPrompts);
  };

  const onDragEnd = async () => {
    setDraggedItemIndex(null);
    const positions = prompts.map((p, idx) => ({ id: p.id, position: idx }));
    await fetch('/api/prompts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positions })
    });
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
    <div className="container" style={{ paddingTop: '1rem', maxWidth: '1400px' }}>
      
      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Contexto Adicional (Opcional) <small style={{ opacity: 0.5, marginLeft: '10px' }}>Arraste para organizar</small></span>
          <button className="btn btn-primary" style={{ padding: '0.2rem 1rem', fontSize: '0.8rem' }} onClick={() => setIsAddingNew(true)}>
            ➕ Agregar Nuevo Botón
          </button>
        </label>
        <textarea className="form-control" placeholder="Añadir contexto específico..." value={customContext} onChange={(e) => setCustomContext(e.target.value)} style={{ minHeight: '50px' }} />
      </div>

      <div className="responsive-split" style={{ display: 'flex', gap: '2rem' }}>
        
        <div style={{ flex: 2 }}>
          {result?.text && (
            <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid var(--accent-color)' }}>
              <div style={{ whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>{result.text}</div>
              <button 
                className="btn" 
                style={{ width: '100%', background: copiedText ? '#10b981' : 'var(--accent-color)', color: 'white', transition: 'all 0.3s' }} 
                onClick={() => copyToClipboard(result.text!)}
              >
                {copiedText ? '✅ ¡Copiado al Portapapeles!' : '📋 Copiar Texto'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
            {prompts.filter(p => p.id !== 'image_generation').map((p, index) => (
              <div 
                key={p.id} draggable onDragStart={() => onDragStart(index)} onDragOver={(e) => onDragOver(e, index)} onDragEnd={onDragEnd}
                className="glass-panel" 
                style={{ 
                  padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', cursor: 'grab',
                  borderLeft: `4px solid ${p.color || 'var(--accent-color)'}`,
                  opacity: draggedItemIndex === index ? 0.4 : 1,
                  transition: 'transform 0.2s',
                  transform: draggedItemIndex === index ? 'scale(1.02)' : 'scale(1)'
                }}
              >
                <div className="flex justify-between items-center" style={{ pointerEvents: 'none' }}>
                  <h3 style={{ margin: 0, fontSize: '0.95rem' }}>{p.title}</h3>
                  <button className="btn btn-icon" style={{ pointerEvents: 'auto' }} onClick={() => setEditingPrompt(p)}>⚙️</button>
                </div>
                <button 
                  className="btn" 
                  style={{ background: p.color || 'var(--accent-color)', color: 'white', width: '100%', fontSize: '0.9rem', pointerEvents: 'auto' }} 
                  onClick={() => handleGenerate(p.id, 'text')} 
                  disabled={loading}
                >
                  {p.title}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="image-column" style={{ flex: 1, minWidth: '350px' }}>
          {result?.image && (
            <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', marginBottom: '1rem', border: '1px solid #ec4899', textAlign: 'center' }}>
              <img src={result.image} alt="Generado" style={{ maxWidth: '100%', borderRadius: '12px', marginBottom: '1rem' }} />
              <button 
                className="btn" 
                style={{ width: '100%', background: copiedImage ? '#10b981' : '#ec4899', color: 'white', transition: 'all 0.3s' }} 
                onClick={() => copyImage(result.image!)}
              >
                {copiedImage ? '✅ ¡Imagen Copiada!' : '🖼️ Copiar Imagen'}
              </button>
              <details style={{ marginTop: '1rem', cursor: 'pointer', textAlign: 'left' }}>
                <summary style={{ fontSize: '0.7rem', opacity: 0.6 }}>🔍 Datos técnicos</summary>
                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {result.originalResolvedPrompt && <div style={{ fontSize: '0.75rem', opacity: 0.8, padding: '0.5rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px' }}><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{result.originalResolvedPrompt}</p></div>}
                  {result.synthesizedPrompt && <div style={{ fontSize: '0.75rem', opacity: 0.8, padding: '0.5rem', border: '1px dashed #ec4899', borderRadius: '6px' }}><p style={{ margin: 0, fontStyle: 'italic' }}>{result.synthesizedPrompt}</p></div>}
                </div>
              </details>
            </div>
          )}
          {loading && <div className="glass-panel" style={{ padding: '2rem', marginBottom: '1rem', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div><p style={{ marginTop: '1rem' }}>Creando...</p></div>}
          {prompts.filter(p => p.id === 'image_generation').map(p => (
            <div key={p.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '4px solid #ec4899' }}>
              <div className="flex justify-between items-center">
                <h3 style={{ margin: 0, color: '#ec4899' }}>🎨 {p.title}</h3>
                <button className="btn btn-icon" onClick={() => setEditingPrompt(p)}>⚙️</button>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={allowTextInImage} onChange={(e) => setAllowTextInImage(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                Incluir texto
              </label>
              <button className="btn" style={{ background: '#ec4899', color: 'white', padding: '1rem', fontWeight: 'bold' }} onClick={() => handleGenerate(p.id, 'image')} disabled={loading}>Crear Imagen</button>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) { .responsive-split { flex-direction: column !important; } .image-column { order: 2; min-width: 100% !important; } }
      `}</style>

      {editingPrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '1.5rem' }}>
            <h3 className="mb-3">Configurar</h3>
            <div className="form-group"><label className="form-label">Título</label><input className="form-control" value={editingPrompt.title} onChange={e => setEditingPrompt({...editingPrompt, title: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Color</label><input type="color" className="form-control" style={{ height: '40px' }} value={editingPrompt.color || '#3b82f6'} onChange={e => setEditingPrompt({...editingPrompt, color: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Prompt</label><textarea className="form-control" value={editingPrompt.content} onChange={e => setEditingPrompt({...editingPrompt, content: e.target.value})} style={{ minHeight: '100px' }} /></div>
            <label className="form-label mt-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="checkbox" checked={editingPrompt.content.includes('[INPUT]')} onChange={e => {
                const add = e.target.checked;
                setEditingPrompt({...editingPrompt, content: add ? `${editingPrompt.content}\n\n[INPUT]` : editingPrompt.content.replace('\n\n[INPUT]', '').replace('[INPUT]', '')});
              }} style={{ width: '18px', height: '18px' }} />
              Pedir un texto extra al usar este botón (ej. Versículo)
            </label>
            <div className="flex" style={{ gap: '1rem', justifyContent: 'space-between', marginTop: '1rem' }}>
              <button className="btn" style={{ color: 'var(--danger-color)' }} onClick={() => handleDeletePrompt(editingPrompt.id)}>🗑️</button>
              <div className="flex" style={{ gap: '1rem' }}>
                <button className="btn" onClick={() => setEditingPrompt(null)}>Cerrar</button>
                <button className="btn btn-primary" onClick={handleSavePrompt}>Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isAddingNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '1.5rem' }}>
            <h3 className="mb-3">Nuevo</h3>
            <div className="form-group"><label className="form-label">Título</label><input className="form-control" value={newPrompt.title} onChange={e => setNewPrompt({...newPrompt, title: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Color</label><input type="color" className="form-control" style={{ height: '40px' }} value={newPrompt.color} onChange={e => setNewPrompt({...newPrompt, color: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Instrucción</label><textarea className="form-control" value={newPrompt.content} onChange={e => setNewPrompt({...newPrompt, content: e.target.value})} style={{ minHeight: '100px' }} /></div>
            <label className="form-label mt-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="checkbox" checked={newPrompt.content.includes('[INPUT]')} onChange={e => {
                const add = e.target.checked;
                setNewPrompt({...newPrompt, content: add ? `${newPrompt.content}\n\n[INPUT]` : newPrompt.content.replace('\n\n[INPUT]', '').replace('[INPUT]', '')});
              }} style={{ width: '18px', height: '18px' }} />
              Pedir un texto extra al usar este botón (ej. Versículo)
            </label>
            <div className="flex" style={{ gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn" onClick={() => setIsAddingNew(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddNewPrompt}>Crear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
