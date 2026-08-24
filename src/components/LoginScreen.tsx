import React, { useState } from 'react';
import { Phone, Shield, User, ArrowRight, Sparkles, CheckCircle2, Lock, AlertCircle, Users } from 'lucide-react';
import { AuthUser, Salesperson } from '../types';

interface LoginScreenProps {
  salespeople: Salesperson[];
  onLoginSuccess: (user: AuthUser) => void;
  onShowToast?: (msg: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  salespeople,
  onLoginSuccess,
  onShowToast
}) => {
  const [tab, setTab] = useState<'salesperson' | 'admin'>('salesperson');
  const [phone, setPhone] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Format phone input
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 11) val = val.slice(0, 11);
    
    // Apply (XX) XXXXX-XXXX mask
    let formatted = val;
    if (val.length > 2) {
      formatted = `(${val.slice(0, 2)}) ${val.slice(2)}`;
    }
    if (val.length > 7) {
      formatted = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
    }
    setPhone(formatted);
    setErrorMsg('');
  };

  const handleSalespersonLogin = async (e?: React.FormEvent, directPhone?: string) => {
    if (e) e.preventDefault();
    const phoneToTest = directPhone || phone;
    const cleanDigits = phoneToTest.replace(/\D/g, '');

    if (!cleanDigits || cleanDigits.length < 8) {
      setErrorMsg('Por favor, informe seu número de telefone ou WhatsApp completo.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanDigits, role: 'salesperson' })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Vendedora não encontrada.');
      }

      if (onShowToast) onShowToast(`👋 Bem-vinda de volta, ${data.user.salespersonName}!`);
      onLoginSuccess(data.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao entrar. Verifique o número digitado.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin', password: adminPass })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro no login do Gestor.');
      }

      if (onShowToast) onShowToast('👑 Acesso Gestor autenticado com sucesso!');
      onLoginSuccess(data.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro no login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 text-neutral-100 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-lg">
        {/* Brand Card Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20 text-white mb-4">
            <Phone className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            Nyroh CRM <span className="text-emerald-400">Call</span>
          </h1>
          <p className="text-neutral-400 text-sm mt-1.5 max-w-sm mx-auto">
            Plataforma de alta conversão de leads, auto-discagem e gestão de televendas.
          </p>
        </div>

        {/* Auth Box */}
        <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden">
          {/* Access Switch Tabs */}
          <div className="grid grid-cols-2 p-1.5 bg-neutral-950/60 border-b border-neutral-800/60 text-sm">
            <button
              id="tab-salesperson-login"
              type="button"
              onClick={() => { setTab('salesperson'); setErrorMsg(''); }}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
                tab === 'salesperson'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Área Vendedora</span>
            </button>
            <button
              id="tab-admin-login"
              type="button"
              onClick={() => { setTab('admin'); setErrorMsg(''); }}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
                tab === 'admin'
                  ? 'bg-neutral-800 text-white shadow-md border border-neutral-700'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
              }`}
            >
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Gestor Master</span>
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <div className="leading-relaxed">{errorMsg}</div>
              </div>
            )}

            {tab === 'salesperson' ? (
              /* Vendedora Form */
              <form onSubmit={(e) => handleSalespersonLogin(e)} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-2 uppercase tracking-wider">
                    WhatsApp ou Telefone Cadastrado
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      id="input-salesperson-phone"
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="(31) 99150-3721"
                      autoFocus
                      className="w-full pl-10 pr-4 py-3.5 bg-neutral-950 border border-neutral-700/80 rounded-xl text-white placeholder-neutral-500 text-base font-mono focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-2">
                    💡 Digite o mesmo número de WhatsApp informado no cadastro da equipe.
                  </p>
                </div>

                {/* Quick 1-click select for registered salespeople */}
                {salespeople && salespeople.length > 0 && (
                  <div className="pt-2 border-t border-neutral-800/60">
                    <div className="text-[11px] font-medium text-neutral-400 mb-2 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Ou clique no seu perfil cadastrado:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                      {salespeople.map((sp) => (
                        <button
                          key={sp.id}
                          type="button"
                          onClick={() => {
                            if (sp.phone) {
                              setPhone(sp.phone);
                              handleSalespersonLogin(undefined, sp.phone);
                            } else {
                              setErrorMsg(`O vendedor "${sp.name}" não tem telefone cadastrado. Solicite ao gestor para cadastrar seu WhatsApp.`);
                            }
                          }}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700/60 text-neutral-200 flex items-center gap-1.5 transition text-left"
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sp.color || '#10b981' }} />
                          <span className="font-medium">{sp.name}</span>
                          {sp.phone && (
                            <span className="text-[10px] text-neutral-400 font-mono">({sp.phone.slice(-4)})</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  id="btn-login-salesperson-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Entrar na Minha Área</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="p-3 bg-neutral-950/40 rounded-xl border border-neutral-800/40 text-[11px] text-neutral-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-neutral-300 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ambiente Exclusivo da Vendedora</span>
                  </div>
                  <p>Acesso rápido à sua esteira de leads, histórico de ligações e auto-discagem rápida.</p>
                </div>
              </form>
            ) : (
              /* Gestor Form */
              <form onSubmit={handleAdminLogin} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-2 uppercase tracking-wider">
                    Senha Master do Gestor *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="input-admin-pass"
                      type="password"
                      value={adminPass}
                      onChange={(e) => setAdminPass(e.target.value)}
                      placeholder="Digite a senha master"
                      required
                      autoFocus
                      className="w-full pl-10 pr-4 py-3.5 bg-neutral-950 border border-neutral-700/80 rounded-xl text-white placeholder-neutral-500 text-base font-mono focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-2">
                    🛡️ Acesso total: cadastrar vendedoras, definir % de divisão de leads, subir arquivos e gerenciar todo o pipeline.
                  </p>
                </div>

                <button
                  id="btn-login-admin-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-850 text-white font-semibold rounded-xl border border-neutral-700 shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span>Acessar Painel Master do Gestor</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-neutral-500">
          Nyroh CRM Call &bull; Sistema Seguro de Prospecção Telefônica
        </div>
      </div>
    </div>
  );
};
