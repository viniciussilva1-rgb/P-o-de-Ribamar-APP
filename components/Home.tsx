import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Clock3, LogIn, Mail, MapPin, Phone, Truck } from 'lucide-react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import '../styles/HomeStyles.css';

interface Bread {
  id: string;
  homeDocId?: string;
  productId?: string;
  sortOrder?: number;
  name: string;
  description: string;
  image: string;
  price: string;
}

interface ProductDoc {
  id: string;
  name: string;
  price: number;
}

interface HomeProductDoc {
  id: string;
  productId?: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  priceSnapshot?: number;
  price?: number;
  active?: boolean;
  sortOrder?: number;
}

interface HomeContent {
  heroKicker: string;
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  catalogTitle: string;
  catalogSubtitle: string;
}

const defaultHomeContent: HomeContent = {
  heroKicker: 'Padaria artesanal premium',
  heroTitle: 'Pao quente, entrega profissional e experiencia premium a porta.',
  heroSubtitle: 'Produzimos diariamente com fermentacao cuidada e entrega matinal em janelas previsiveis.',
  heroDescription: 'A home foi desenhada para transmitir confianca: fotos reais, linguagem clara, foco em servico e disponibilidade por zona.',
  catalogTitle: 'Selecao de Paes',
  catalogSubtitle: 'Catalogo informativo com os produtos disponiveis e respetivo preco unitario.',
};

const fallbackBreads: Bread[] = [
  {
    id: '1',
    name: 'Bolinha',
    description: 'Pao leve e macio, ideal para consumo diario.',
    image: '/produtos/bolinha.jpg',
    price: 'EUR 0,40',
  },
  {
    id: '2',
    name: 'Baguete Artesanal',
    description: 'Assada em alta temperatura para manter textura leve por dentro e dourado por fora.',
    image: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=1400&q=80',
    price: 'EUR 2,20',
  },
  {
    id: '3',
    name: 'Pao de Forma Integral',
    description: 'Feito com blend de farinhas integrais selecionadas e fermentacao lenta.',
    image: 'https://images.unsplash.com/photo-1483695028939-5bb13f8648b0?auto=format&fit=crop&w=1400&q=80',
    price: 'EUR 4,60',
  },
  {
    id: '4',
    name: 'Croissant de Manteiga',
    description: 'Folhado delicado com manteiga premium, ideal para cafe da manha ou brunch.',
    image: 'https://images.unsplash.com/photo-1555507036-ab794f4afe5a?auto=format&fit=crop&w=1400&q=80',
    price: 'EUR 2,80',
  },
];

interface HomeProps {
  onLoginClick?: () => void;
  isPreviewMode?: boolean;
}

const Home: React.FC<HomeProps> = ({ onLoginClick, isPreviewMode = false }) => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [address, setAddress] = useState('');
  const [availabilityResult, setAvailabilityResult] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const [products, setProducts] = useState<ProductDoc[]>([]);
  const [homeProductsConfig, setHomeProductsConfig] = useState<HomeProductDoc[]>([]);
  const [homeContent, setHomeContent] = useState<HomeContent>(defaultHomeContent);
  const [isCardEditOpen, setIsCardEditOpen] = useState(false);
  const [editingBread, setEditingBread] = useState<Bread | null>(null);
  const [editCardName, setEditCardName] = useState('');
  const [editCardDescription, setEditCardDescription] = useState('');
  const [editCardImageUrl, setEditCardImageUrl] = useState('');
  const [editCardImageFile, setEditCardImageFile] = useState<File | null>(null);
  const [savingCardEdit, setSavingCardEdit] = useState(false);

  const formatPrice = (value: number) => `EUR ${value.toFixed(2).replace('.', ',')}`;

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const compressImage = async (file: File): Promise<string> => {
    const dataUrl = await fileToDataUrl(file);

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = dataUrl;
    });

    const maxWidth = 1200;
    const ratio = img.width > maxWidth ? maxWidth / img.width : 1;
    const width = Math.round(img.width * ratio);
    const height = Math.round(img.height * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return dataUrl;
    }

    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.82);
  };

  const openCardEditor = (bread: Bread) => {
    setEditingBread(bread);
    setEditCardName(bread.name);
    setEditCardDescription(bread.description);
    setEditCardImageUrl(bread.image);
    setEditCardImageFile(null);
    setIsCardEditOpen(true);
  };

  const handleSaveCardEdit = async () => {
    if (!editingBread) return;

    setSavingCardEdit(true);
    try {
      let imageUrl = editCardImageUrl.trim();
      if (editCardImageFile) {
        imageUrl = await compressImage(editCardImageFile);
      }

      const existingConfig = homeProductsConfig.find((item) => item.id === editingBread.homeDocId)
        || homeProductsConfig.find((item) => item.productId === editingBread.productId);

      const docId = existingConfig?.id || editingBread.homeDocId || `home-${editingBread.productId || Date.now()}`;
      const resolvedProductId = editingBread.productId || existingConfig?.productId || editingBread.id;

      const payload: Record<string, unknown> = {
        productId: resolvedProductId,
        name: editCardName.trim(),
        description: editCardDescription.trim(),
        imageUrl,
        active: true,
        sortOrder: existingConfig?.sortOrder ?? editingBread.sortOrder ?? 9999,
        updatedAt: new Date().toISOString(),
      };

      if (!existingConfig) {
        payload.createdAt = new Date().toISOString();
      }

      await setDoc(doc(db, 'home_products', docId), payload, { merge: true });

      setIsCardEditOpen(false);
      setEditingBread(null);
      setEditCardImageFile(null);
    } catch (error) {
      console.error('Erro ao salvar edicao do card:', error);
      alert('Nao foi possivel salvar a edicao deste produto.');
    } finally {
      setSavingCardEdit(false);
    }
  };

  useEffect(() => {
    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const list = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Partial<ProductDoc>;
        return {
          id: String(data.id || docSnap.id),
          name: String(data.name || 'Produto'),
          price: Number(data.price) || 0,
        };
      });

      setProducts(list);
    });

    const unsubscribeHomeProducts = onSnapshot(collection(db, 'home_products'), (snapshot) => {
      const list = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Partial<HomeProductDoc>;
        return {
          id: docSnap.id,
          productId: data.productId,
          name: data.name,
          description: data.description,
          imageUrl: data.imageUrl,
          priceSnapshot: data.priceSnapshot,
          price: data.price,
          active: data.active !== false,
          sortOrder: Number(data.sortOrder) || 9999,
        };
      });

      setHomeProductsConfig(list);
    });

    const unsubscribeHomeContent = onSnapshot(doc(db, 'home_content', 'main'), (docSnap) => {
      if (!docSnap.exists()) {
        setHomeContent(defaultHomeContent);
        return;
      }

      const data = docSnap.data() as Partial<HomeContent>;
      setHomeContent({
        heroKicker: data.heroKicker || defaultHomeContent.heroKicker,
        heroTitle: data.heroTitle || defaultHomeContent.heroTitle,
        heroSubtitle: data.heroSubtitle || defaultHomeContent.heroSubtitle,
        heroDescription: data.heroDescription || defaultHomeContent.heroDescription,
        catalogTitle: data.catalogTitle || defaultHomeContent.catalogTitle,
        catalogSubtitle: data.catalogSubtitle || defaultHomeContent.catalogSubtitle,
      });
    });

    return () => {
      unsubscribeProducts();
      unsubscribeHomeProducts();
      unsubscribeHomeContent();
    };
  }, []);

  const breads = useMemo(() => {
    if (homeProductsConfig.length > 0) {
      const normalizedProductsMap = new Map(products.map((p) => [p.id, p]));

      const merged = homeProductsConfig
        .filter((item) => item.active !== false)
        .map((item) => {
          const productById = item.productId ? normalizedProductsMap.get(item.productId) : undefined;
          const productByName = !productById && item.name
            ? products.find((p) => p.name.trim().toLowerCase() === item.name?.trim().toLowerCase())
            : undefined;

          const product = productById || productByName;
          const name = item.name?.trim() || product?.name || 'Produto';
          const price = product
            ? product.price
            : (Number(item.priceSnapshot) || Number(item.price) || 0);

          return {
            id: item.id,
            sortOrder: Number(item.sortOrder) || 9999,
            card: {
              id: item.id,
              homeDocId: item.id,
              productId: product?.id || item.productId,
              sortOrder: Number(item.sortOrder) || 9999,
              name,
              description: item.description || 'Produto disponivel no catalogo da padaria.',
              image: item.imageUrl || 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1400&q=80',
              price: formatPrice(price),
            } as Bread,
          };
        })
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((entry) => entry.card);

      if (merged.length > 0) {
        return merged;
      }
    }

    if (products.length > 0) {
      return products.slice(0, 8).map((p) => ({
        id: p.id,
        productId: p.id,
        sortOrder: 9999,
        name: p.name,
        description: 'Produto disponivel no catalogo da padaria.',
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1400&q=80',
        price: formatPrice(p.price),
      }));
    }

    return fallbackBreads;
  }, [homeProductsConfig, products]);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const contactText = [
      'Novo pedido de contacto - Padaria Ribamar',
      '',
      `Nome: ${formData.name}`,
      `Email: ${formData.email}`,
      `Mensagem: ${formData.message}`,
    ].join('\n');

    const encodedText = encodeURIComponent(contactText);
    const encodedSubject = encodeURIComponent('Pedido de contacto - Padaria Ribamar');

    const mailtoUrl = `mailto:tiagoalexandrejose@gmail.com?subject=${encodedSubject}&body=${encodedText}`;
    const whatsappJoao = `https://wa.me/351919672252?text=${encodedText}`;
    const whatsappTiago = `https://wa.me/351915390476?text=${encodedText}`;

    window.open(whatsappJoao, '_blank', 'noopener,noreferrer');
    window.open(whatsappTiago, '_blank', 'noopener,noreferrer');
    window.location.href = mailtoUrl;

    alert('Pedido de contacto preparado: abrimos WhatsApp para João e Tiago e o seu app de email para envio.');
    setFormData({ name: '', email: '', message: '' });
  };

  const checkAvailability = () => {
    if (address.trim()) {
      const normalizedAddress = address.toLowerCase();

      if (
        normalizedAddress.includes('lourinha') ||
        normalizedAddress.includes('lourinhã') ||
        normalizedAddress.includes('torres vedras') ||
        normalizedAddress.includes('bombarral')
      ) {
        setAvailabilityResult({ text: 'Disponibilidade confirmada: entregamos nesta morada entre 04:00 e 09:00.', kind: 'success' });
      } else {
        setAvailabilityResult({ text: 'De momento entregamos apenas em Lourinhã, Torres Vedras e Bombarral. Fale connosco para validar excecoes.', kind: 'error' });
      }
    } else {
      setAvailabilityResult({ text: 'Informe a sua morada para verificar disponibilidade.', kind: 'error' });
    }
  };

  const handleMakeOrderClick = () => {
    if (onLoginClick) {
      onLoginClick();
    } else {
      // Fallback: reload page or navigate
      window.location.hash = '#login';
    }
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="home-header-content">
          <div className="home-logo">Padaria Ribamar</div>
          <nav className="home-nav-buttons">
            <a href="#catalogo">Catalogo</a>
            <a href="#entrega">Entregas</a>
            <a href="#disponibilidade">Disponibilidade</a>
            <a href="#contato">Contacto</a>
            {!isPreviewMode && (
              <button className="login-button-nav" onClick={handleMakeOrderClick}>
                <LogIn size={18} />
                Login
              </button>
            )}
          </nav>
        </div>
      </header>
      <section className="hero-section">
        <div className="hero-overlay"></div>
        <div className="steam-layer" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div className="hero-content">
          <div className="hero-text">
            <p className="hero-kicker">{homeContent.heroKicker}</p>
            <h1 className="hero-title">{homeContent.heroTitle}</h1>
            <p className="hero-subtitle">{homeContent.heroSubtitle}</p>
            <p className="hero-description">
              {homeContent.heroDescription}
            </p>
            <div className="hero-buttons">
              {!isPreviewMode && (
                <button className="cta-button" onClick={handleMakeOrderClick}>
                  Entrar e Fazer Pedido
                  <ArrowRight size={18} />
                </button>
              )}
              <a href="#catalogo" className="cta-link">Ver catalogo</a>
            </div>
          </div>

          <div className="hero-media">
            <img
              src="https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=1400&q=80"
              alt="Pao artesanal recem assado"
            />
            <div className="hero-media-badge">
              <span>Entrega diaria</span>
              <strong>04:00 - 09:00</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="breads-section" id="catalogo">
        <div className="section-container">
          <h2 className="section-title">{homeContent.catalogTitle}</h2>
          <p className="section-subtitle">{homeContent.catalogSubtitle}</p>

          <div className="breads-grid">
            {breads.map((bread) => (
              <article key={bread.id} className="bread-card">
                <div className="bread-image-wrap">
                  <img
                    src={bread.image}
                    alt={bread.name}
                    className="bread-image"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1400&q=80';
                    }}
                  />
                </div>
                <h3 className="bread-name">{bread.name}</h3>
                <p className="bread-description">{bread.description}</p>
                <div className="bread-footer">
                  <span className="unit-price">Preco unitario</span>
                  <strong>{bread.price}</strong>
                  {isPreviewMode && (
                    <button
                      type="button"
                      className="home-card-edit-btn"
                      onClick={() => openCardEditor(bread)}
                    >
                      Editar
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {isPreviewMode && isCardEditOpen && editingBread && (
        <div className="home-edit-modal-backdrop">
          <div className="home-edit-modal">
            <div className="home-edit-modal-header">
              <h3>Editar Produto na Home</h3>
              <button
                type="button"
                onClick={() => {
                  setIsCardEditOpen(false);
                  setEditingBread(null);
                  setEditCardImageFile(null);
                }}
              >
                Fechar
              </button>
            </div>

            <div className="home-edit-modal-body">
              <label>Nome exibido</label>
              <input
                type="text"
                value={editCardName}
                onChange={(e) => setEditCardName(e.target.value)}
              />

              <label>Descricao</label>
              <textarea
                rows={4}
                value={editCardDescription}
                onChange={(e) => setEditCardDescription(e.target.value)}
              ></textarea>

              <label>Trocar imagem (do seu PC)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setEditCardImageFile(file);
                }}
              />

              <p className="home-edit-modal-tip">O preco continua sincronizado com o produto oficial do sistema.</p>
            </div>

            <div className="home-edit-modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setIsCardEditOpen(false);
                  setEditingBread(null);
                  setEditCardImageFile(null);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primary"
                onClick={handleSaveCardEdit}
                disabled={savingCardEdit}
              >
                {savingCardEdit ? 'Salvando...' : 'Salvar alteracoes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="features-section" id="entrega">
        <div className="section-container">
          <h2 className="section-title">Entrega a Porta com Padrao Profissional</h2>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <Clock3 size={32} />
              </div>
              <h3>Horario previsivel</h3>
              <p>Janelas de entrega definidas para facilitar a sua rotina diaria sem atrasos.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Truck size={32} />
              </div>
              <h3>Entrega na sua porta</h3>
              <p>Logistica dedicada para chegar fresco e no ponto ideal de consumo.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <MapPin size={32} />
              </div>
              <h3>Cobertura por zonas</h3>
              <p>Atendimento por regiao para manter consistencia e qualidade de entrega.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Phone size={32} />
              </div>
              <h3>Suporte rapido</h3>
              <p>Contacto directo para ajustes de pedido, morada e periodicidade.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="availability-section" id="disponibilidade">
        <div className="section-container">
          <h2 className="section-title">Verifique a Disponibilidade da Sua Morada</h2>
          <p className="section-subtitle">Introduza rua e localidade para validacao imediata. Zonas de entrega: Lourinhã, Torres Vedras e Bombarral.</p>

          <div className="availability-form">
            <div className="input-group">
              <input
                type="text"
                placeholder="Ex: Rua das Flores 123, Lisboa"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="availability-input"
              />
              <button onClick={checkAvailability} className="check-button">
                Verificar morada
              </button>
            </div>

            {availabilityResult && (
              <div className={`availability-result ${availabilityResult.kind}`}>
                {availabilityResult.text}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="contact-section" id="contato">
        <div className="section-container">
          <h2 className="section-title">Contacto Comercial</h2>

          <div className="contact-wrapper">
            <div className="contact-info">
              <div className="info-item">
                <Phone size={32} />
                <div>
                  <h3>Telefones</h3>
                  <p>
                    João Pai:{' '}
                    <a className="contact-link" href="https://wa.me/351919672252" target="_blank" rel="noreferrer">
                      919672252
                    </a>
                  </p>
                  <p>
                    Tiago Filho:{' '}
                    <a className="contact-link" href="https://wa.me/351915390476" target="_blank" rel="noreferrer">
                      915390476
                    </a>
                  </p>
                </div>
              </div>

              <div className="info-item">
                <Mail size={32} />
                <div>
                  <h3>Email</h3>
                  <p>
                    <a className="contact-link" href="mailto:tiagoalexandrejose@gmail.com">
                      tiagoalexandrejose@gmail.com
                    </a>
                  </p>
                </div>
              </div>

              <div className="info-item">
                <MapPin size={32} />
                <div>
                  <h3>Base de operacao</h3>
                  <p>Ribamar, Lisboa, Portugal</p>
                </div>
              </div>
            </div>

            <form className="contact-form" onSubmit={handleContactSubmit}>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="O seu nome"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <input
                  type="email"
                  placeholder="O seu email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <textarea
                  placeholder="Descreva a sua necessidade"
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                ></textarea>
              </div>

              <button type="submit" className="submit-button">
                Enviar pedido de contacto
              </button>
            </form>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="section-container">
          <p>&copy; 2026 Padaria Ribamar. Todos os direitos reservados.</p>
          <p>Panificacao artesanal com logistica de entrega dedicada.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
