'use client';
import { useEffect, useState } from 'react';
import { LoaderCircle, Lock } from 'lucide-react';
import { api } from '@/lib/api';
import Studio from '@/components/Studio';

function Mark() {
  return <div className="brand"><div className="mark">D</div>Dgr Studio</div>;
}

function Setup({ status }) {
  return (
    <div className="gate">
      <div className="gate-card">
        <Mark />
        <h1>Quase pronto</h1>
        <p>O estúdio está no ar, mas falta configurar o acesso. No painel do Vercel, abra este projeto e vá em <b>Settings → Environment Variables</b>:</p>
        <ol>
          <li><code>APP_PASSWORD</code> com a senha que você vai usar para entrar {status.configured ? '(ok)' : ''}</li>
          <li><code>ANTHROPIC_API_KEY</code> para ativar a IA {status.ai ? '(ok)' : '(opcional)'}</li>
          <li>Armazenamento Blob conectado {status.storage ? '(ok)' : '(pendente)'}</li>
        </ol>
        <p>Depois, faça um novo deploy (Deployments → ⋯ → Redeploy) para as variáveis valerem.</p>
      </div>
    </div>
  );
}

function Login({ onDone }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await api.login(pw);
      onDone();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="gate">
      <form className="gate-card" onSubmit={submit}>
        <Mark />
        <h1>Bem-vinda de volta</h1>
        <p>Entre com a senha do estúdio para acessar clientes, posts e biblioteca.</p>
        <label className="field">
          <span>Senha</span>
          <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        </label>
        <button className="btn primary" style={{ width: '100%' }} disabled={busy || !pw}>
          {busy ? <LoaderCircle size={16} className="spin" /> : <Lock size={16} />} Entrar
        </button>
        {err && <div className="err">{err}</div>}
      </form>
    </div>
  );
}

export default function Home() {
  const [status, setStatus] = useState(null);
  const load = () => api.status().then(setStatus).catch(() => setStatus({ configured: false, storage: false, ai: false }));
  useEffect(() => { load(); }, []);

  if (!status) {
    return <div className="gate"><LoaderCircle className="spin" /></div>;
  }
  if (!status.configured || !status.storage) return <Setup status={status} />;
  if (!status.authed) return <Login onDone={load} />;
  return <Studio aiEnabled={status.ai} onLogout={() => api.logout().then(load)} />;
}
