import React, { useState } from 'react';
import { ArrowRight, Clock3, LogIn, Mail, MapPin, Phone, Truck } from 'lucide-react';
import '../styles/HomeStyles.css';

interface Bread {
  id: string;
  name: string;
  description: string;
  image: string;
  price: string;
}

const breads: Bread[] = [
  {
    id: '1',
    name: 'Bolinha',
    description: 'Pao leve e macio, ideal para consumo diario.',
    image: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=1400&q=80',
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
}

const Home: React.FC<HomeProps> = ({ onLoginClick }) => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [address, setAddress] = useState('');
  const [availabilityResult, setAvailabilityResult] = useState<string | null>(null);

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
        setAvailabilityResult('Disponibilidade confirmada: entregamos nesta morada entre 04:00 e 09:00.');
      } else {
        setAvailabilityResult('De momento entregamos apenas em Lourinhã, Torres Vedras e Bombarral. Fale connosco para validar excecoes.');
      }
    } else {
      setAvailabilityResult('Informe a sua morada para verificar disponibilidade.');
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
            <button className="login-button-nav" onClick={handleMakeOrderClick}>
              <LogIn size={18} />
              Login
            </button>
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
            <p className="hero-kicker">Padaria artesanal premium</p>
            <h1 className="hero-title">Pao quente, entrega profissional e experiencia premium a porta.</h1>
            <p className="hero-subtitle">Produzimos diariamente com fermentacao cuidada e entrega matinal em janelas previsiveis.</p>
            <p className="hero-description">
              A home foi desenhada para transmitir confianca: fotos reais, linguagem clara, foco em servico e disponibilidade por zona.
            </p>
            <div className="hero-buttons">
              <button className="cta-button" onClick={handleMakeOrderClick}>
                Entrar e Fazer Pedido
                <ArrowRight size={18} />
              </button>
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
          <h2 className="section-title">Selecao de Paes</h2>
          <p className="section-subtitle">Catalogo informativo com os produtos disponiveis e respetivo preco unitario.</p>

          <div className="breads-grid">
            {breads.map((bread) => (
              <article key={bread.id} className="bread-card">
                <div className="bread-image-wrap">
                  <img src={bread.image} alt={bread.name} className="bread-image" />
                </div>
                <h3 className="bread-name">{bread.name}</h3>
                <p className="bread-description">{bread.description}</p>
                <div className="bread-footer">
                  <span className="unit-price">Preco unitario</span>
                  <strong>{bread.price}</strong>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

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
              <div className={`availability-result ${availabilityResult.includes('✅') ? 'success' : 'error'}`}>
                {availabilityResult}
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
