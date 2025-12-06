import { getAuth } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, createDriverFunction, deleteDriverFunction } from "../firebaseConfig";

import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { User, UserRole, Client, Product, Route, DeliverySchedule } from '../types';
import { ChevronDown, ChevronRight, UserPlus, MapPin, Phone, Truck, Calendar, Package, Pencil, Trash2, Plus, ArrowRightLeft, X, Save, Navigation, Map, Search, User as UserIcon, CreditCard, FileText, RotateCcw, Loader2, AlertCircle, Calculator, CheckCircle, DollarSign, Tag } from 'lucide-react';

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

  // Função para garantir que entregador registrado no Auth também tenha documento correto no Firestore
  const syncDriverToFirestore = async () => {
    try {
      const email = prompt("Digite o email do entregador já registrado no Auth:");
      if (!email) return;
      const uid = prompt("Digite o UID do entregador (veja no Firebase Console > Authentication):");
      if (!uid) return;
      
      const name = prompt("Digite o nome do entregador:", email.split("@")[0]);
      if (!name) return;
      
      const userDocRef = doc(db, "users", uid);
      // Sempre cria/atualiza documento com role DRIVER (string)
      await setDoc(userDocRef, {
        id: uid,
        name: name,
        email: email,
        role: "DRIVER"  // Usando string diretamente para evitar problemas
      });
      alert(`Entregador "${name}" sincronizado com sucesso!\n\nUID: ${uid}\nEmail: ${email}`);
    } catch (err: unknown) {
      console.error("Erro ao sincronizar:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert(`Erro ao sincronizar entregador:\n${errorMsg}\n\nVerifique se o UID está correto.`);
    }
  };
  const drivers = getDrivers();
  // Debug helpers: count and invalid roles
  const totalDrivers = drivers.length;
  const [invalidUsersCount, setInvalidUsersCount] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [manualCheckResult, setManualCheckResult] = useState<string>('');
  const [usersDebugInfo, setUsersDebugInfo] = useState<string>('');
  const TEST_UID = 'NB3hLfp3gtfnXNjW9alglW5FK4D2';
  const [expandedDriverId, setExpandedDriverId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverEmail, setNewDriverEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingDriverId, setDeletingDriverId] = useState<string | null>(null);

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

  // Compute invalid users count from full users list via a quick fetch in DataContext scope
  // As we only have drivers here, invalid roles won't be present; provide a manual check utility.
  const checkInvalidRoles = async () => {
    try {
      setLoading(true);
      setError('');
      // Manual scan: read all users and count invalid roles
      // Import Firestore helpers locally to avoid changing DataContext
      const { collection, getDocs } = await import('firebase/firestore');
      const { db } = await import('../firebaseConfig');
      const snap = await getDocs(collection(db, 'users'));
      let invalid = 0;
      snap.forEach(docSnap => {
        const data = docSnap.data() as any;
        const roleStr = String(data.role || '').toUpperCase();
        if (roleStr !== 'DRIVER' && roleStr !== 'ADMIN') invalid++;
      });
      setInvalidUsersCount(invalid);
    } catch (e) {
      setError('Falha ao verificar roles dos usuários.');
    } finally {
      setLoading(false);
    }
  };

  const validateFirebaseConnection = async () => {
    try {
      setLoading(true);
      setError('');
      setConnectionStatus('');
      const { auth, db } = await import('../firebaseConfig');
      const config = (auth.app.options || {}) as any;
      setConnectionStatus(`projectId=${config.projectId} | apiKey=${config.apiKey?.slice(0,6)}... | authDomain=${config.authDomain} | appId=${config.appId?.slice(0,8)}... | storageBucket=${config.storageBucket}`);
      // Manual read from users: known UID if provided
      const { doc, getDoc } = await import('firebase/firestore');
      const ref = doc(db, 'users', TEST_UID);
      const userDoc = await getDoc(ref);
      if (userDoc.exists()) {
        const u = userDoc.data() as any;
        setManualCheckResult(`Encontrado: name=${u.name} | email=${u.email} | role=${u.role}`);
      } else {
        setManualCheckResult('Documento não encontrado neste projeto.');
      }
    } catch (e) {
      setError('Erro ao validar conexão/ler documento.');
    } finally {
      setLoading(false);
    }
  };

  const debugListUsers = async () => {
    try {
      setLoading(true);
      setError('');
      setUsersDebugInfo('');
      const { collection, getDocs } = await import('firebase/firestore');
      const { db } = await import('../firebaseConfig');
      const snap = await getDocs(collection(db, 'users'));
      const count = snap.size;
      let example = '';
      snap.forEach(docSnap => {
        if (!example) {
          const d = docSnap.data() as any;
          example = `exemplo -> id=${docSnap.id} | name=${d.name} | email=${d.email} | role=${d.role}`;
        }
      });
      setUsersDebugInfo(`users=${count} ${example ? '| ' + example : ''}`);
    } catch (e) {
      setError('Falha ao listar usuários.');
    } finally {
      setLoading(false);
    }
  };

  // Execução automática: valida conexão e tenta ler o documento do Natan
  React.useEffect(() => {
    validateFirebaseConnection();
    checkInvalidRoles();
  }, []);

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
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm text-gray-600">
          <span className="font-semibold">{totalDrivers}</span> entregadores carregados
          {invalidUsersCount > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-red-700 bg-red-100 px-2 py-0.5 rounded text-xs">
              <AlertCircle size={14} /> {invalidUsersCount} usuário(s) com role inválido
            </span>
          )}
          {connectionStatus && (
            <div className="mt-1 text-xs text-gray-500">Conexão: {connectionStatus}</div>
          )}
          {manualCheckResult && (
            <div className="mt-1 text-xs text-gray-700">Checagem: {manualCheckResult}</div>
          )}
        </div>
        <button
          onClick={syncDriverToFirestore}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors shadow"
        >
          <span>Sincronizar entregador do Auth</span>
        </button>
      </div>
      <div className="flex gap-2">
        <button onClick={validateFirebaseConnection} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded border">Validar Conexão</button>
        <button onClick={checkInvalidRoles} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded border">Verificar Roles</button>
        <button onClick={debugListUsers} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded border">Listar Users</button>
      </div>
      {usersDebugInfo && (
        <div className="mt-2 text-xs text-gray-700">Diag users: {usersDebugInfo}</div>
      )}
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
                  </div>
                </button>
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium bg-gray-100 px-3 py-1 rounded-full text-gray-600">
                    {clients.length} Clientes
                  </span>
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
    // Quebra can be negative if data is inconsistent, but practically we sum positive losses or net
    // Formula from image: Quebra = Produção - (Vendido + Sobra)
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
  const [searchTerm, setSearchTerm] = useState('');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'geral' | 'entrega' | 'pagamento' | 'obs' | 'falhas' | 'precos'>('geral');
  const [isLocating, setIsLocating] = useState(false);
  
  // States for Payment Calculation (Admin)
  const [calculatedTotal, setCalculatedTotal] = useState<number | null>(null);
  const [calculatedDays, setCalculatedDays] = useState<number>(0);

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

  // Computed
  const filteredClients = clients.filter(c => {
    const matchesDriver = selectedDriverId === 'all' || c.driverId === selectedDriverId;
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.address.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDriver && matchesSearch;
  });

  // Entregador vê só suas rotas, admin vê todas
  // Removido duplicidade de isAdmin e routes
  const availableRoutes = isAdmin
    ? routes
    : currentUser?.id
      ? getRoutesByDriver(currentUser.id)
      : [];

  const handleOpenClientModal = (client?: Client) => {
    setCalculatedTotal(null); // Reset
    if (client) {
      setEditingClientId(client.id);
      setClientForm({ ...client, deliverySchedule: client.deliverySchedule || {}, customPrices: client.customPrices || {} });
      // If editing, temporarily select the driver of this client to show correct routes in dropdown
      // (Optional UX choice, or we just show routes for the client's driver)
    } else {
      setEditingClientId(null);
      setClientForm({ 
        ...initialClientState, 
        driverId: selectedDriverId !== 'all' ? selectedDriverId : drivers[0]?.id 
      });
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

      const { total, daysCount } = calculateClientDebt(tempClient);
      setCalculatedTotal(total);
      setCalculatedDays(daysCount);
      setClientForm(prev => ({ ...prev, currentBalance: parseFloat(total.toFixed(2)) }));
  };

  const handleConfirmPayment = () => {
    if (editingClientId && calculatedTotal !== null) {
        registerPayment(editingClientId, calculatedTotal, 'Dinheiro');
        setClientForm(prev => ({ ...prev, currentBalance: 0 }));
        setCalculatedTotal(0);
        alert("Pagamento registrado com sucesso!");
    }
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
              onChange={(e) => setSelectedDriverId(e.target.value)}
            >
              <option value="all">Todos os Entregadores</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
         </div>
         <div className="flex-[2]">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Buscar Cliente</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Nome, Endereço..."
                className="w-full pl-10 p-2 border border-gray-200 rounded-lg bg-gray-50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
                    {client.routeId && <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Rota ID: {client.routeId.slice(-4)}</span>}
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
                       
                       <div className="flex gap-2 items-center">
                            <input 
                                type="number"
                                step="0.01"
                                className="flex-1 p-3 border-2 border-gray-300 rounded-lg bg-white text-gray-900 text-2xl font-bold tracking-tight"
                                value={clientForm.currentBalance}
                                onChange={e => setClientForm({...clientForm, currentBalance: parseFloat(e.target.value)})}
                            />
                            {clientForm.leaveReceipt && (
                                <button
                                    type="button"
                                    onClick={handleCalculateDebt}
                                    className="bg-amber-600 hover:bg-amber-700 text-white p-3 rounded-lg flex items-center gap-2 shadow-md transition-all active:scale-95"
                                    title="Calcular dívida baseada no histórico"
                                >
                                    <Calculator size={24} />
                                    <span className="text-sm font-bold leading-tight hidden sm:block">Calcular<br/>Papel</span>
                                </button>
                            )}
                       </div>

                       {/* Calculation Breakdown Preview */}
                       {calculatedTotal !== null && (
                           <div className="mt-2 bg-green-50 p-3 rounded border border-green-200 text-sm">
                               <p className="font-semibold text-green-800 mb-1 flex items-center gap-2">
                                   <CheckCircle size={14} />
                                   Cálculo Realizado com Sucesso
                               </p>
                               <p className="text-green-700">
                                   Período: <span className="font-bold">{clientForm.lastPaymentDate ? new Date(clientForm.lastPaymentDate).toLocaleDateString() : 'Início'}</span> até <span className="font-bold">Hoje</span>
                               </p>
                               <p className="text-green-700">
                                   Dias de entrega: <span className="font-bold">{calculatedDays}</span> (descontando falhas)
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
