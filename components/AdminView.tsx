
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

export const ProductCatalog: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    category: 'Panificação',
    price: 0,
    unit: 'unid',
    targetQuantity: 100,
    supportsEmpelo: true
  });

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({ ...product });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        category: 'Panificação',
        price: 0,
        unit: 'unid',
        targetQuantity: 100,
        quantity: 0,
        supportsEmpelo: true
      });
    }
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este produto?')) {
      deleteProduct(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingProduct) {
      updateProduct(editingProduct.id, formData);
    } else {
      const newProduct: Product = {
        id: Date.now().toString(),
        name: formData.name || 'Novo Produto',
        category: formData.category || 'Geral',
        price: Number(formData.price) || 0,
        unit: formData.unit || 'unid',
        targetQuantity: Number(formData.targetQuantity) || 0,
        quantity: 0,
        supportsEmpelo: formData.supportsEmpelo
      };
      addProduct(newProduct);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gerenciar Produtos</h2>
          <p className="text-gray-500">Adicione ou altere os preços dos produtos da padaria.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow transition-colors"
        >
          <Plus size={20} />
          <span>Novo Produto</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
              <tr>
                <th className="p-4 font-bold border-b">Produto</th>
                <th className="p-4 font-bold border-b">Categoria</th>
                <th className="p-4 font-bold border-b">Preço Unitário</th>
                <th className="p-4 font-bold border-b text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map(product => (
                <tr key={product.id} className="hover:bg-amber-50/50 transition-colors">
                  <td className="p-4 font-medium text-gray-800">{product.name}</td>
                  <td className="p-4 text-gray-600">{product.category}</td>
                  <td className="p-4 font-semibold text-gray-900">€ {product.price.toFixed(2)}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => handleOpenModal(product)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    Nenhum produto cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto</label>
                <input 
                  required
                  type="text" 
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-gray-900"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-gray-900"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                  <select 
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-gray-900"
                    value={formData.unit}
                    onChange={e => setFormData({...formData, unit: e.target.value})}
                  >
                    <option value="unid">Unidade</option>
                    <option value="kg">Kg</option>
                    <option value="pct">Pacote</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço (€)</label>
                  <input 
                    required
                    type="number" 
                    step="0.01"
                    min="0"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-gray-900"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Diária</label>
                  <input 
                    required
                    type="number" 
                    min="0"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-gray-900"
                    value={formData.targetQuantity}
                    onChange={e => setFormData({...formData, targetQuantity: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 mt-2">
                <input 
                  type="checkbox" 
                  id="supportsEmpelo"
                  checked={formData.supportsEmpelo}
                  onChange={e => setFormData({...formData, supportsEmpelo: e.target.checked})}
                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="supportsEmpelo" className="text-sm text-gray-700">
                  Aceita contagem por Empelo (30un)?
                </label>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const DriversOverview: React.FC = () => {
  const { getDrivers, getClientsByDriver, addUser } = useData();
  const drivers = getDrivers();
  const [expandedDriverId, setExpandedDriverId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverEmail, setNewDriverEmail] = useState('');

  const toggleDriver = (id: string) => {
    setExpandedDriverId(prev => prev === id ? null : id);
  };

  const handleAddDriver = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: `driver-${Date.now()}`,
      name: newDriverName,
      email: newDriverEmail,
      role: UserRole.DRIVER
    };
    addUser(newUser);
    setIsModalOpen(false);
    setNewDriverName('');
    setNewDriverEmail('');
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

          return (
            <div key={driver.id} className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden">
              <button 
                onClick={() => toggleDriver(driver.id)}
                className="w-full flex items-center justify-between p-4 bg-white hover:bg-orange-50/50 transition-colors text-left"
              >
                <div className="flex items-center space-x-4">
                  <div className="bg-amber-100 p-3 rounded-full">
                    <Truck className="text-amber-700" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{driver.name}</h3>
                    <p className="text-sm text-gray-500">{driver.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium bg-gray-100 px-3 py-1 rounded-full text-gray-600">
                    {clients.length} Clientes
                  </span>
                  {isExpanded ? <ChevronDown className="text-gray-400" /> : <ChevronRight className="text-gray-400" />}
                </div>
              </button>

              {isExpanded && (
                <div className="bg-orange-50/30 p-4 border-t border-amber-100 animate-in slide-in-from-top-2 duration-200">
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Carteira de Clientes</h4>
                  {clients.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {clients.map(client => (
                        <div key={client.id} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                          <div className="font-medium text-gray-800">{client.name}</div>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <MapPin size={12} className="mr-1" />
                            {client.address}
                          </div>
                          <div className="flex items-center text-xs text-gray-500 mt-0.5">
                            <Phone size={12} className="mr-1" />
                            {client.phone}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Nenhum cliente cadastrado para este entregador.</p>
                  )}
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
            <form onSubmit={handleAddDriver} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input required type="text" className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900" value={newDriverName} onChange={e => setNewDriverName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input required type="email" className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900" value={newDriverEmail} onChange={e => setNewDriverEmail(e.target.value)} />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">Criar Conta</button>
              </div>
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
                    value={displayValue === 0 ? '' : displayValue}
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
  const { currentUser } = useAuth();
  const { getAllClients, getDrivers, getRoutesByDriver, updateClient, addClient, addRoute, deleteRoute, updateDailyProduction, products, calculateClientDebt, registerPayment, toggleSkippedDate, updateClientPrice } = useData();
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

  const availableRoutes = selectedDriverId !== 'all' ? getRoutesByDriver(selectedDriverId) : [];

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
              const driverName = drivers.find(d => d.id === client.driverId)?.name || 'Desconhecido';
              return (
                <tr key={client.id} className="hover:bg-amber-50/30 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{client.name}</div>
                    <div className="text-xs text-gray-500">{client.phone}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-gray-800">{driverName}</div>
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
                              onChange={e => setClientForm({...clientForm, driverId: e.target.value, routeId: ''})} // Reset route if driver changes
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
                              disabled={!clientForm.driverId}
                            >
                              <option value="">Padrão (Sem Zona)</option>
                              {clientForm.driverId && getRoutesByDriver(clientForm.driverId).map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                              ))}
                            </select>
                          </div>
                       </div>

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

                        <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
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
                                        <span key={date} className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full flex items-center gap-1 border border-red-200">
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
             </div>

             <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3 rounded-b-xl">
               <button type="button" onClick={() => setIsClientModalOpen(false)} className="px-5 py-2.5 text-gray-600 hover:bg-white rounded-lg border border-transparent hover:border-gray-300">Cancelar</button>
               <button type="submit" form="admin-client-form" className="px-5 py-2.5 bg-amber-700 text-white rounded-lg hover:bg-amber-800 shadow">Salvar</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
