'use client';
import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Library, LoaderCircle, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { prepareImage } from '@/lib/exporter';
import { fileUrl } from './Stage';
import { Modal } from './ui';

/** Image library per client (plus a shared "geral" folder). In pick mode, clicking an image returns it. */
export default function LibraryModal({ client, onClose, onPick, toast }) {
  const folders = [
    ...(client ? [{ id: client.id, nome: client.name || 'Cliente' }] : []),
    { id: 'geral', nome: 'Geral (todos os clientes)' },
  ];
  const [folder, setFolder] = useState(folders[0].id);
  const [assets, setAssets] = useState(null);
  const [busy, setBusy] = useState(0);
  const [over, setOver] = useState(false);
  const input = useRef(null);

  const load = () => {
    setAssets(null);
    api.assets(folder).then(setAssets).catch((e) => { toast(e.message, 'error'); setAssets([]); });
  };
  useEffect(load, [folder]); // eslint-disable-line react-hooks/exhaustive-deps

  const upload = async (files) => {
    const list = [...files];
    if (!list.length) return;
    setBusy(list.length);
    for (const f of list) {
      try {
        const ready = await prepareImage(f);
        const asset = await api.upload(folder, ready);
        setAssets((a) => [asset, ...(a || [])]);
      } catch (e) {
        toast(e.message, 'error');
      }
      setBusy((b) => b - 1);
    }
  };

  const remove = async (a, e) => {
    e.stopPropagation();
    if (!confirm('Excluir esta imagem da biblioteca? Posts que a usam ficarão sem ela.')) return;
    try {
      await api.deleteAsset(a.pathname);
      setAssets((list) => list.filter((x) => x.pathname !== a.pathname));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <Modal title={onPick ? 'Escolher imagem' : 'Biblioteca de imagens'} icon={<Library size={18} />} onClose={onClose}>
      <div className="chips" style={{ marginBottom: 14 }}>
        {folders.map((f) => (
          <button key={f.id} className={'chip' + (folder === f.id ? ' on' : '')} onClick={() => setFolder(f.id)}>{f.nome}</button>
        ))}
      </div>
      <div
        className={'dropzone' + (over ? ' over' : '')}
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files); }}
      >
        {busy > 0 ? (
          <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><LoaderCircle size={16} className="spin" /> Enviando {busy} {busy > 1 ? 'imagens' : 'imagem'}…</span>
        ) : (
          <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><ImagePlus size={18} /> Arraste imagens aqui ou clique para enviar (JPG, PNG, WebP)</span>
        )}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
      </div>
      {assets === null ? (
        <div className="empty"><LoaderCircle className="spin" /></div>
      ) : assets.length === 0 ? (
        <div className="empty">Nenhuma imagem nesta pasta ainda.<br />Envie fotos, logos e elementos que você quer usar nos posts.</div>
      ) : (
        <div className="asset-grid">
          {assets.map((a) => (
            <div key={a.pathname} className="asset" onClick={() => onPick?.(a.pathname)} title={a.pathname.split('/').pop()}>
              <img src={fileUrl(a.pathname)} alt="" loading="lazy" />
              <button className="btn sm icon del" onClick={(e) => remove(a, e)} aria-label="Excluir"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
