import { getAuth } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, createDriverFunction, deleteDriverFunction, updateDriverFunction } from "../firebaseConfig";

import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { User, UserRole, Client, Product, Route, DeliverySchedule } from '../types';
import { ChevronDown, ChevronRight, UserPlus, MapPin, Phone, Truck, Calendar, Package, Pencil, Trash2, Plus, ArrowRightLeft, X, Save, Navigation, Map, Search, User as UserIcon, CreditCard, FileText, RotateCcw, Loader2, AlertCircle, Calculator, CheckCircle, DollarSign, Tag, Check, MessageCircle, Smartphone } from 'lucide-react';

// Função utilitária para normalizar texto (remover acentos e converter para minúsculas)
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove diacríticos (acentos)
};

// Helper component for isolated row state (Reused from DriverView logic)
const AddScheduleItemRow: React.FC<{ products: Product[], onAdd: (productId: string, quantity: number) => void }> = ({ products, onAdd }) => {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);

  const handleAdd = () => {
    if (selectedProduct && quantity > 0) {
      onAdd(selectedProduct, quantity);
      setSelectedProduct('');
      setQuantity(1);
    }
  };

  return (
    <div className="flex gap-2 items-center bg-white p-1.5 rounded border border-dashed border-gray-300">
      <select 
        className="flex-1 text-sm p-1.5 bg-transparent border-none focus:ring-0 text-gray-700"
        value={selectedProduct}
        onChange={(e) => setSelectedProduct(e.target.value)}
      >
        <option value="">+ Adicionar Produto</option>
        {products.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <input 
        type="number" 
        min="1"
        className="w-16 p-1.5 text-sm border-l border-gray-200 text-center"
        placeholder="Qtd"
        value={quantity}
        onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
      />
      <button 
        type="button"
        onClick={handleAdd}
        className="p-1.5 bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
        disabled={!selectedProduct}
      >
        <Plus size={16} />
      </button>
    </div>
  );
};

export const DriversOverview: React.FC = () => {
  const { getDrivers, getClientsByDriver, getRoutesByDriver, routes, products, calculateClientDebt, addUser } = useData();
  const { register } = useAuth(); // Fallback para quando Cloud Function não está disponível

  const drivers = getDrivers();
  const [expandedDriverId, setExpandedDriverId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverEmail, setNewDriverEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingDriverId, setDeletingDriverId] = useState<string | null>(null);
  
  // Estados para edição de entregador
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<User | null>(null);
  const [editDriverName, setEditDriverName] = useState('');
  const [editDriverPhone, setEditDriverPhone] = useState('');
  const [editDriverPassword, setEditDriverPassword] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Função para deletar entregador (com clientes e rotas)
  const handleDeleteDriver = async (driver: User) => {
    const clients = getClientsByDriver(driver.id);
    const confirmMsg = clients.length > 0
      ? `⚠️ ATENÇÃO!\n\nVocê está prestes a excluir o entregador "${driver.name}".\n\nIsso também vai EXCLUIR:\n• ${clients.length} cliente(s)\n• Todas as rotas associadas\n\nEssa ação NÃO pode ser desfeita!\n\nDigite "CONFIRMAR" para prosseguir:`
      : `Deseja excluir o entregador "${driver.name}"?\n\nEssa ação não pode ser desfeita.\n\nDigite "CONFIRMAR" para prosseguir:`;
    
    const confirmation = prompt(confirmMsg);
    if (confirmation !== 'CONFIRMAR') {
      alert('Exclusão cancelada.');
      return;
    }

    setDeletingDriverId(driver.id);
    try {
      const result = await deleteDriverFunction({ uid: driver.id });
      console.log('[handleDeleteDriver] Resultado:', result.data);
      alert(result.data.message);
    } catch (err: unknown) {
      console.error('Erro ao deletar entregador:', err);
      if (err && typeof err === 'object' && 'message' in err) {
        alert(`Erro: ${(err as { message: string }).message}`);
      } else {
        alert('Erro ao deletar entregador. Tente novamente.');
      }
    } finally {
      setDeletingDriverId(null);
    }
  };

  // Função para abrir modal de edição
  const handleOpenEditModal = (driver: User) => {
    setEditingDriver(driver);
    setEditDriverName(driver.name);
    setEditDriverPhone(driver.phone || '');
    setEditDriverPassword('');
    setIsEditModalOpen(true);
  };

  // Função para fechar modal de edição
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingDriver(null);
    setEditDriverName('');
    setEditDriverPhone('');
    setEditDriverPassword('');
  };

  // Função para salvar alterações do entregador
  const handleSaveDriverEdit = async () => {
    if (!editingDriver) return;
    
    if (!editDriverName.trim()) {
      alert('O nome é obrigatório.');
      return;
    }
    
    if (editDriverPassword && editDriverPassword.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setEditLoading(true);
    try {
      const result = await updateDriverFunction({
        uid: editingDriver.id,
        name: editDriverName.trim(),
        phone: editDriverPhone.trim() || undefined,
        newPassword: editDriverPassword || undefined
      });
      console.log('[handleSaveDriverEdit] Resultado:', result.data);
      alert(result.data.message);
      handleCloseEditModal();
    } catch (err: unknown) {
      console.error('Erro ao atualizar entregador:', err);
      if (err && typeof err === 'object' && 'message' in err) {
        alert(`Erro: ${(err as { message: string }).message}`);
      } else {
        alert('Erro ao atualizar entregador. Tente novamente.');
      }
    } finally {
      setEditLoading(false);
    }
  };



  // Sincronizar entregadores do Auth para Firestore
  const handleSyncDrivers = async () => {
    setLoading(true);
    setError("");
    try {
      const auth = getAuth();
      // Firebase Admin SDK não está disponível no client, então simula para 1 usuário
      // Se quiser todos, precisa rodar no backend ou Cloud Function
      // Aqui, sincroniza apenas o entregador informado manualmente
      const email = prompt("Digite o email do entregador já registrado no Auth:");
      if (!email) {
        setLoading(false);
        return;
      }
      // Tenta buscar usuário pelo email
      // No client, só é possível buscar o usuário logado
      // Então, pede para o entregador logar uma vez e pega o UID
      // Alternativamente, pode pedir UID manualmente
      // Aqui, assume que o entregador já logou pelo menos uma vez
      // Busca pelo UID do Auth
      // Se o admin souber o UID, pode pedir também
      // Para simplificar, pede UID
      const uid = prompt("Digite o UID do entregador (pode ser encontrado no Firebase Console > Authentication):");
      if (!uid) {
        setLoading(false);
        return;
      }
      // Verifica se já existe documento no Firestore
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        alert("Entregador já está sincronizado no Firestore!");
      } else {
        // Cria documento básico
        await setDoc(userDocRef, {
          id: uid,
          name: email.split("@")[0],
          email,
          role: UserRole.DRIVER
        });
        alert("Entregador sincronizado com sucesso!");
      }
    } catch (err) {
      setError("Erro ao sincronizar entregador. Verifique email/UID.");
    } finally {
      setLoading(false);
    }
  };

  const toggleDriver = (id: string) => {
    setExpandedDriverId(prev => prev === id ? null : id);
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Cloud Functions está deployed - usando backend para não deslogar o admin
    const useCloudFunction = true;
    
    try {
      // Gera uma senha padrão segura para o entregador
      const defaultPassword = `${newDriverName.replace(/\s+/g, '')}@${Date.now().toString().slice(-4)}`;
      
      if (useCloudFunction) {
        // Usa a Cloud Function para criar o entregador no backend
        // Isso NÃO desloga o admin, pois a criação acontece no servidor
        try {
          const result = await createDriverFunction({
            email: newDriverEmail,
            password: defaultPassword,
            name: newDriverName,
          });
          
          console.log('[handleAddDriver] Resultado da Cloud Function:', result.data);
          
          if (!result.data.success) {
            setError('Erro ao criar entregador.');
            setLoading(false);
            return;
          }
          
          // Fecha modal e limpa formulário
          setIsModalOpen(false);
          setNewDriverName('');
          setNewDriverEmail('');
          
          // Alerta com instruções - admin permanece logado!
          alert(`Entregador criado com sucesso!\n\nEmail: ${newDriverEmail}\nSenha temporária: ${defaultPassword}\n\nAvise o entregador para usar esta senha no primeiro acesso.`);
          return;
        } catch (fnError: unknown) {
          // Mostra o erro real da Cloud Function
          console.error('[handleAddDriver] Cloud Function falhou:', fnError);
          
          // Extrai a mensagem de erro
          let errorMsg = 'Erro desconhecido';
          if (fnError && typeof fnError === 'object') {
            if ('message' in fnError) {
              errorMsg = (fnError as { message: string }).message;
            }
            if ('code' in fnError) {
              const code = (fnError as { code: string }).code;
              console.error('[handleAddDriver] Código do erro:', code);
              
              if (code === 'functions/permission-denied') {
                errorMsg = 'Permissão negada. Verifique se você está logado como administrador.';
              } else if (code === 'functions/unauthenticated') {
                errorMsg = 'Você precisa estar logado para criar entregadores.';
              } else if (code === 'functions/already-exists') {
                errorMsg = 'Este email já está em uso.';
              }
            }
          }
          
          setError(`Cloud Function erro: ${errorMsg}`);
          setLoading(false);
          return; // NÃO usar fallback - mostrar o erro
        }
      }
      
      // FALLBACK: Usa register() local (desloga o admin) - só se useCloudFunction = false
      const authSuccess = await register(newDriverEmail, defaultPassword, newDriverName);
      if (!authSuccess) {
        setError('Erro ao criar conta de autenticação. Email pode já estar em uso.');
        setLoading(false);
        return;
      }
      
      console.log('[handleAddDriver] Entregador criado via register() local.');
      
      // Fecha modal e limpa formulário
      setIsModalOpen(false);
      setNewDriverName('');
      setNewDriverEmail('');
      
      // Alerta com instruções - o admin foi deslogado
      alert(`Entregador criado com sucesso!\n\nEmail: ${newDriverEmail}\nSenha temporária: ${defaultPassword}\n\nATENÇÃO: Você foi deslogado por segurança.\nFaça login novamente como administrador para continuar.\n\nAvise o entregador para usar a senha temporária.`);
      
    } catch (err: unknown) {
      console.error('Erro ao criar entregador:', err);
      
      // Trata erros específicos
      if (err && typeof err === 'object' && 'code' in err) {
        const functionError = err as { code: string; message: string };
        if (functionError.code === 'functions/already-exists') {
          setError('Este email já está em uso por outro usuário.');
        } else if (functionError.code === 'functions/permission-denied') {
          setError('Você não tem permissão para criar entregadores.');
        } else if (functionError.code === 'functions/invalid-argument') {
          setError(functionError.message || 'Dados inválidos.');
        } else {
          setError(functionError.message || 'Erro ao criar entregador. Tente novamente.');
        }
      } else {
        setError('Erro ao criar entregador. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Entregadores</h2>
          <p className="text-gray-500">Gerencie sua equipe e visualize os clientes.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-amber-700 transition-colors shadow"
        >
          <UserPlus size={18} />
          <span>Novo Entregador</span>
        </button>
      </div>

      <div className="grid gap-4">
        {drivers.length > 0 ? drivers.map(driver => {
          const clients = getClientsByDriver(driver.id);
          const isExpanded = expandedDriverId === driver.id;
          const isDeleting = deletingDriverId === driver.id;

          return (
            <div key={driver.id} className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-white">
                <button 
                  onClick={() => toggleDriver(driver.id)}
                  className="flex-1 flex items-center space-x-4 hover:bg-orange-50/50 transition-colors text-left rounded-lg p-1 -m-1"
                >
                  <div className="bg-amber-100 p-3 rounded-full">
                    <Truck className="text-amber-700" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{driver.name}</h3>
                    <p className="text-sm text-gray-500">{driver.email}</p>
                    {driver.phone && <p className="text-sm text-gray-500 flex items-center gap-1"><Phone size={12} /> {driver.phone}</p>}
                  </div>
                </button>
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium bg-gray-100 px-3 py-1 rounded-full text-gray-600">
                    {clients.length} Clientes
                  </span>
                  <button
                    onClick={() => handleOpenEditModal(driver)}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar entregador"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteDriver(driver)}
                    disabled={isDeleting}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Excluir entregador"
                  >
                    {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                  </button>
                  <button onClick={() => toggleDriver(driver.id)} className="p-1">
                    {isExpanded ? <ChevronDown className="text-gray-400" /> : <ChevronRight className="text-gray-400" />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="bg-orange-50/30 p-4 border-t border-amber-100 animate-in slide-in-from-top-2 duration-200">
                  {(() => {
                    // Buscar rotas do entregador
                    const driverRoutes = getRoutesByDriver(driver.id);
                    const allClients = clients;
                    
                    // Função para calcular status de pagamento
                    const getPaymentStatus = (client: Client) => {
                      const debt = calculateClientDebt(client);
                      if (debt.total === 0) return { status: 'Pago', color: 'green' };
                      
                      // Verificar se está em atraso (mais de 30 dias sem pagamento)
                      const lastPayment = client.lastPaymentDate ? new Date(client.lastPaymentDate) : new Date(client.createdAt);
                      const daysSincePayment = Math.floor((Date.now() - lastPayment.getTime()) / (1000 * 60 * 60 * 24));
                      
                      if (daysSincePayment > 30) return { status: 'Em atraso', color: 'red' };
                      return { status: 'Em aberto', color: 'yellow' };
                    };

                    // Agrupar clientes por rota
                    const clientsByRoute: Record<string, Client[]> = {};
                    const clientsWithoutRoute: Client[] = [];

                    allClients.forEach(client => {
                      if (client.routeId) {
                        if (!clientsByRoute[client.routeId]) {
                          clientsByRoute[client.routeId] = [];
                        }
                        clientsByRoute[client.routeId].push(client);
                      } else {
                        clientsWithoutRoute.push(client);
                      }
                    });

                    // Ordenar clientes por status (Em atraso primeiro, depois Em aberto, depois Pago)
                    const sortByStatus = (a: Client, b: Client) => {
                      const statusOrder = { 'Em atraso': 0, 'Em aberto': 1, 'Pago': 2 };
                      const statusA = getPaymentStatus(a).status as keyof typeof statusOrder;
                      const statusB = getPaymentStatus(b).status as keyof typeof statusOrder;
                      return statusOrder[statusA] - statusOrder[statusB];
                    };

                    return (
                      <div className="space-y-6">
                        {/* Resumo */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-white p-3 rounded-lg border">
                            <div className="text-2xl font-bold text-gray-800">{allClients.length}</div>
                            <div className="text-xs text-gray-500">Total Clientes</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border">
                            <div className="text-2xl font-bold text-gray-800">{driverRoutes.length}</div>
                            <div className="text-xs text-gray-500">Rotas</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border">
                            <div className="text-2xl font-bold text-red-600">
                              {allClients.filter(c => getPaymentStatus(c).status === 'Em atraso').length}
                            </div>
                            <div className="text-xs text-gray-500">Em Atraso</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border">
                            <div className="text-2xl font-bold text-green-600">
                              € {allClients.reduce((sum, c) => sum + calculateClientDebt(c).total, 0).toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">Total a Receber</div>
                          </div>
                        </div>

                        {/* Rotas e Clientes */}
                        {driverRoutes.length > 0 ? (
                          driverRoutes.map(route => {
                            const routeClients = (clientsByRoute[route.id] || []).sort(sortByStatus);
                            return (
                              <div key={route.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <div className="bg-amber-50 px-4 py-2 border-b flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Navigation size={16} className="text-amber-600" />
                                    <span className="font-semibold text-gray-800">{route.name}</span>
                                  </div>
                                  <span className="text-sm text-gray-500">{routeClients.length} clientes</span>
                                </div>
                                {routeClients.length > 0 ? (
                                  <div className="divide-y divide-gray-100">
                                    {routeClients.map(client => {
                                      const debt = calculateClientDebt(client);
                                      const paymentInfo = getPaymentStatus(client);
                                      return (
                                        <div key={client.id} className="p-3 hover:bg-gray-50">
                                          <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                              <div className="font-medium text-gray-800">{client.name}</div>
                                              <div className="flex items-center text-xs text-gray-500 mt-1">
                                                <MapPin size={12} className="mr-1 flex-shrink-0" />
                                                <span className="truncate">{client.address}</span>
                                              </div>
                                              <div className="flex items-center text-xs text-gray-500 mt-0.5">
                                                <Phone size={12} className="mr-1 flex-shrink-0" />
                                                {client.phone}
                                              </div>
                                            </div>
                                            <div className="text-right ml-4">
                                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                                paymentInfo.color === 'green' ? 'bg-green-100 text-green-700' :
                                                paymentInfo.color === 'red' ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-700'
                                              }`}>
                                                {paymentInfo.status}
                                              </span>
                                              <div className="text-sm font-semibold text-gray-800 mt-1">
                                                € {debt.total.toFixed(2)}
                                              </div>
                                              <div className="text-xs text-gray-400">
                                                {client.lastPaymentDate ? `Último: ${new Date(client.lastPaymentDate).toLocaleDateString('pt-PT')}` : 'Sem pagamentos'}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="p-4 text-sm text-gray-500 italic text-center">
                                    Nenhum cliente nesta rota
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : null}

                        {/* Clientes sem rota */}
                        {clientsWithoutRoute.length > 0 && (
                          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <UserIcon size={16} className="text-gray-500" />
                                <span className="font-semibold text-gray-800">Sem Rota Definida</span>
                              </div>
                              <span className="text-sm text-gray-500">{clientsWithoutRoute.length} clientes</span>
                            </div>
                            <div className="divide-y divide-gray-100">
                              {clientsWithoutRoute.sort(sortByStatus).map(client => {
                                const debt = calculateClientDebt(client);
                                const paymentInfo = getPaymentStatus(client);
                                return (
                                  <div key={client.id} className="p-3 hover:bg-gray-50">
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-800">{client.name}</div>
                                        <div className="flex items-center text-xs text-gray-500 mt-1">
                                          <MapPin size={12} className="mr-1 flex-shrink-0" />
                                          <span className="truncate">{client.address}</span>
                                        </div>
                                        <div className="flex items-center text-xs text-gray-500 mt-0.5">
                                          <Phone size={12} className="mr-1 flex-shrink-0" />
                                          {client.phone}
                                        </div>
                                      </div>
                                      <div className="text-right ml-4">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                          paymentInfo.color === 'green' ? 'bg-green-100 text-green-700' :
                                          paymentInfo.color === 'red' ? 'bg-red-100 text-red-700' :
                                          'bg-yellow-100 text-yellow-700'
                                        }`}>
                                          {paymentInfo.status}
                                        </span>
                                        <div className="text-sm font-semibold text-gray-800 mt-1">
                                          € {debt.total.toFixed(2)}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                          {client.lastPaymentDate ? `Último: ${new Date(client.lastPaymentDate).toLocaleDateString('pt-PT')}` : 'Sem pagamentos'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Se não tem clientes nem rotas */}
                        {allClients.length === 0 && driverRoutes.length === 0 && (
                          <p className="text-sm text-gray-500 italic text-center py-4">
                            Nenhum cliente ou rota cadastrado para este entregador.
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        }) : (
           <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
             <p className="text-gray-500">Nenhum entregador cadastrado.</p>
           </div>
        )}
      </div>

       {/* New Driver Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Adicionar Entregador</h3>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
                <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <form onSubmit={handleAddDriver} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input required type="text" className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900" value={newDriverName} onChange={e => setNewDriverName(e.target.value)} disabled={loading} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input required type="email" className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900" value={newDriverEmail} onChange={e => setNewDriverEmail(e.target.value)} disabled={loading} />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setIsModalOpen(false); setError(''); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg" disabled={loading}>Cancelar</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2">
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  <span>{loading ? 'Criando...' : 'Criar Conta'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Driver Modal */}
      {isEditModalOpen && editingDriver && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Editar Entregador</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900" 
                  value={editDriverName} 
                  onChange={e => setEditDriverName(e.target.value)} 
                  disabled={editLoading} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  className="w-full p-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed" 
                  value={editingDriver.email} 
                  disabled 
                  title="O email não pode ser alterado"
                />
                <p className="text-xs text-gray-500 mt-1">O email não pode ser alterado</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telemóvel</label>
                <input 
                  type="tel" 
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900" 
                  value={editDriverPhone} 
                  onChange={e => setEditDriverPhone(e.target.value)} 
                  placeholder="Ex: +351 912 345 678"
                  disabled={editLoading} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha (opcional)</label>
                <input 
                  type="password" 
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900" 
                  value={editDriverPassword} 
                  onChange={e => setEditDriverPassword(e.target.value)} 
                  placeholder="Deixe em branco para manter a senha atual"
                  disabled={editLoading}
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres. Deixe em branco para não alterar.</p>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button 
                  type="button" 
                  onClick={handleCloseEditModal} 
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg" 
                  disabled={editLoading}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveDriverEdit} 
                  disabled={editLoading} 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {editLoading && <Loader2 size={16} className="animate-spin" />}
                  <span>{editLoading ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Catálogo de Produtos - Gerenciamento de produtos
export const ProductCatalog: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const productData = {
        id: editingProduct?.id || `prod-${Date.now()}`,
        name: newProductName,
        price: parseFloat(newProductPrice) || 0,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
      } else {
        await addProduct(productData);
      }

      setIsModalOpen(false);
      setEditingProduct(null);
      setNewProductName('');
      setNewProductPrice('');
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setNewProductName(product.name);
    setNewProductPrice(product.price.toString());
    setIsModalOpen(true);
  };

  const handleDelete = async (productId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      await deleteProduct(productId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Catálogo de Produtos</h2>
        <button
          onClick={() => {
            setEditingProduct(null);
            setNewProductName('');
            setNewProductPrice('');
            setIsModalOpen(true);
          }}
          className="bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-amber-700 transition-colors shadow"
        >
          <Plus size={20} />
          <span>Novo Produto</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(product => (
          <div key={product.id} className="bg-white rounded-xl border border-amber-100 shadow-sm p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-900">{product.name}</h3>
                <p className="text-amber-600 font-bold text-lg mt-1">€ {product.price.toFixed(2)}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(product)}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Adicionar/Editar Produto */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto</label>
                <input
                  type="text"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preço (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newProductPrice}
                  onChange={(e) => setNewProductPrice(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-600 text-white py-3 rounded-xl font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Salvando...' : (editingProduct ? 'Salvar Alterações' : 'Criar Produto')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const ProductionManager: React.FC = () => {
  const { products, updateDailyProduction, getDailyRecord } = useData();
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [empeloMode, setEmpeloMode] = useState<Record<string, boolean>>({});

  const toggleEmpelo = (productId: string) => {
    setEmpeloMode(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const handleProductionInput = (productId: string, value: string) => {
    const isEmpelo = empeloMode[productId];
    let numValue = parseInt(value) || 0;
    
    // Store always in Units
    // If in Empelo mode, user types 1 (meaning 30 units), we store 30.
    const finalUnits = isEmpelo ? numValue * 30 : numValue;
    
    updateDailyProduction(currentDate, productId, { produced: finalUnits });
  };

  const handleStatUpdate = (productId: string, field: 'delivered' | 'sold' | 'leftovers', value: string) => {
    updateDailyProduction(currentDate, productId, { [field]: parseInt(value) || 0 });
  };

  // Calculate Total Quebra for the day
  const totalQuebraValue = products.reduce((acc, product) => {
    const record = getDailyRecord(currentDate, product.id);
    const quebraUnits = record.produced - (record.sold + record.leftovers);
    return acc + (quebraUnits * product.price);
  }, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header with Title and Date */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Controle de Produção e Quebra</h2>
          <p className="text-sm text-gray-500">Insira a produção do dia. Use o botão de troca para lançar em Empelos (x30) ou Unidades.</p>
        </div>
        <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
          <Calendar size={20} className="text-amber-600" />
          <input 
            type="date" 
            className="bg-transparent border-none focus:ring-0 text-gray-800 font-medium"
            value={currentDate}
            onChange={(e) => setCurrentDate(e.target.value)}
          />
        </div>
      </div>

      {/* 1. Produção do Dia - Cards Grid */}
      <section>
        <h3 className="text-lg font-bold text-gray-800 mb-4">1. Produção do Dia</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map(product => {
            const record = getDailyRecord(currentDate, product.id);
            const isEmpelo = empeloMode[product.id];
            // Display value: If empelo, show units / 30. If units, show units.
            const displayValue = isEmpelo ? Math.floor(record.produced / 30) : record.produced;
            return (
              <div key={product.id} className="bg-white rounded-lg border border-amber-100 shadow-sm overflow-hidden flex flex-col">
                <div className="bg-orange-50 px-4 py-2 flex justify-between items-center border-b border-orange-100">
                  <span className="font-bold text-amber-900 text-sm uppercase truncate pr-2">{product.name}</span>
                  {product.supportsEmpelo && (
                    <button 
                      onClick={() => toggleEmpelo(product.id)}
                      className={`text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1 ${isEmpelo ? 'bg-amber-200 border-amber-300 text-amber-900' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                      title="Alternar entre Unidade e Empelo (30un)"
                    >
                      <ArrowRightLeft size={10} />
                      {isEmpelo ? 'Empelo' : 'Unidade'}
                    </button>
                  )}
                </div>
                
                <div className="p-4 flex-1">
                  <input 
                    type="number" 
                    min="0"
                    className="w-full text-3xl font-bold text-gray-700 border-b-2 border-amber-200 focus:border-amber-500 focus:outline-none bg-transparent placeholder-gray-200"
                    placeholder="0"
                    onChange={(e) => handleProductionInput(product.id, e.target.value)}
                  />
                  <div className="mt-2 text-xs text-gray-400 flex justify-between">
                    <span>{isEmpelo ? `x 30 un.` : 'Unidades'}</span>
                    <span className="font-semibold text-amber-700">Total: {record.produced}</span>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                  <Package size={14} />
                  <span>Estoque/Produção</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Relatório de Quebra - Table */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-800">2. Relatório de Quebra</h3>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">Quebra = Produção - (Vendido + Sobra)</span>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase font-semibold">Quebra Total (€)</p>
            <p className={`text-xl font-bold ${totalQuebraValue > 0 ? 'text-red-600' : 'text-green-600'}`}>
              € {totalQuebraValue.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-4 border-b min-w-[150px]">Produto</th>
                <th className="p-4 border-b text-center bg-gray-100/50">Produção<br/><span className="text-xs font-normal text-gray-400">(Unid.)</span></th>
                <th className="p-4 border-b text-center">Entregue<br/><span className="text-xs font-normal text-gray-400">(Levado)</span></th>
                <th className="p-4 border-b text-center">Vendido</th>
                <th className="p-4 border-b text-center">Sobra<br/><span className="text-xs font-normal text-gray-400">(Retorno)</span></th>
                <th className="p-4 border-b text-center bg-red-50 text-red-700">Quebra<br/><span className="text-xs font-normal opacity-70">(Unid.)</span></th>
                <th className="p-4 border-b text-center bg-red-50 text-red-700">Quebra<br/><span className="text-xs font-normal opacity-70">(€)</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map(product => {
                const record = getDailyRecord(currentDate, product.id);
                // Formula: Quebra = Produção - (Vendido + Sobra)
                const quebraUnits = record.produced - (record.sold + record.leftovers);
                const quebraValue = quebraUnits * product.price;

                return (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-800">{product.name}</td>
                    
                    {/* Produção (Read Only) */}
                    <td className="p-4 text-center font-bold text-gray-900 bg-gray-50/30">
                      {record.produced}
                    </td>

                    {/* Entregue (Input) */}
                    <td className="p-4 text-center">
                      <input 
                        type="number" 
                        min="0"
                        className="w-20 p-1.5 text-center border border-gray-200 rounded focus:ring-1 focus:ring-amber-500 focus:border-amber-500 bg-white text-gray-900"
                        placeholder="0"
                        value={record.delivered === 0 ? '' : record.delivered}
                        onChange={(e) => handleStatUpdate(product.id, 'delivered', e.target.value)}
                      />
                    </td>

                    {/* Vendido (Input) */}
                    <td className="p-4 text-center">
                      <input 
                        type="number" 
                        min="0"
                        className="w-20 p-1.5 text-center border border-gray-200 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500 text-green-700 font-medium bg-white"
                        placeholder="0"
                        value={record.sold === 0 ? '' : record.sold}
                        onChange={(e) => handleStatUpdate(product.id, 'sold', e.target.value)}
                      />
                    </td>

                    {/* Sobra (Input) */}
                    <td className="p-4 text-center">
                      <input 
                        type="number" 
                        min="0"
                        className="w-20 p-1.5 text-center border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-orange-700 bg-white"
                        placeholder="0"
                        value={record.leftovers === 0 ? '' : record.leftovers}
                        onChange={(e) => handleStatUpdate(product.id, 'leftovers', e.target.value)}
                      />
                    </td>

                    {/* Quebra Unid (Calc) */}
                    <td className={`p-4 text-center font-bold ${quebraUnits > 0 ? 'text-red-600 bg-red-50/50' : 'text-gray-400'}`}>
                      {quebraUnits}
                    </td>

                    {/* Quebra € (Calc) */}
                    <td className={`p-4 text-center font-medium ${quebraValue > 0 ? 'text-red-600 bg-red-50/50' : 'text-gray-400'}`}>
                      € {quebraValue.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export const ClientManager: React.FC = () => {
    // Função para excluir rota
    const handleDeleteRoute = (routeId: string) => {
      if (window.confirm('Tem certeza que deseja remover esta rota?')) {
        deleteRoute(routeId);
      }
    };
  const { currentUser, isAdmin } = useAuth();
  const { getAllClients, getDrivers, getRoutesByDriver, updateClient, addClient, addRoute, deleteRoute, updateDailyProduction, products, calculateClientDebt, registerPayment, toggleSkippedDate, updateClientPrice, routes } = useData();
  const drivers = getDrivers();
  const clients = getAllClients();

  const [selectedDriverId, setSelectedDriverId] = useState<string>('all');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'geral' | 'entrega' | 'pagamento' | 'obs' | 'falhas' | 'precos'>('geral');
  const [isLocating, setIsLocating] = useState(false);
  
  // States for Payment Calculation (Admin)
  const [calculatedTotal, setCalculatedTotal] = useState<number | null>(null);
  const [calculatedDays, setCalculatedDays] = useState<number>(0);
  const [calcDateFrom, setCalcDateFrom] = useState<string>('');
  const [calcDateTo, setCalcDateTo] = useState<string>('');
  const [calcDailyValue, setCalcDailyValue] = useState<number>(0);

  // Client Form State
  const initialClientState: Partial<Client> = {
    name: '',
    address: '',
    phone: '',
    nif: '',
    routeId: '',
    status: 'ACTIVE',
    coordinates: { lat: 0, lng: 0 },
    notes: '',
    paymentFrequency: 'Mensal',
    paymentCustomDays: 15,
    currentBalance: 0,
    leaveReceipt: false,
    acceptsReturns: false,
    deliverySchedule: {},
    customPrices: {}
  };
  const [clientForm, setClientForm] = useState<Partial<Client>>(initialClientState);

  // Rotas disponíveis para o entregador selecionado no filtro
  const filterRoutes = selectedDriverId === 'all' 
    ? routes 
    : routes.filter(r => r.driverId === selectedDriverId);

  // Computed
  const normalizedSearchTerm = normalizeText(searchTerm);
  const filteredClients = clients.filter(c => {
    const matchesDriver = selectedDriverId === 'all' || c.driverId === selectedDriverId;
    const matchesRoute = selectedRouteId === 'all' || c.routeId === selectedRouteId;
    const matchesSearch = normalizeText(c.name).includes(normalizedSearchTerm) || 
                          normalizeText(c.address).includes(normalizedSearchTerm) ||
                          normalizeText(c.phone || '').includes(normalizedSearchTerm);
    return matchesDriver && matchesRoute && matchesSearch;
  });

  // Sugestões de busca (máximo 5)
  const searchSuggestions = searchTerm.length >= 2 
    ? clients
        .filter(c => {
          const matchesDriver = selectedDriverId === 'all' || c.driverId === selectedDriverId;
          const matchesRoute = selectedRouteId === 'all' || c.routeId === selectedRouteId;
          return matchesDriver && matchesRoute && (
            normalizeText(c.name).includes(normalizedSearchTerm) ||
            normalizeText(c.address).includes(normalizedSearchTerm)
          );
        })
        .slice(0, 5)
    : [];

  // Entregador vê só suas rotas, admin vê todas
  // Removido duplicidade de isAdmin e routes
  const availableRoutes = isAdmin
    ? routes
    : currentUser?.id
      ? getRoutesByDriver(currentUser.id)
      : [];

  const handleOpenClientModal = (client?: Client) => {
    setCalculatedTotal(null); // Reset
    // Reset date calculation fields
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setCalcDateTo(todayStr);
    setCalcDailyValue(0);
    
    if (client) {
      setEditingClientId(client.id);
      setClientForm({ ...client, deliverySchedule: client.deliverySchedule || {}, customPrices: client.customPrices || {} });
      // Set default date from as lastPaymentDate or start of month
      if (client.lastPaymentDate) {
        setCalcDateFrom(client.lastPaymentDate);
      } else {
        const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
        setCalcDateFrom(firstOfMonth);
      }
    } else {
      setEditingClientId(null);
      setClientForm({ 
        ...initialClientState, 
        driverId: selectedDriverId !== 'all' ? selectedDriverId : drivers[0]?.id 
      });
      const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      setCalcDateFrom(firstOfMonth);
    }
    setActiveTab('geral');
    setIsClientModalOpen(true);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.driverId) {
      alert("Selecione um entregador");
      return;
    }

    if (editingClientId) {
      updateClient(editingClientId, clientForm);
    } else {
      const newClient: Client = {
        id: Date.now().toString(),
        name: clientForm.name || 'Novo Cliente',
        address: clientForm.address || '',
        phone: clientForm.phone || '',
        nif: clientForm.nif,
        driverId: clientForm.driverId,
        routeId: clientForm.routeId,
        coordinates: clientForm.coordinates,
        status: clientForm.status || 'ACTIVE',
        notes: clientForm.notes,
        paymentFrequency: clientForm.paymentFrequency || 'Mensal',
        paymentCustomDays: clientForm.paymentCustomDays,
        currentBalance: Number(clientForm.currentBalance) || 0,
        leaveReceipt: clientForm.leaveReceipt || false,
        acceptsReturns: clientForm.acceptsReturns || false,
        deliverySchedule: clientForm.deliverySchedule || {},
        customPrices: clientForm.customPrices || {},
        createdAt: new Date().toISOString()
      };
      addClient(newClient);
    }
    setIsClientModalOpen(false);
  };

  // Helper to get GPS (Duplicated logic, ideally shared hook)
  const getGPS = () => {
    if (!navigator.geolocation) {
      alert('GPS não suportado.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setClientForm(prev => ({
          ...prev,
          coordinates: {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
        }));
        setIsLocating(false);
      },
      (error) => {
        alert('Erro GPS: ' + error.message);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

   // Schedule Helpers
  const daysOfWeek = [
    { key: 'seg', label: 'Segunda-feira' },
    { key: 'ter', label: 'Terça-feira' },
    { key: 'qua', label: 'Quarta-feira' },
    { key: 'qui', label: 'Quinta-feira' },
    { key: 'sex', label: 'Sexta-feira' },
    { key: 'sab', label: 'Sábado' },
    { key: 'dom', label: 'Domingo' },
  ];

  const handleAddItemToSchedule = (dayKey: string, productId: string, quantity: number) => {
    const currentSchedule = { ...clientForm.deliverySchedule };
    const dayItems = currentSchedule[dayKey as keyof DeliverySchedule] || [];

    // Check if product already exists for this day
    const existingIndex = dayItems.findIndex(i => i.productId === productId);
    
    let newDayItems;
    if (existingIndex >= 0) {
      // Update quantity
      newDayItems = [...dayItems];
      newDayItems[existingIndex].quantity = quantity;
    } else {
      // Add new
      newDayItems = [...dayItems, { productId: productId, quantity: quantity }];
    }

    setClientForm({
      ...clientForm,
      deliverySchedule: {
        ...currentSchedule,
        [dayKey]: newDayItems
      }
    });
  };

  const handleRemoveItemFromSchedule = (dayKey: string, productId: string) => {
    const currentSchedule = { ...clientForm.deliverySchedule };
    const dayItems = currentSchedule[dayKey as keyof DeliverySchedule] || [];
    
    setClientForm({
      ...clientForm,
      deliverySchedule: {
        ...currentSchedule,
        [dayKey]: dayItems.filter(i => i.productId !== productId)
      }
    });
  };

   const handleCalculateDebt = () => {
      const baseClient = editingClientId ? clients.find(c => c.id === editingClientId) : undefined;
      const tempClient = {
          ...(baseClient || {}),
          ...clientForm,
          createdAt: baseClient?.createdAt || new Date().toISOString()
      } as Client;

      // Usar datas personalizadas se fornecidas
      const dateFrom = calcDateFrom || tempClient.lastPaymentDate || tempClient.createdAt?.split('T')[0];
      const dateTo = calcDateTo || formatDateLocal(new Date());

      const result = calculatePeriodDebt(tempClient, dateFrom, dateTo);
      setCalculatedTotal(result.total);
      setCalculatedDays(result.daysCount);
      setCalcDailyValue(result.dailyValue);
      setClientForm(prev => ({ ...prev, currentBalance: parseFloat(result.total.toFixed(2)) }));
  };

  // Função para formatar data local sem problemas de fuso horário
  const formatDateLocal = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Função para calcular dívida de um período
  // Considera o histórico de alterações do agendamento para usar os valores corretos de cada período
  const calculatePeriodDebt = (client: Client, dateFromStr: string, dateToStr: string) => {
    const mapKeys = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    
    // Função para obter o agendamento válido em uma data específica
    const getScheduleForDate = (dateStr: string): DeliverySchedule | undefined => {
      // Se não tem histórico, usar o agendamento atual
      if (!client.scheduleHistory || client.scheduleHistory.length === 0) {
        return client.deliverySchedule;
      }
      
      // Ordenar histórico por data (mais recente primeiro)
      const sortedHistory = [...client.scheduleHistory].sort((a, b) => 
        b.date.localeCompare(a.date)
      );
      
      // Encontrar o agendamento que era válido nessa data
      // (o primeiro no histórico cuja data seja <= a data em questão)
      for (const entry of sortedHistory) {
        if (entry.date <= dateStr) {
          return entry.schedule;
        }
      }
      
      // Se a data é anterior a qualquer entrada do histórico, usar o primeiro agendamento
      // ou o agendamento atual como fallback
      return sortedHistory[sortedHistory.length - 1]?.schedule || client.deliverySchedule;
    };
    
    // Função para calcular o valor de um dia específico com um agendamento específico
    const getDayValue = (schedule: DeliverySchedule | undefined, dayOfWeek: number) => {
      if (!schedule) return 0;
      const dayKey = mapKeys[dayOfWeek];
      const items = schedule[dayKey as keyof DeliverySchedule];
      if (!items || items.length === 0) return 0;
      
      let dayTotal = 0;
      items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const price = client.customPrices?.[product.id] ?? product.price;
          dayTotal += item.quantity * price;
        }
      });
      return dayTotal;
    };
    
    // Função para verificar se um dia da semana tem entrega em um agendamento
    const hasDeliveryOnDay = (schedule: DeliverySchedule | undefined, dayOfWeek: number) => {
      if (!schedule) return false;
      const dayKey = mapKeys[dayOfWeek];
      const items = schedule[dayKey as keyof DeliverySchedule];
      return items && items.length > 0;
    };

    // Parsear datas
    const [y1, m1, d1] = dateFromStr.split('-').map(Number);
    const [y2, m2, d2] = dateToStr.split('-').map(Number);
    const startDate = new Date(y1, m1 - 1, d1);
    const endDate = new Date(y2, m2 - 1, d2);

    let total = 0;
    let daysCount = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateStr = formatDateLocal(current);
      const dayOfWeek = current.getDay();
      
      // Obter o agendamento válido para esta data
      const scheduleForDate = getScheduleForDate(dateStr);
      
      // Este dia da semana tem entrega?
      if (hasDeliveryOnDay(scheduleForDate, dayOfWeek)) {
        // Verificar se não foi marcado como falha
        const isSkipped = client.skippedDates?.includes(dateStr);
        
        if (!isSkipped) {
          // Somar o valor do dia
          const dayValue = getDayValue(scheduleForDate, dayOfWeek);
          total += dayValue;
          daysCount++;
        }
      }
      
      current.setDate(current.getDate() + 1);
    }

    // Calcular valor médio diário para exibição
    const dailyValue = daysCount > 0 ? total / daysCount : 0;

    return { total, daysCount, dailyValue };
  };

  const handleConfirmPayment = () => {
    if (editingClientId && calculatedTotal !== null) {
        registerPayment(editingClientId, calculatedTotal, 'Dinheiro');
        setClientForm(prev => ({ ...prev, currentBalance: 0 }));
        setCalculatedTotal(0);
        alert("Pagamento registrado com sucesso!");
    }
  };

  // Função para enviar mensagem de pagamento via WhatsApp
  const handleSendPaymentMessage = () => {
    if (!clientForm.phone) {
      alert('O cliente não possui telefone cadastrado.');
      return;
    }

    // Calcular informações de pagamento
    const client = clients.find(c => c.id === editingClientId);
    if (!client) return;

    const debt = calculateClientDebt(client);
    const lastPaymentStr = client.lastPaymentDate 
      ? new Date(client.lastPaymentDate).toLocaleDateString('pt-PT')
      : 'Sem pagamentos anteriores';

    // Calcular até quando fica pago se pagar hoje
    const today = new Date();
    const paidUntilStr = today.toLocaleDateString('pt-PT');

    // Calcular quantidade de produtos por dia (se houver agendamento)
    let totalProductsPerDay = 0;
    if (client.deliverySchedule) {
      const schedule = client.deliverySchedule;
      const days = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const;
      const dayProducts: number[] = [];
      days.forEach(day => {
        const items = schedule[day];
        if (items && items.length > 0) {
          const dayTotal = items.reduce((sum, item) => sum + item.quantity, 0);
          dayProducts.push(dayTotal);
        }
      });
      if (dayProducts.length > 0) {
        totalProductsPerDay = Math.round(dayProducts.reduce((a, b) => a + b, 0) / dayProducts.length);
      }
    }

    // Formatar valor a pagar
    const valorAPagar = calculatedTotal !== null ? calculatedTotal.toFixed(2) : debt.total.toFixed(2);
    const diasEmAberto = calculatedDays > 0 ? calculatedDays : debt.daysCount;

    // Montar mensagem
    let message = `🥖 *Pão de Ribamar - Resumo de Pagamento*\n\n`;
    message += `👤 *Cliente:* ${client.name}\n\n`;
    message += `💰 *Valor a Pagar:* €${valorAPagar}\n`;
    message += `📅 *Dias em aberto:* ${diasEmAberto} dias\n`;
    if (totalProductsPerDay > 0) {
      message += `📦 *Média produtos/dia:* ${totalProductsPerDay} unidades\n`;
    }
    message += `\n📆 *Último pagamento:* ${lastPaymentStr}\n`;
    if (calcDateFrom && calcDateTo) {
      message += `📋 *Período:* ${new Date(calcDateFrom).toLocaleDateString('pt-PT')} a ${new Date(calcDateTo).toLocaleDateString('pt-PT')}\n`;
    }
    message += `\n✅ *Se pagar hoje, fica pago até:* ${paidUntilStr}\n`;
    message += `\n_Obrigado pela preferência!_`;

    // Formatar número de telefone para WhatsApp
    // Remove espaços, traços e caracteres especiais
    let phone = clientForm.phone.replace(/[\s\-\(\)]/g, '');
    
    // Se começa com 0, remove
    if (phone.startsWith('0')) {
      phone = phone.substring(1);
    }
    
    // Se não começa com +, adiciona código de Portugal (+351)
    if (!phone.startsWith('+')) {
      // Se já começa com 351, adiciona só o +
      if (phone.startsWith('351')) {
        phone = '+' + phone;
      } else {
        phone = '+351' + phone;
      }
    }

    // Codificar mensagem para URL
    const encodedMessage = encodeURIComponent(message);
    
    // Abrir WhatsApp Web com a mensagem
    const whatsappUrl = `https://wa.me/${phone.replace('+', '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  // Função para enviar SMS normal
  const handleSendSMS = () => {
    if (!clientForm.phone) {
      alert('O cliente não possui telefone cadastrado.');
      return;
    }

    // Buscar dados do cliente
    const client = clients.find(c => c.id === editingClientId);
    if (!client) return;

    const debt = calculateClientDebt(client);
    const lastPaymentStr = client.lastPaymentDate 
      ? new Date(client.lastPaymentDate).toLocaleDateString('pt-PT')
      : 'Sem pagamentos anteriores';

    const today = new Date();
    const paidUntilStr = today.toLocaleDateString('pt-PT');

    // Formatar valor a pagar
    const valorAPagar = calculatedTotal !== null ? calculatedTotal.toFixed(2) : debt.total.toFixed(2);
    const diasEmAberto = calculatedDays > 0 ? calculatedDays : debt.daysCount;

    // Montar mensagem SMS (mais curta que WhatsApp)
    let message = `Pao de Ribamar - Cobranca\n`;
    message += `Cliente: ${client.name}\n`;
    message += `Valor: ${valorAPagar}EUR\n`;
    message += `Dias em aberto: ${diasEmAberto}\n`;
    message += `Ultimo pgto: ${lastPaymentStr}\n`;
    message += `Pago ate: ${paidUntilStr}\n`;
    message += `Obrigado!`;

    // Formatar número de telefone
    let phone = clientForm.phone.replace(/[\s\-\(\)]/g, '');
    if (phone.startsWith('0')) {
      phone = phone.substring(1);
    }
    if (!phone.startsWith('+')) {
      if (phone.startsWith('351')) {
        phone = '+' + phone;
      } else {
        phone = '+351' + phone;
      }
    }

    // Codificar mensagem para URL
    const encodedMessage = encodeURIComponent(message);
    
    // Abrir app de SMS com a mensagem
    const smsUrl = `sms:${phone}?body=${encodedMessage}`;
    window.location.href = smsUrl;
  };

  const handleToggleSkippedDate = (date: string) => {
      if (!editingClientId) return;
      toggleSkippedDate(editingClientId, date);
      const currentSkipped = clientForm.skippedDates || [];
      if (currentSkipped.includes(date)) {
          setClientForm({...clientForm, skippedDates: currentSkipped.filter(d => d !== date)});
      } else {
          setClientForm({...clientForm, skippedDates: [...currentSkipped, date]});
      }
  };

  const handleUpdatePrice = (productId: string, newPrice: string) => {
      if(!currentUser) return;
      const priceVal = parseFloat(newPrice);
      if(isNaN(priceVal)) return;

      if(editingClientId) {
          // If we are editing an existing client, update via context to persist
          updateClientPrice(editingClientId, productId, priceVal, currentUser.role);
          // Also update local state for UI feedback
          setClientForm(prev => ({
              ...prev,
              customPrices: {
                  ...prev.customPrices,
                  [productId]: priceVal
              }
          }));
      } else {
          // If creating new client, just update local state
          setClientForm(prev => ({
              ...prev,
              customPrices: {
                  ...prev.customPrices,
                  [productId]: priceVal
              }
          }));
      }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestão de Clientes (Geral)</h2>
          <p className="text-gray-500">Visualize e gerencie clientes de todos os entregadores.</p>
        </div>
        <button 
          onClick={() => handleOpenClientModal()}
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow"
        >
          <Plus size={20} />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
         <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Filtrar por Entregador</label>
            <select 
              className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50"
              value={selectedDriverId}
              onChange={(e) => {
                setSelectedDriverId(e.target.value);
                setSelectedRouteId('all'); // Reset rota quando muda entregador
              }}
            >
              <option value="all">Todos os Entregadores</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
         </div>
         <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Filtrar por Rota</label>
            <select 
              className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50"
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
            >
              <option value="all">Todas as Rotas</option>
              {filterRoutes.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
         </div>
         <div className="flex-[2]">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Buscar Cliente</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400 z-10" size={18} />
              <input 
                type="text" 
                placeholder="Nome, Endereço, Telefone..."
                className="w-full pl-10 p-2 border border-gray-200 rounded-lg bg-gray-50"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              {/* Sugestões de busca */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
                  {searchSuggestions.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      className="w-full px-4 py-2 text-left hover:bg-amber-50 flex items-center gap-3 border-b border-gray-100 last:border-0"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSearchTerm(client.name);
                        setShowSuggestions(false);
                      }}
                    >
                      <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold text-sm">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 truncate">{client.name}</div>
                        <div className="text-xs text-gray-500 truncate">{client.address}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {showSuggestions && searchTerm.length >= 2 && searchSuggestions.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-3 text-center text-gray-500 text-sm">
                  Nenhum cliente encontrado
                </div>
              )}
            </div>
         </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="p-4 font-bold border-b">Cliente</th>
              <th className="p-4 font-bold border-b">Entregador / Rota</th>
              <th className="p-4 font-bold border-b">Endereço</th>
              <th className="p-4 font-bold border-b text-center">Status</th>
              <th className="p-4 font-bold border-b text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
              {filteredClients.map(client => {
              const driver = drivers.find(d => d.id === client.driverId);
              const driverName = driver?.name || 'Desconhecido';
              const driverIdHint = !driver && client.driverId ? ` (${client.driverId.slice(0,6)}…${client.driverId.slice(-4)})` : '';
              return (
                <tr key={client.id} className="hover:bg-amber-50/30 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{client.name}</div>
                    <div className="text-xs text-gray-500">{client.phone}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-gray-800">{driverName}{driverIdHint}</div>
                    {client.routeId && (
                      <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                        {routes.find(r => r.id === client.routeId)?.name || `Rota ID: ${client.routeId.slice(-4)}`}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-600 max-w-xs truncate">{client.address}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${client.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {client.status === 'ACTIVE' ? 'ATIVO' : 'INATIVO'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleOpenClientModal(client)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Pencil size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredClients.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum cliente encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal - Reused Logic mostly */}
      {isClientModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">
                {editingClientId ? 'Editar Cliente' : 'Novo Cliente'}
              </h3>
              <button onClick={() => setIsClientModalOpen(false)}><X size={24} className="text-gray-400 hover:text-gray-600"/></button>
            </div>

            {/* Tabs */}
            <div className="flex overflow-x-auto border-b border-gray-200 px-4 bg-gray-50/50">
               {[
                { id: 'geral', label: 'Geral', icon: <UserIcon size={14} /> },
                { id: 'entrega', label: 'Entrega', icon: <Calendar size={14} /> },
                { id: 'pagamento', label: 'Modo de Pagamento', icon: <CreditCard size={14} /> },
                { id: 'obs', label: 'Obs', icon: null },
                { id: 'falhas', label: 'Falhas', icon: <AlertCircle size={14} /> },
                { id: 'precos', label: 'Preços', icon: <Tag size={14} /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === tab.id 
                      ? 'border-amber-600 text-amber-700 bg-white' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

             <div className="p-6 overflow-y-auto flex-1 bg-white">
               <form id="admin-client-form" onSubmit={handleSaveClient}>
                  {activeTab === 'geral' && (
                    <div className="space-y-4">
                       <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nome do Cliente</label>
                          <input required type="text" className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-gray-900" 
                            value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Entregador Responsável</label>
                            <select 
                              className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-gray-900"
                              value={clientForm.driverId}
                              onChange={e => setClientForm({...clientForm, driverId: e.target.value, routeId: ''})}
                            >
                              <option value="">Selecione...</option>
                              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Rota / Zona</label>
                            <select 
                              className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-gray-900"
                              value={clientForm.routeId}
                              onChange={e => setClientForm({...clientForm, routeId: e.target.value})}
                              disabled={availableRoutes.length === 0}
                            >
                              <option value="">Padrão (Sem Zona)</option>
                              {availableRoutes.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                              ))}
                            </select>
                          </div>
                       </div>
                       {/* Listagem de rotas com botão de exclusão */}
                       {availableRoutes.length > 0 && (
                         <div className="mt-4">
                           <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Minhas Rotas</h4>
                           <ul className="space-y-2">
                             {availableRoutes.map(r => (
                               <li key={r.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded px-3 py-2">
                                 <span className="font-medium text-gray-800">{r.name}</span>
                                 <button
                                   type="button"
                                   className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                                   title="Excluir rota"
                                   onClick={() => handleDeleteRoute(r.id)}
                                 >
                                   <Trash2 size={16} />
                                 </button>
                               </li>
                             ))}
                           </ul>
                         </div>
                       )}
                       {/* Fim do bloco geral */}
                       <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">NIF (Opcional)</label>
                          <input 
                            type="text" 
                            placeholder="NIF da Empresa"
                            className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-gray-900" 
                            value={clientForm.nif || ''} 
                            onChange={e => setClientForm({...clientForm, nif: e.target.value})} 
                          />
                       </div>
                       <div className="grid grid-cols-3 gap-4">
                          <div className="col-span-1">
                             <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Telefone</label>
                             <input type="tel" className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-gray-900" 
                                value={clientForm.phone} onChange={e => setClientForm({...clientForm, phone: e.target.value})} />
                          </div>
                          <div className="col-span-2">
                             <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">GPS</label>
                             <div className="flex gap-2">
                                <input readOnly type="text" className="w-1/2 p-2.5 border border-gray-300 rounded-lg bg-gray-50" value={clientForm.coordinates?.lat || ''} placeholder="Lat" />
                                <input readOnly type="text" className="w-1/2 p-2.5 border border-gray-300 rounded-lg bg-gray-50" value={clientForm.coordinates?.lng || ''} placeholder="Lng" />
                             </div>
                          </div>
                       </div>
                       <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Endereço</label>
                          <textarea rows={2} className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-gray-900" 
                            value={clientForm.address} onChange={e => setClientForm({...clientForm, address: e.target.value})} />
                       </div>
                       <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">Status:</span>
                            <button type="button" onClick={() => setClientForm(prev => ({...prev, status: prev.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'}))}
                              className={`px-3 py-1 rounded text-xs font-bold ${clientForm.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {clientForm.status === 'ACTIVE' ? 'ATIVO' : 'INATIVO'}
                            </button>
                          </div>
                          <button 
                            type="button" 
                            onClick={getGPS} 
                            disabled={isLocating}
                            className="text-blue-600 text-sm hover:underline flex items-center gap-1 disabled:opacity-50"
                          >
                             {isLocating ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                             {isLocating ? ' Buscando...' : ' Pegar GPS'}
                          </button>
                       </div>
                    </div>
                  )}

                   {activeTab === 'entrega' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <p className="text-sm text-gray-500 mb-2">Defina os dias e a quantidade de produtos para entrega automática.</p>
                    
                    <div className="space-y-3">
                      {daysOfWeek.map(day => {
                        const items = clientForm.deliverySchedule?.[day.key as keyof DeliverySchedule] || [];
                        const isActive = items.length > 0;

                        return (
                          <div key={day.key} className={`border rounded-lg overflow-hidden transition-colors ${isActive ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200 bg-gray-50/50'}`}>
                            <div className="flex items-center justify-between p-3 bg-white border-b border-gray-100">
                              <span className="font-semibold text-gray-700 text-sm flex items-center gap-2">
                                <Calendar size={14} className="text-amber-500" />
                                {day.label}
                              </span>
                              <span className="text-xs text-gray-400">
                                {items.length > 0 ? `${items.reduce((acc, i) => acc + i.quantity, 0)} itens` : 'Sem entrega'}
                              </span>
                            </div>

                            <div className="p-3">
                              {/* List existing items */}
                              {items.length > 0 && (
                                <ul className="space-y-2 mb-3">
                                  {items.map(item => {
                                    const prod = products.find(p => p.id === item.productId);
                                    return (
                                      <li key={item.productId} className="flex justify-between items-center text-sm bg-white p-2 rounded shadow-sm border border-gray-100">
                                        <span className="text-gray-800">{prod?.name || 'Produto Removido'}</span>
                                        <div className="flex items-center gap-3">
                                          <span className="font-bold text-amber-700">{item.quantity} un.</span>
                                          <button 
                                            type="button"
                                            onClick={() => handleRemoveItemFromSchedule(day.key, item.productId)}
                                            className="text-red-400 hover:text-red-600"
                                          >
                                            <X size={14} />
                                          </button>
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}

                              {/* Add new item row - ISOLATED COMPONENT */}
                              <AddScheduleItemRow 
                                products={products} 
                                onAdd={(pid, qty) => handleAddItemToSchedule(day.key, pid, qty)} 
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                  {activeTab === 'pagamento' && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    
                    {/* Frequência */}
                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                         <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Frequência de Pagamento</label>
                         <div className="flex gap-2">
                           <select 
                              className="w-full p-2.5 border border-amber-200 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                              value={clientForm.paymentFrequency || 'Mensal'}
                              onChange={e => setClientForm({...clientForm, paymentFrequency: e.target.value as any})}
                            >
                             <option value="Diário">Diário</option>
                             <option value="Semanal">Semanal</option>
                             <option value="Mensal">Mensal</option>
                             <option value="Personalizado">Personalizado</option>
                           </select>
                           {clientForm.paymentFrequency === 'Personalizado' && (
                             <input 
                               type="number" 
                               placeholder="Dias" 
                               className="w-24 p-2.5 border border-amber-200 rounded-lg bg-white text-gray-900 text-center font-bold"
                               value={clientForm.paymentCustomDays || ''}
                               onChange={e => setClientForm({...clientForm, paymentCustomDays: parseInt(e.target.value)})}
                             />
                           )}
                         </div>
                    </div>

                    {/* Valor a Pagar (Saldo) */}
                    <div>
                       <div className="flex justify-between items-center mb-1">
                           <label className="block text-xs font-semibold text-gray-500 uppercase">Valor a Pagar (Saldo Atual)</label>
                           <span className="text-xs text-gray-400">Último Pagamento: {clientForm.lastPaymentDate ? new Date(clientForm.lastPaymentDate).toLocaleDateString() : 'Nunca'}</span>
                       </div>
                       
                       {/* Date Selection for Calculation - only show when leaveReceipt is enabled */}
                       {clientForm.leaveReceipt && (
                           <div className="mb-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                               <p className="text-xs font-semibold text-amber-700 uppercase mb-2">Período para Cálculo do Papel</p>
                               <div className="grid grid-cols-2 gap-2 mb-2">
                                   <div>
                                       <label className="text-xs text-gray-600">De:</label>
                                       <input
                                           type="date"
                                           value={calcDateFrom}
                                           onChange={(e) => setCalcDateFrom(e.target.value)}
                                           className="w-full p-2 border border-gray-300 rounded text-sm"
                                       />
                                   </div>
                                   <div>
                                       <label className="text-xs text-gray-600">Até:</label>
                                       <input
                                           type="date"
                                           value={calcDateTo}
                                           onChange={(e) => setCalcDateTo(e.target.value)}
                                           className="w-full p-2 border border-gray-300 rounded text-sm"
                                       />
                                   </div>
                               </div>
                               <div className="mb-2">
                                   <label className="text-xs text-gray-600">Valor Diário (€): <span className="text-amber-600">(auto-calculado do agendamento)</span></label>
                                   <input
                                       type="number"
                                       step="0.01"
                                       value={calcDailyValue}
                                       onChange={(e) => setCalcDailyValue(parseFloat(e.target.value) || 0)}
                                       className="w-full p-2 border border-gray-300 rounded text-sm font-bold"
                                   />
                               </div>
                               <button
                                   type="button"
                                   onClick={handleCalculateDebt}
                                   className="w-full bg-amber-600 hover:bg-amber-700 text-white p-2 rounded-lg flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                                   title="Calcular dívida baseada no período selecionado"
                               >
                                   <Calculator size={18} />
                                   <span className="text-sm font-bold">Calcular Papel</span>
                               </button>
                           </div>
                       )}
                       
                       <div className="flex gap-2 items-center">
                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xl font-bold">€</span>
                                <input 
                                    type="number"
                                    step="0.01"
                                    className="w-full p-3 pl-8 border-2 border-gray-300 rounded-lg bg-white text-gray-900 text-2xl font-bold tracking-tight"
                                    value={clientForm.currentBalance}
                                    onChange={e => setClientForm({...clientForm, currentBalance: parseFloat(e.target.value)})}
                                />
                            </div>
                       </div>

                       {/* Calculation Breakdown Preview */}
                       {calculatedTotal !== null && (
                           <div className="mt-2 bg-green-50 p-3 rounded border border-green-200 text-sm">
                               <p className="font-semibold text-green-800 mb-1 flex items-center gap-2">
                                   <CheckCircle size={14} />
                                   Cálculo Realizado com Sucesso
                               </p>
                               <p className="text-green-700">
                                   Período: <span className="font-bold">{calcDateFrom}</span> até <span className="font-bold">{calcDateTo}</span>
                               </p>
                               <p className="text-green-800 font-bold mt-1 text-lg">
                                   {calculatedDays} dias × €{calcDailyValue.toFixed(2)}/dia = €{calculatedTotal.toFixed(2)}
                               </p>
                           </div>
                       )}

                       <button
                            type="button"
                            onClick={handleConfirmPayment}
                            disabled={!editingClientId || clientForm.currentBalance <= 0}
                            className="w-full mt-3 py-2 bg-green-600 disabled:bg-gray-300 text-white rounded-lg font-bold shadow hover:bg-green-700 transition-colors flex justify-center items-center gap-2"
                        >
                            <CreditCard size={18} />
                            Confirmar Recebimento (Zerar Dívida)
                        </button>

                       {/* Botão de Enviar Mensagem WhatsApp */}
                       <button
                            type="button"
                            onClick={handleSendPaymentMessage}
                            disabled={!editingClientId || !clientForm.phone}
                            className="w-full mt-2 py-2 bg-green-500 disabled:bg-gray-300 text-white rounded-lg font-bold shadow hover:bg-green-600 transition-colors flex justify-center items-center gap-2"
                            title="Enviar resumo de pagamento via WhatsApp"
                        >
                            <MessageCircle size={18} />
                            Enviar Cobrança via WhatsApp
                        </button>

                       {/* Botão de Enviar SMS */}
                       <button
                            type="button"
                            onClick={handleSendSMS}
                            disabled={!editingClientId || !clientForm.phone}
                            className="w-full mt-2 py-2 bg-blue-500 disabled:bg-gray-300 text-white rounded-lg font-bold shadow hover:bg-blue-600 transition-colors flex justify-center items-center gap-2"
                            title="Enviar resumo de pagamento via SMS"
                        >
                            <Smartphone size={18} />
                            Enviar Cobrança via SMS
                        </button>
                    </div>

                    {/* Checkboxes Options */}
                    <div className="space-y-3 pt-4 border-t border-gray-100">
                        <label className={`flex items-center space-x-3 p-3 border rounded-lg transition-colors cursor-pointer ${clientForm.leaveReceipt ? 'bg-amber-50 border-amber-200' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                            checked={clientForm.leaveReceipt || false}
                            onChange={e => setClientForm({...clientForm, leaveReceipt: e.target.checked})}
                          />
                          <div className="flex flex-col">
                             <div className="flex items-center space-x-2">
                                <FileText size={18} className={clientForm.leaveReceipt ? "text-amber-600" : "text-gray-500"}/>
                                <span className={`font-medium ${clientForm.leaveReceipt ? "text-amber-800" : "text-gray-700"}`}>Precisa deixar papel (Talão)?</span>
                             </div>
                             {clientForm.leaveReceipt && <span className="text-xs text-amber-600 pl-7">O sistema calculará o valor automaticamente.</span>}
                          </div>
                        </label>

                        <label className={`flex items-center space-x-3 p-3 border rounded-lg transition-colors cursor-pointer ${clientForm.acceptsReturns ? 'bg-amber-50 border-amber-200' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                            checked={clientForm.acceptsReturns || false}
                            onChange={e => setClientForm({...clientForm, acceptsReturns: e.target.checked})}
                          />
                          <div className="flex items-center space-x-2">
                             <RotateCcw size={18} className="text-gray-500"/>
                             <span className="text-gray-700 font-medium">Aceita Devolução de Sobras?</span>
                          </div>
                        </label>
                    </div>

                  </div>
                )}
                
                {activeTab === 'falhas' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                            <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                                <AlertCircle size={18} />
                                Registrar Falha de Entrega
                            </h4>
                            <p className="text-sm text-red-700 mb-4">
                                Marque os dias em que o cliente <strong>NÃO</strong> recebeu pão (ex: viajou, cancelou). 
                                Estes dias serão descontados automaticamente do cálculo do pagamento.
                            </p>
                            
                            <div className="flex gap-2 items-center">
                                <input 
                                    type="date" 
                                    className="p-2 border border-red-200 rounded bg-white text-gray-800"
                                    onChange={(e) => {
                                        if (e.target.value) handleToggleSkippedDate(e.target.value);
                                    }}
                                />
                                <span className="text-xs text-gray-500">Selecione para alternar (Falta / Normal)</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h5 className="font-semibold text-gray-700 text-sm">Histórico de Falhas (Dias descontados):</h5>
                            {clientForm.skippedDates && clientForm.skippedDates.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {clientForm.skippedDates.map(date => (
                                      <span key={date} className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded text-xs">
                                        {new Date(date).toLocaleDateString()}
                                        <button 
                                            type="button" 
                                            onClick={() => handleToggleSkippedDate(date)} 
                                            className="hover:text-red-950"
                                        >
                                            <X size={12} />
                                        </button>
                                      </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 italic">Nenhuma falha registrada recentemente.</p>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'precos' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                     <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 flex items-start gap-3">
                        <Tag className="text-amber-600 mt-0.5" size={20} />
                        <div>
                           <h4 className="font-bold text-amber-800">Preços Personalizados</h4>
                           <p className="text-sm text-amber-700">Como administrador, você pode definir preços específicos para este cliente. Caso contrário, será usado o preço padrão do produto.</p>
                        </div>
                     </div>

                     <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                        <table className="w-full text-sm text-left">
                           <thead className="bg-gray-50 text-gray-600 font-semibold uppercase">
                              <tr>
                                 <th className="p-3 border-b">Produto</th>
                                 <th className="p-3 border-b text-right">Preço Padrão</th>
                                 <th className="p-3 border-b text-right">Preço Cliente</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-100">
                              {products.map(product => {
                                 const hasCustomPrice = clientForm.customPrices && clientForm.customPrices[product.id] !== undefined;
                                 return (
                                    <tr key={product.id} className="hover:bg-gray-50">
                                       <td className="p-3 text-gray-800 font-medium">{product.name}</td>
                                       <td className="p-3 text-right text-gray-500">€ {product.price.toFixed(2)}</td>
                                       <td className="p-3 text-right">
                                          <div className="flex items-center justify-end gap-2">
                                             <span className="text-gray-400">€</span>
                                             <input 
                                                type="number" 
                                                step="0.01"
                                                min="0"
                                                placeholder={product.price.toFixed(2)}
                                                className={`w-24 p-1 border rounded text-right font-bold focus:ring-2 focus:ring-amber-500 outline-none ${hasCustomPrice ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-300 text-gray-700'}`}
                                                value={clientForm.customPrices?.[product.id] ?? ''}
                                                onChange={(e) => handleUpdatePrice(product.id, e.target.value)}
                                             />
                                          </div>
                                       </td>
                                    </tr>
                                 )
                              })}
                           </tbody>
                        </table>
                     </div>
                  </div>
                )}

                   {activeTab === 'obs' && (
                     <div>
                       <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Obs</label>
                       <textarea rows={5} className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-gray-900" 
                         value={clientForm.notes} onChange={e => setClientForm({...clientForm, notes: e.target.value})} />
                     </div>
                   )}
                 </form>
                 {/* Footer do modal */}
                 <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3 rounded-b-xl">
                   <button type="button" onClick={() => setIsClientModalOpen(false)} className="px-5 py-2.5 text-gray-600 hover:bg-white rounded-lg border border-transparent hover:border-gray-300">Cancelar</button>
                   <button type="submit" form="admin-client-form" className="px-5 py-2.5 bg-amber-700 text-white rounded-lg hover:bg-amber-800 shadow">Salvar</button>
                 </div>
               </div>
             </div>
           </div>
         )}
       </div>
     );
};

// ============================================
// ROUTE PRICE EDITOR - Edição de preços por rota
// ============================================
export const RoutePriceEditor: React.FC = () => {
  const { routes, products, clients, getDrivers, updatePricesForRoute } = useData();
  const { currentUser } = useAuth();
  const drivers = getDrivers();

  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [routePrices, setRoutePrices] = useState<Record<string, string>>({});
  const [isApplying, setIsApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ success: number; failed: number } | null>(null);

  // Rotas disponíveis para o entregador selecionado
  const availableRoutes = selectedDriverId 
    ? routes.filter(r => r.driverId === selectedDriverId)
    : routes;

  // Clientes na rota selecionada
  const clientsInRoute = selectedRouteId
    ? clients.filter(c => c.routeId === selectedRouteId && c.status === 'ACTIVE')
    : [];

  // Quando muda a rota, carrega os preços atuais (pega do primeiro cliente como referência)
  const handleRouteChange = (routeId: string) => {
    setSelectedRouteId(routeId);
    setApplyResult(null);
    
    if (routeId) {
      const firstClient = clients.find(c => c.routeId === routeId && c.status === 'ACTIVE');
      if (firstClient && firstClient.customPrices) {
        const prices: Record<string, string> = {};
        for (const [productId, price] of Object.entries(firstClient.customPrices)) {
          prices[productId] = (price as number).toFixed(2);
        }
        setRoutePrices(prices);
      } else {
        setRoutePrices({});
      }
    } else {
      setRoutePrices({});
    }
  };

  // Atualiza preço de um produto
  const handlePriceChange = (productId: string, value: string) => {
    setRoutePrices(prev => ({
      ...prev,
      [productId]: value
    }));
  };

  // Aplica os preços a todos os clientes da rota
  const handleApplyPrices = async () => {
    if (!selectedRouteId || !currentUser) return;

    setIsApplying(true);
    setApplyResult(null);

    try {
      // Converte strings para números, ignora campos vazios
      const pricesToApply: Record<string, number> = {};
      for (const [productId, priceStr] of Object.entries(routePrices)) {
        const price = parseFloat(priceStr as string);
        if (!isNaN(price) && price >= 0) {
          pricesToApply[productId] = price;
        }
      }

      const result = await updatePricesForRoute(selectedRouteId, pricesToApply, currentUser.role);
      setApplyResult(result);
    } catch (error) {
      console.error('Erro ao aplicar preços:', error);
      setApplyResult({ success: 0, failed: clientsInRoute.length });
    } finally {
      setIsApplying(false);
    }
  };

  // Limpa preços personalizados
  const handleClearPrice = (productId: string) => {
    setRoutePrices(prev => {
      const newPrices = { ...prev };
      delete newPrices[productId];
      return newPrices;
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Tag className="text-amber-600" />
            Preços por Rota
          </h2>
          <p className="text-gray-500 text-sm">Defina preços personalizados para todos os clientes de uma rota de uma vez.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Entregador</label>
            <select 
              className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 font-medium focus:ring-2 focus:ring-amber-500 outline-none"
              value={selectedDriverId}
              onChange={(e) => {
                setSelectedDriverId(e.target.value);
                setSelectedRouteId('');
                setRoutePrices({});
                setApplyResult(null);
              }}
            >
              <option value="">Todos os Entregadores</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Rota / Zona</label>
            <select 
              className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 font-medium focus:ring-2 focus:ring-amber-500 outline-none disabled:opacity-50"
              value={selectedRouteId}
              onChange={(e) => handleRouteChange(e.target.value)}
              disabled={availableRoutes.length === 0}
            >
              <option value="">Selecione uma rota...</option>
              {availableRoutes.map(r => {
                const clientCount = clients.filter(c => c.routeId === r.id && c.status === 'ACTIVE').length;
                return (
                  <option key={r.id} value={r.id}>
                    {r.name} ({clientCount} clientes)
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {availableRoutes.length === 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              {selectedDriverId 
                ? 'Este entregador não possui rotas cadastradas.'
                : 'Não há rotas cadastradas no sistema.'}
            </p>
          </div>
        )}
      </div>

      {/* Price Editor */}
      {selectedRouteId && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-amber-50 border-b border-amber-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-amber-800">
                  {availableRoutes.find(r => r.id === selectedRouteId)?.name}
                </h3>
                <p className="text-sm text-amber-700">
                  {clientsInRoute.length} cliente{clientsInRoute.length !== 1 ? 's' : ''} ativo{clientsInRoute.length !== 1 ? 's' : ''} nesta rota
                </p>
              </div>
              <button
                onClick={handleApplyPrices}
                disabled={isApplying || clientsInRoute.length === 0 || Object.keys(routePrices).length === 0}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 text-white font-bold rounded-lg shadow transition-all flex items-center gap-2"
              >
                {isApplying ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Aplicando...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Aplicar a Todos
                  </>
                )}
              </button>
            </div>

            {/* Result message */}
            {applyResult && (
              <div className={`mt-3 p-3 rounded-lg ${applyResult.failed === 0 ? 'bg-green-100 border border-green-200' : 'bg-yellow-100 border border-yellow-200'}`}>
                <p className={`text-sm font-medium ${applyResult.failed === 0 ? 'text-green-800' : 'text-yellow-800'}`}>
                  {applyResult.failed === 0 ? (
                    <>
                      <CheckCircle size={14} className="inline mr-1" />
                      Preços aplicados com sucesso a {applyResult.success} cliente{applyResult.success !== 1 ? 's' : ''}!
                    </>
                  ) : (
                    <>
                      <AlertCircle size={14} className="inline mr-1" />
                      {applyResult.success} atualizado{applyResult.success !== 1 ? 's' : ''}, {applyResult.failed} falha{applyResult.failed !== 1 ? 's' : ''}.
                    </>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Products Table */}
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-xs">
              <tr>
                <th className="p-4 border-b">Produto</th>
                <th className="p-4 border-b text-right">Preço Padrão</th>
                <th className="p-4 border-b text-right">Preço Rota</th>
                <th className="p-4 border-b text-center w-20">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map(product => {
                const hasCustomPrice = routePrices[product.id] !== undefined && routePrices[product.id] !== '';
                return (
                  <tr key={product.id} className={`hover:bg-gray-50 transition-colors ${hasCustomPrice ? 'bg-amber-50/30' : ''}`}>
                    <td className="p-4">
                      <span className="font-medium text-gray-800">{product.name}</span>
                    </td>
                    <td className="p-4 text-right text-gray-500">
                      € {product.price.toFixed(2)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-gray-400">€</span>
                        <input 
                          type="number" 
                          step="0.01"
                          min="0"
                          placeholder={product.price.toFixed(2)}
                          className={`w-28 p-2 border rounded-lg text-right font-bold focus:ring-2 focus:ring-amber-500 outline-none ${
                            hasCustomPrice 
                              ? 'border-amber-400 bg-amber-50 text-amber-800' 
                              : 'border-gray-300 text-gray-700'
                          }`}
                          value={routePrices[product.id] ?? ''}
                          onChange={(e) => handlePriceChange(product.id, e.target.value)}
                        />
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {hasCustomPrice && (
                        <button
                          onClick={() => handleClearPrice(product.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Limpar preço personalizado"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Clients Preview */}
          {clientsInRoute.length > 0 && (
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Clientes que serão atualizados:</h4>
              <div className="flex flex-wrap gap-2">
                {clientsInRoute.map(client => (
                  <span 
                    key={client.id}
                    className="inline-flex items-center px-2.5 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-700"
                  >
                    {client.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No route selected message */}
      {!selectedRouteId && availableRoutes.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <MapPin size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Selecione uma rota para editar os preços</p>
          <p className="text-gray-400 text-sm mt-1">Os preços serão aplicados a todos os clientes ativos da rota selecionada.</p>
        </div>
      )}
    </div>
  );
};
