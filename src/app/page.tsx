"use client";

import { useState, useEffect, useRef } from 'react';
import { resizeAndConvertImage } from '@/lib/imageHelper';

export default function Home() {
  const [prompts, setPrompts] = useState<{id: string, title: string, content: string, negative_prompt?: string, color?: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{text?: string, image?: string, synthesizedPrompt?: string, originalResolvedPrompt?: string} | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<{id: string, title: string, content: string, negative_prompt?: string, color?: string} | null>(null);
  const [customContext, setCustomContext] = useState('');
  const [allowTextInImage, setAllowTextInImage] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ title: '', content: '', color: '#3b82f6' });
  const [imageSuggestions, setImageSuggestions] = useState<{id: number, title: string, description: string}[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  
  // WHATSAPP PUBLISHING STATE
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishType, setPublishType] = useState<'text' | 'image' | 'both'>('text');
  const [publishText, setPublishText] = useState('');
  const [publishImage, setPublishImage] = useState('');
  const [publishTargets, setPublishTargets] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<any>(null);

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

  const handleGenerate = async (promptId: string, actionType: 'text' | 'image' | 'image-suggestions' = 'text') => {
    const promptItem = prompts.find(p => p.id === promptId);
    let resolvedContent = promptItem?.content;

    if (resolvedContent && resolvedContent.includes('[INPUT]')) {
      const userInput = window.prompt("Escribe el contenido extra para este botón (ej: sugerencia, pasaje o solicitud):");
      if (userInput === null) return;
      resolvedContent = resolvedContent.replace('[INPUT]', userInput);
    }

    // IMAGE SUGGESTIONS (Step 1)
    if (actionType === 'image-suggestions') {
      setLoadingSuggestions(true);
      setImageSuggestions([]);
      setResult(null);
      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ promptId, customPrompt: resolvedContent, userContext: customContext, actionType: 'image-suggestions', allowTextInImage })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (data.suggestions && Array.isArray(data.suggestions)) {
          setImageSuggestions(data.suggestions);
        }
      } catch (error) { alert(error); }
      finally { setLoadingSuggestions(false); }
      return;
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

  const handleImageFromSuggestion = async (suggestion: {id: number, title: string, description: string}) => {
    setImageSuggestions([]);
    setLoading(true);
    setResult(null);
    setCopiedImage(false);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          promptId: 'image_generation', 
          actionType: 'image', 
          allowTextInImage,
          selectedSuggestion: `${suggestion.title}: ${suggestion.description}`,
          userContext: customContext
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult({ image: data.result, synthesizedPrompt: data.synthesizedPrompt, originalResolvedPrompt: suggestion.description });
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

  const [includeText, setIncludeText] = useState(false);
  const [includeImage, setIncludeImage] = useState(false);

  const handleOpenPublishModal = async (sourceType: 'text' | 'image') => {
    try {
      const res = await fetch('/api/settings');
      const settingsData = await res.json();
      setPublishTargets(settingsData['whatsapp_targets'] || '');
    } catch (e) {
      console.error('Failed to load targets from settings:', e);
    }
    
    if (sourceType === 'text') {
      setIncludeText(true);
      setIncludeImage(false);
      setPublishText(result?.text || '');
      setPublishImage('');
    } else {
      setIncludeImage(true);
      setPublishImage(result?.image || '');
      // Si hay un texto generado actualmente, usarlo como caption por defecto.
      // Si no, usar la descripción o dejarlo en blanco.
      if (result?.text) {
        setIncludeText(true);
        setPublishText(result.text);
      } else {
        setIncludeText(false);
        setPublishText(result?.originalResolvedPrompt || '');
      }
    }
    
    setPublishStatus(null);
    setIsPublishModalOpen(true);
  };

  const handleSendToWhatsApp = async () => {
    setPublishing(true);
    setPublishStatus(null);
    try {
      let imagePayload = null;
      if (includeImage && publishImage) {
        // Redimensionar y convertir a JPEG (calidad 85%, max 1200px) en el cliente
        const processed = await resizeAndConvertImage(publishImage, 1200, 1200, 0.85);
        imagePayload = processed;
      }

      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: includeText ? publishText : undefined,
          image: imagePayload,
          customTargets: publishTargets
        })
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (data.ok) {
        setPublishStatus({ 
          success: true, 
          results: data.results, 
          target: data.target, 
          messageId: data.messageId 
        });
      } else {
        throw new Error(data.message || 'Error desconocido al enviar el mensaje.');
      }
    } catch (error: any) {
      setPublishStatus({ success: false, error: String(error) });
    } finally {
      setPublishing(false);
    }
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
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button 
              className="btn" 
              style={{ flex: 1, background: copiedText ? '#10b981' : 'var(--accent-color)', color: 'white', transition: 'all 0.3s' }} 
              onClick={() => copyToClipboard(result.text!)}
            >
              {copiedText ? '✅ ¡Copiado!' : '📋 Copiar Texto'}
            </button>
            <button 
              className="btn" 
              style={{ flex: 1, background: '#25d366', color: 'white', transition: 'all 0.3s' }} 
              onClick={() => handleOpenPublishModal('text')}
            >
              📤 Publicar WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Image Result */}
      {result?.image && (
        <div className="glass-panel animate-fade-in" style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid #ec4899', textAlign: 'center' }}>
          <img src={result.image} alt="Generado" style={{ width: '100%', maxWidth: '400px', borderRadius: '12px', marginBottom: '0.8rem' }} />
          <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '0.8rem' }}>
            <button 
              className="btn" 
              style={{ flex: 1, background: copiedImage ? '#10b981' : '#ec4899', color: 'white', transition: 'all 0.3s' }} 
              onClick={() => copyImage(result.image!)}
            >
              {copiedImage ? '✅ ¡Imagen Copiada!' : '🖼️ Copiar Imagen'}
            </button>
            <button 
              className="btn" 
              style={{ flex: 1, background: '#25d366', color: 'white', transition: 'all 0.3s' }} 
              onClick={() => handleOpenPublishModal('image')}
            >
              📤 Publicar WhatsApp
            </button>
          </div>
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
      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', borderTop: '4px solid #ec4899', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: '#ec4899', fontSize: '1rem' }}>🎨 Generador de Imágenes</h3>
        
        {prompts.filter(p => p.id === 'image_suggestions').map(p => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '6px' }}>
            <span style={{ fontSize: '0.85rem' }}>1. {p.title}</span>
            <button className="btn btn-icon" onClick={() => setEditingPrompt(p)} title="Modificar prompt de temas">⚙️</button>
          </div>
        ))}

        {prompts.filter(p => p.id === 'image_generation').map(p => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '6px' }}>
            <span style={{ fontSize: '0.85rem' }}>2. {p.title}</span>
            <button className="btn btn-icon" onClick={() => setEditingPrompt(p)} title="Modificar prompt final (estilo, branding)">⚙️</button>
          </div>
        ))}

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          <input type="checkbox" checked={allowTextInImage} onChange={(e) => setAllowTextInImage(e.target.checked)} style={{ width: '18px', height: '18px' }} />
          Incluir texto en la imagen (versículos, frases)
        </label>
        
        <button 
          className="btn" 
          style={{ background: '#ec4899', color: 'white', padding: '0.8rem', fontWeight: 'bold' }} 
          onClick={() => handleGenerate('image_suggestions', 'image-suggestions')} 
          disabled={loading || loadingSuggestions}
        >
          {loadingSuggestions ? '⏳ Generando opciones...' : '🎨 Crear Imagen'}
        </button>
      </div>

      {/* Image Suggestions */}
      {imageSuggestions.length > 0 && (
        <div className="glass-panel animate-fade-in" style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid #ec4899' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#ec4899' }}>🎨 Elige una opción de imagen:</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => {
                setImageSuggestions([]);
                const imgPrompt = prompts.find(p => p.id === 'image_generation');
                if (imgPrompt) handleGenerate(imgPrompt.id, 'image-suggestions');
              }}>🔄</button>
              <button className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: 'var(--danger-color)' }} onClick={() => setImageSuggestions([])}>✕</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {imageSuggestions.map((s) => (
              <button 
                key={s.id}
                className="glass-panel"
                onClick={() => handleImageFromSuggestion(s)}
                disabled={loading}
                style={{ 
                  padding: '0.8rem', textAlign: 'left', cursor: 'pointer', width: '100%',
                  border: '1px solid rgba(236, 72, 153, 0.3)',
                  transition: 'all 0.2s',
                  background: 'rgba(236, 72, 153, 0.05)'
                }}
              >
                <div style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.3rem', color: '#ec4899' }}>{s.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{s.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

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

      {/* WhatsApp Publishing Modal */}
      {isPublishModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !publishing) setIsPublishModalOpen(false); }}>
          <div className="glass-panel modal-content" style={{ maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto', padding: '1.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#25d366', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🚀 Publicar en WhatsApp
              </h3>
              <button 
                className="btn btn-icon" 
                onClick={() => setIsPublishModalOpen(false)} 
                disabled={publishing}
                style={{ fontSize: '1.1rem', opacity: 0.7 }}
              >
                ✕
              </button>
            </div>

            {/* Configuración de Envío */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Opciones de Contenido */}
              <div style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                {publishImage && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input 
                      type="checkbox" 
                      checked={includeImage} 
                      onChange={(e) => setIncludeImage(e.target.checked)} 
                      disabled={publishing}
                      style={{ width: '16px', height: '16px' }}
                    />
                    Incluir Imagen
                  </label>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input 
                    type="checkbox" 
                    checked={includeText} 
                    onChange={(e) => setIncludeText(e.target.checked)} 
                    disabled={publishing}
                    style={{ width: '16px', height: '16px' }}
                  />
                  Incluir Texto / Caption
                </label>
              </div>

              {/* Vista previa de Imagen */}
              {includeImage && publishImage && (
                <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <img 
                    src={publishImage} 
                    alt="Previsualización" 
                    style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '6px', objectFit: 'contain' }} 
                  />
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                    Se convertirá a JPEG y se redimensionará optimizadamente.
                  </div>
                </div>
              )}

              {/* Campo de Texto / Caption */}
              {includeText && (
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Mensaje o Caption</label>
                  <textarea 
                    className="form-control" 
                    value={publishText} 
                    onChange={(e) => setPublishText(e.target.value)}
                    placeholder="Escribe el mensaje..."
                    disabled={publishing}
                    style={{ minHeight: '100px', fontSize: '0.85rem' }}
                  />
                </div>
              )}

              {/* Destinatarios */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.8rem' }}>
                  Destinatarios de WhatsApp (Separados por comas)
                </label>
                <textarea 
                  className="form-control" 
                  value={publishTargets} 
                  onChange={(e) => setPublishTargets(e.target.value)}
                  placeholder="Ej: +569XXXXXXXX, 120363XXXXXXXX@g.us"
                  disabled={publishing}
                  style={{ minHeight: '60px', fontSize: '0.8rem' }}
                />
              </div>

              {/* Estado de Carga y Envío */}
              {publishing && (
                <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                  <div className="spinner" style={{ margin: '0 auto 0.5rem auto', width: '25px', height: '25px', borderWidth: '3px' }}></div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Procesando imagen JPEG y publicando en WhatsApp...
                  </div>
                </div>
              )}

              {/* Respuestas de la API */}
              {publishStatus && (
                <div 
                  style={{ 
                    padding: '0.8rem', 
                    borderRadius: '8px', 
                    fontSize: '0.8rem',
                    background: publishStatus.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    border: `1px solid ${publishStatus.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                    color: publishStatus.success ? '#10b981' : '#ef4444'
                  }}
                >
                  {publishStatus.success ? (
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '0.3rem' }}>¡Publicado con éxito! 🎉</div>
                      {publishStatus.results ? (
                        <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          {publishStatus.results.map((res: any, idx: number) => (
                            <li key={idx} style={{ color: res.ok ? '#10b981' : '#ef4444' }}>
                              {res.ok ? `✓ Enviado a ${res.target}` : `✕ Falló a ${res.target}`}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div>Mensaje ID: {publishStatus.messageId}</div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '0.2rem' }}>Error al publicar:</div>
                      <div>{publishStatus.error}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Acciones */}
              <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button 
                  className="btn" 
                  onClick={() => setIsPublishModalOpen(false)}
                  disabled={publishing}
                >
                  Cancelar
                </button>
                <button 
                  className="btn" 
                  style={{ 
                    background: '#25d366', 
                    color: 'white',
                    opacity: (!includeText && !includeImage) || !publishTargets.trim() ? 0.5 : 1 
                  }}
                  onClick={handleSendToWhatsApp}
                  disabled={publishing || (!includeText && !includeImage) || !publishTargets.trim()}
                >
                  🚀 Enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
