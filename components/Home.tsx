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
    name: 'Pao Rustico de Fermentacao Natural',
    description: 'Casca crocante, miolo aerado e sabor marcante para acompanhar qualquer refeicao.',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1400&q=80',
    price: 'EUR 3,90',
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
    // Aqui você pode conectar com Firebase ou um serviço de email
    console.log('Mensagem de contato:', formData);
    alert('Obrigado pela sua mensagem! Entraremos em contato em breve.');
    setFormData({ name: '', email: '', message: '' });
  };

  const checkAvailability = () => {
    // Aqui você pode conectar com seu backend para verificar disponibilidade
    if (address.trim()) {
      const normalizedAddress = address.toLowerCase();

      if (normalizedAddress.includes('ribamar') || normalizedAddress.includes('lisboa') || normalizedAddress.includes('oeiras') || normalizedAddress.includes('cascais')) {
        setAvailabilityResult('Disponibilidade confirmada: entregamos nesta morada entre 06:00 e 09:00.');
      } else {
        setAvailabilityResult('Estamos a validar a sua zona. A nossa equipa confirma a disponibilidade em ate 15 minutos.');
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
              <strong>06:00 - 09:00</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="breads-section" id="catalogo">
        <div className="section-container">
          <h2 className="section-title">Selecao de Paes</h2>
          <p className="section-subtitle">Fotografia real dos produtos e informacao objetiva para apoiar a decisao.</p>

          <div className="breads-grid">
            {breads.map((bread) => (
              <article key={bread.id} className="bread-card">
                <div className="bread-image-wrap">
                  <img src={bread.image} alt={bread.name} className="bread-image" />
                </div>
                <h3 className="bread-name">{bread.name}</h3>
                <p className="bread-description">{bread.description}</p>
                <div className="bread-footer">
                  <span>{bread.price}</span>
                  <button onClick={handleMakeOrderClick}>Pedir</button>
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
          <p className="section-subtitle">Introduza rua e localidade para validacao imediata.</p>

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
                  <p>João Pai: 919672252</p>
                  <p>Tiago Filho: 915390476</p>
                </div>
              </div>

              <div className="info-item">
                <Mail size={32} />
                <div>
                  <h3>Email</h3>
                  <p>tiagoalexandrejose@gmail.com</p>
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
