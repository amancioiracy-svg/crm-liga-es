import React, { useState, useEffect } from 'react';
import { 
  X, Shield, Users, FileText, BarChart3, ShieldCheck, UserPlus, 
  KeyRound, Check, AlertCircle, RefreshCw, Lock, ArrowRight, Eye, Trash2
} from 'lucide-react';
import { User, AuditLog, Salesperson, Lead } from '../types';

interface AdminCockpitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  salespeople: Salesperson[];
  leads: Lead[];
  onShowToast: (msg: string) => void;
  onRefreshData?: () => void;
}

export const AdminCockpitModal: React.FC<AdminCockpitModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  salespeople,
  leads,
  onShowToast,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'team' | 'security'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Formulário de Criação de Usuário
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'manager' | 'salesperson'>('salesperson');
  const [newSalespersonId, setNewSalespersonId] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  // Modal de Redefinir Senha
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [resettingPass, setResettingPass] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchAuditLogs();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/admin/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      onShowToast('Preencha nome, e-mail e senha.');
      return;
    }

    setCreatingUser(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          password: newPassword.trim(),
          role: newRole,
          salespersonId: newRole === 'salesperson' ? (newSalespersonId || 'seller-thomas') : undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        onShowToast(`Usuário ${data.name} criado com sucesso!`);
        setShowCreateModal(false);
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        fetchUsers();
        fetchAuditLogs();
      } else {
        onShowToast(data.error || 'Erro ao criar usuário.');
      }
    } catch (err) {
      console.error(err);
      onShowToast('Erro de conexão ao criar usuário.');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleToggleUserActive = async (user: User) => {
    if (user.id === currentUser.id) {
      onShowToast('Você não pode desativar sua própria conta de Super Admin.');
      return;
    }

    const nextState = !user.active;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextState })
      });

      if (res.ok) {
        onShowToast(nextState ? `Usuário ${user.name} ativado!` : `Usuário ${user.name} desativado!`);
        fetchUsers();
        fetchAuditLogs();
      }
    } catch (err) {
      console.error(err);
      onShowToast('Erro ao alterar status do usuário.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserId || !resetPasswordVal.trim()) return;

    setResettingPass(true);
    try {
      const res = await fetch(`/api/admin/users/${resetUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: resetPasswordVal.trim() })
      });

      if (res.ok) {
        onShowToast('Senha redefinida com sucesso!');
        setResetUserId(null);
        setResetPasswordVal('');
        fetchAuditLogs();
      } else {
        onShowToast('Erro ao redefinir senha.');
      }
    } catch (err) {
      console.error(err);
      onShowToast('Erro ao redefinir senha.');
    } finally {
      setResettingPass(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header do Cockpit */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-amber-400 font-bold shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white leading-tight">
                  Cockpit Executivo • Super Admin
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                  Nível 1 (Dono)
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Gestão da equipe de vendas, blindagem de dados e trilha de auditoria.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas de Navegação */}
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-neutral-200 bg-neutral-50 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all shrink-0 ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-700 bg-white font-bold shadow-2xs'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Usuários & Acessos</span>
            <span className="text-[10px] bg-neutral-200 text-neutral-700 px-1.5 py-0.2 rounded-full font-mono font-bold">
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all shrink-0 ${
              activeTab === 'audit'
                ? 'border-blue-600 text-blue-700 bg-white font-bold shadow-2xs'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Logs de Auditoria (Caixa-Preta)</span>
            <span className="text-[10px] bg-neutral-200 text-neutral-700 px-1.5 py-0.2 rounded-full font-mono font-bold">
              {auditLogs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all shrink-0 ${
              activeTab === 'team'
                ? 'border-blue-600 text-blue-700 bg-white font-bold shadow-2xs'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Desempenho da Equipe</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all shrink-0 ${
              activeTab === 'security'
                ? 'border-blue-600 text-blue-700 bg-white font-bold shadow-2xs'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Blindagem & Segurança</span>
          </button>
        </div>

        {/* Conteúdo Principal Scrollável */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: USUÁRIOS & ACESSOS */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    Controle de Usuários e Permissões (RBAC)
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Defina quem pode acessar o sistema e qual carteira cada vendedor visualiza.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchUsers}
                    className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg border border-neutral-200"
                    title="Atualizar lista"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Novo Usuário</span>
                  </button>
                </div>
              </div>

              {/* Tabela de Usuários */}
              <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">Nome & E-mail</th>
                      <th className="py-2.5 px-3 font-bold">Nível / Cargo</th>
                      <th className="py-2.5 px-3 font-bold">Carteira Vinculada</th>
                      <th className="py-2.5 px-3 font-bold">Status</th>
                      <th className="py-2.5 px-3 font-bold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {users.map((u) => {
                      const linkedSeller = salespeople.find((s) => s.id === u.salespersonId);
                      return (
                        <tr key={u.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-neutral-900">{u.name}</div>
                            <div className="text-[11px] text-neutral-500 font-mono">{u.email}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            {u.role === 'admin' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                👑 Super Admin
                              </span>
                            ) : u.role === 'manager' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                💼 Gerente
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-200">
                                👤 Vendedor(a)
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {linkedSeller ? (
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: linkedSeller.color || '#0284c7' }}
                                />
                                <span className="font-medium text-neutral-800">
                                  {linkedSeller.name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-neutral-400 italic">Geral (Acesso Total)</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              onClick={() => handleToggleUserActive(u)}
                              disabled={u.id === currentUser.id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                                u.active
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200'
                                  : 'bg-red-100 text-red-800 border border-red-200 hover:bg-red-200'
                              } ${u.id === currentUser.id ? 'opacity-70 cursor-not-allowed' : ''}`}
                              title={u.active ? 'Clique para desativar acesso' : 'Clique para reativar'}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-emerald-600' : 'bg-red-600'}`} />
                              <span>{u.active ? 'Ativo' : 'Desativado'}</span>
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => {
                                setResetUserId(u.id);
                                setResetPasswordVal('');
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg border border-neutral-200 transition-colors"
                              title="Redefinir senha de acesso deste usuário"
                            >
                              <KeyRound className="w-3 h-3 text-neutral-500" />
                              <span>Senha</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    Trilha de Auditoria & Caixa-Preta
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Histórico imutável de todas as ações sensíveis realizadas na plataforma.
                  </p>
                </div>
                <button
                  onClick={fetchAuditLogs}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingLogs ? 'animate-spin' : ''}`} />
                  <span>Atualizar</span>
                </button>
              </div>

              <div className="space-y-2">
                {auditLogs.length === 0 ? (
                  <div className="text-center py-8 text-xs text-neutral-400 italic">
                    Nenhum log registrado ainda.
                  </div>
                ) : (
                  auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-neutral-50/70 border border-neutral-200/80 rounded-xl flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-800">
                            {log.action}
                          </span>
                          <span className="font-bold text-neutral-900">
                            {log.userName}
                          </span>
                          {log.userRole && (
                            <span className="text-[10px] text-neutral-500 font-mono">
                              ({log.userRole})
                            </span>
                          )}
                        </div>
                        <p className="text-neutral-600 text-xs break-words">{log.details}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-neutral-500 font-mono">
                          {new Date(log.createdAt).toLocaleString('pt-BR')}
                        </div>
                        {log.ip && (
                          <div className="text-[9px] text-neutral-400 font-mono">IP: {log.ip}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DESEMPENHO DA EQUIPE */}
          {activeTab === 'team' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  Desempenho Comercial por Vendedor
                </h3>
                <p className="text-xs text-neutral-500">
                  Comparativo de distribuição de leads e conversão da equipe.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {salespeople.map((seller) => {
                  const sellerLeads = leads.filter((l) => (l.salespersonId || 'seller-thomas') === seller.id);
                  const closedCount = sellerLeads.filter((l) => l.columnStatus === 'Fechado').length;
                  const interestedCount = sellerLeads.filter((l) => l.columnStatus === 'Interessado').length;
                  const uncontacted = sellerLeads.filter((l) => l.columnStatus === 'Leads' && (!l.callCount || l.callCount === 0)).length;
                  const conversionRate = sellerLeads.length > 0 ? ((closedCount / sellerLeads.length) * 100).toFixed(1) : '0';

                  return (
                    <div
                      key={seller.id}
                      className="p-4 rounded-xl border border-neutral-200 bg-white shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: seller.color || '#0284c7' }}
                          />
                          <span className="font-bold text-xs text-neutral-900">{seller.name}</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-neutral-500">
                          {sellerLeads.length} leads
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center text-xs">
                        <div className="p-2 rounded-lg bg-neutral-50 border border-neutral-100">
                          <span className="text-[10px] text-neutral-500 block">Sem Contato</span>
                          <span className="font-bold text-neutral-800">{uncontacted}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                          <span className="text-[10px] text-emerald-700 block">Fechados</span>
                          <span className="font-bold text-emerald-800">{closedCount}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
                          <span className="text-[10px] text-blue-700 block">Interessados</span>
                          <span className="font-bold text-blue-800">{interestedCount}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-amber-50 border border-amber-100">
                          <span className="text-[10px] text-amber-700 block">Conversão</span>
                          <span className="font-bold text-amber-800">{conversionRate}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: SEGURANÇA & BLINDAGEM */}
          {activeTab === 'security' && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  Políticas de Segurança e Proteção de Dados
                </h3>
                <p className="text-xs text-neutral-500">
                  Diretrizes ativas no servidor Node.js e no banco de dados.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Blindagem Contra Roubo de Base</span>
                  </div>
                  <p className="text-emerald-800 leading-relaxed text-[11px]">
                    O botão de <strong>Exportar CSV / Backup</strong> é bloqueado no nível do servidor para vendedores. Somente o Super Admin possui permissão para baixar planilhas.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-blue-900">
                    <Lock className="w-4 h-4 text-blue-600" />
                    <span>Isolamento Estrito de Carteira (RBAC)</span>
                  </div>
                  <p className="text-blue-800 leading-relaxed text-[11px]">
                    Cada vendedor conectado tem suas queries filtradas pelo ID atribuído. Um vendedor não consegue consultar leads de outro colega.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-neutral-200 bg-white shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-neutral-900">
                    <KeyRound className="w-4 h-4 text-neutral-600" />
                    <span>Criptografia Scrypt/Argon2</span>
                  </div>
                  <p className="text-neutral-600 leading-relaxed text-[11px]">
                    As senhas são protegidas com salt criptográfico único por usuário e derivação de chave em 64 bytes. Zero texto puro gravado em disco.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-neutral-200 bg-white shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-neutral-900">
                    <FileText className="w-4 h-4 text-neutral-600" />
                    <span>Auditoria Caixa-Preta (Audit Trail)</span>
                  </div>
                  <p className="text-neutral-600 leading-relaxed text-[11px]">
                    Todas as ações críticas (Logins, Exclusões de Leads, Distribuição em Lote, Criação de Usuários) são gravadas com carimbo de data, hora e IP.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer do Cockpit */}
        <div className="p-4 border-t border-neutral-100 flex items-center justify-between bg-neutral-50 shrink-0">
          <span className="text-[11px] text-neutral-500">
            Conectado como <strong>{currentUser.name}</strong> ({currentUser.email})
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition-colors shadow-xs"
          >
            Fechar Cockpit
          </button>
        </div>
      </div>

      {/* MODAL INLINE: CRIAR NOVO USUÁRIO */}
      {showCreateModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-neutral-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <h4 className="text-sm font-bold text-neutral-900">Cadastrar Novo Usuário</h4>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Nome Completo</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">E-mail de Login</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="joao@empresa.com"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Senha Provisória</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Defina uma senha"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Cargo / Nível de Acesso</label>
                <select
                  value={newRole}
                  onChange={(e: any) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="salesperson">Vendedor(a) (Carteira Isolada)</option>
                  <option value="manager">Gerente (Visualização de Equipe)</option>
                  <option value="admin">Super Admin (Acesso Total)</option>
                </select>
              </div>

              {newRole === 'salesperson' && (
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">Vincular ao Vendedor do Sistema</label>
                  <select
                    value={newSalespersonId}
                    onChange={(e) => setNewSalespersonId(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="">Selecione o vendedor...</option>
                    {salespeople.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.email || 'Sem e-mail'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-4 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold shadow-xs disabled:opacity-50"
                >
                  {creatingUser ? 'Salvando...' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL INLINE: REDEFINIR SENHA */}
      {resetUserId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-neutral-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-blue-600" />
                <span>Redefinir Senha</span>
              </h4>
              <button
                onClick={() => setResetUserId(null)}
                className="text-neutral-400 hover:text-neutral-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Nova Senha</label>
                <input
                  type="text"
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  placeholder="Digite a nova senha"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetUserId(null)}
                  className="px-3 py-1.5 rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resettingPass}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs disabled:opacity-50"
                >
                  {resettingPass ? 'Salvando...' : 'Salvar Nova Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
