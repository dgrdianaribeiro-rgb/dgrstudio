'use client';
import { useEffect, useState } from 'react';
import { Copy, FilePlus2, FolderOpen, LoaderCircle, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { uid } from '@/lib/catalog';
import { Modal } from './ui';

export default function PostsModal({ client, onClose, onOpen, onNew, toast }) {
  const [posts, setPosts] = useState(null);

  useEffect(() => {
    api.posts(client.id).then(setPosts).catch((e) => { toast(e.message, 'error'); setPosts([]); });
  }, [client.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async (p) => {
    if (!confirm(`Excluir "${p.title}"?`)) return;
    try {
      await api.deletePost(client.id, p.id);
      setPosts((list) => list.filter((x) => x.id !== p.id));
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const duplicate = (p, keepText) => {
    const copy = structuredClone(p);
    copy.id = uid();
    copy.title = `${p.title} (cópia)`;
    copy.createdAt = Date.now();
    copy.updatedAt = null;
    copy.pages = copy.pages.map((pg) => ({ ...pg, id: uid(), fields: keepText ? pg.fields : pg.fields?.image ? { image: pg.fields.image, imagePos: pg.fields.imagePos } : {} }));
    onOpen(copy, true);
  };

  const fmt = (t) => (t ? new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

  return (
    <Modal title={`Posts de ${client.name}`} icon={<FolderOpen size={18} />} onClose={onClose}
      footer={<button className="btn primary" onClick={onNew}><FilePlus2 size={15} /> Novo post</button>}>
      {posts === null ? (
        <div className="empty"><LoaderCircle className="spin" /></div>
      ) : posts.length === 0 ? (
        <div className="empty">Nenhum post salvo para este cliente ainda.</div>
      ) : (
        posts.map((p) => (
          <div className="post-row" key={p.id}>
            <div className="meta">
              <b>{p.title || 'Sem título'}</b>
              <small>{p.format === 'single' ? 'Arte única' : `Carrossel · ${p.pages.length} páginas`} · {fmt(p.updatedAt)}</small>
            </div>
            <button className="btn sm" onClick={() => onOpen(p)}>Abrir</button>
            <button className="btn sm" title="Reaproveitar estrutura e visual, sem os textos" onClick={() => duplicate(p, false)}><Copy size={14} /> Só estrutura</button>
            <button className="btn sm ghost icon" title="Duplicar com textos" onClick={() => duplicate(p, true)}><Copy size={14} /></button>
            <button className="btn sm ghost icon danger" onClick={() => remove(p)} aria-label="Excluir"><Trash2 size={14} /></button>
          </div>
        ))
      )}
    </Modal>
  );
}
