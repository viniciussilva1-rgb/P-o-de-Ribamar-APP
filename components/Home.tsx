import React, { useState, useEffect } from 'react';
import { Mail, MapPin, Phone, Clock, ChefHat, Truck, LogIn } from 'lucide-react';
import '../styles/HomeStyles.css';

interface Bread {
  id: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
}

const breads: Bread[] = [
  { id: '1', name: 'Pão Francês', description: 'Crocante, quentinho e irresistível', emoji: '🥖', color: '#D4A574' },
  { id: '2', name: 'Pão de Forma', description: 'Macio e perfeito para o café', emoji: '🍞', color: '#C19A6B' },
  { id: '3', name: 'Pão Integral', description: 'Saudável e nutritivo', emoji: '🥬', color: '#8B7355' },
  { id: '4', name: 'Broa', description: 'Tradicional e saborosa', emoji: '🥔', color: '#A0826D' },
  { id: '5', name: 'Croissant', description: 'Folhado e delicioso', emoji: '🥐', color: '#DEB887' },
  { id: '6', name: 'Pão de Queijo', description: 'Quentinho e com queijo derretido', emoji: '🧀', color: '#E8D4A2' },
];

interface HomeProps {
  onLoginClick?: () => void;
}

const Home: React.FC<HomeProps> = ({ onLoginClick }) => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [address, setAddress] = useState('');
  const [availabilityResult, setAvailabilityResult] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredBread, setHoveredBread] = useState<string | null>(null);
  const [flour, setFlour] = useState<Array<{ id: number; x: number; y: number }>>([]);

  // Mouse tracking for interactive effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Flour particles animation on hover
  const createFlourParticles = (breadId: string) => {
    setHoveredBread(breadId);
    const newFlour = Array.from({ length: 12 }).map((_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100 - 50,
      y: Math.random() * -100,
    }));
    setFlour([...flour, ...newFlour]);

    setTimeout(() => {
      setFlour((prev) => prev.filter((f) => !newFlour.some((nf) => nf.id === f.id)));
    }, 2000);
  };

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
      setAvailabilityResult(`✅ Ótimo! Entregamos na sua morada! Você receberá seu pão fresquinho a porta da sua casa.`);
    } else {
      setAvailabilityResult('❌ Por favor, digite seu endereço para verificar.');
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
    <div className="home-container">      {/* Header/Navbar */}
      <header>
        <div className="home-header-content">
          <div className="home-logo">
            🥖 Pão de Ribamar
          </div>
          <nav className="home-nav-buttons">
            <a href="#poes" style={{ color: '#8B4513', textDecoration: 'none', fontWeight: '600' }}>
              Nossos Pães
            </a>
            <a href="#contato" style={{ color: '#8B4513', textDecoration: 'none', fontWeight: '600' }}>
              Contato
            </a>
            <button className="login-button-nav" onClick={handleMakeOrderClick}>
              <LogIn size={18} />
              Login
            </button>
          </nav>
        </div>
      </header>
      {/* Flour particles */}
      {flour.map((particle) => (
        <div
          key={particle.id}
          className="flour-particle"
          style={
            {
              '--flour-x': `${particle.x}px`,
              '--flour-y': `${particle.y}px`,
            } as React.CSSProperties
          }
        />
      ))}

      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Pão de Ribamar
              <span className="bread-emoji">🥖</span>
            </h1>
            <p className="hero-subtitle">O sabor da tradição. A qualidade do bom dia.</p>
            <p className="hero-description">
              Pães frescos e quentinhos entregues diretamente na sua porta, cada manhã, com todo o carinho.
            </p>
            <div className="hero-buttons">
              <button className="cta-button" onClick={handleMakeOrderClick}>
                Fazer Pedido Agora
              </button>
            </div>
          </div>
          <div className="hero-animation">
            <div className="oven-container">
              <div className="oven">
                <div className="oven-door"></div>
                <div className="bread-inside">🥖</div>
                <div className="steam steam-1"></div>
                <div className="steam steam-2"></div>
                <div className="steam steam-3"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Breads Section */}
      <section className="breads-section" id="poes">
        <div className="section-container">
          <h2 className="section-title">Nossos Pães Especiais</h2>
          <p className="section-subtitle">Passe o mouse sobre cada pão para ver a magia acontecer! ✨</p>

          <div className="breads-grid">
            {breads.map((bread) => (
              <div
                key={bread.id}
                className={`bread-card ${hoveredBread === bread.id ? 'active' : ''}`}
                style={{ '--card-color': bread.color } as React.CSSProperties}
                onMouseEnter={() => createFlourParticles(bread.id)}
              >
                <div className="bread-emoji-large">{bread.emoji}</div>
                <h3 className="bread-name">{bread.name}</h3>
                <p className="bread-description">{bread.description}</p>

                {/* Flour particles inside card */}
                {hoveredBread === bread.id && (
                  <div className="flour-burst">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div key={i} className="flour-dot" />
                    ))}
                  </div>
                )}

                {/* Hot steam effect */}
                {hoveredBread === bread.id && (
                  <>
                    <div className="steam-effect steam-eff-1"></div>
                    <div className="steam-effect steam-eff-2"></div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-container">
          <h2 className="section-title">Por Que Escolher a Gente?</h2>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <ChefHat size={40} />
              </div>
              <h3>Feito com Amor</h3>
              <p>Cada pão é preparado com ingredientes frescos e carinho genuíno.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Truck size={40} />
              </div>
              <h3>Entrega na Sua Porta</h3>
              <p>Receba seu pão quentinho e fresquinho no conforto da sua casa.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Clock size={40} />
              </div>
              <h3>Sempre na Hora</h3>
              <p>Puntualidade garantida. Seu pão nunca chegará frio.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <MapPin size={40} />
              </div>
              <h3>Cobertura Regional</h3>
              <p>Entregamos em toda a região. Verifique sua disponibilidade.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Availability Checker */}
      <section className="availability-section">
        <div className="section-container">
          <h2 className="section-title">Entregamos na Sua Morada?</h2>
          <p className="section-subtitle">Digite seu endereço para verificar disponibilidade</p>

          <div className="availability-form">
            <div className="input-group">
              <input
                type="text"
                placeholder="Ex: Rua das Flores, 123, Bairro"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="availability-input"
              />
              <button onClick={checkAvailability} className="check-button">
                Verificar
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

      {/* Contact Section */}
      <section className="contact-section" id="contato">
        <div className="section-container">
          <h2 className="section-title">Fale Conosco</h2>

          <div className="contact-wrapper">
            <div className="contact-info">
              <div className="info-item">
                <Phone size={32} />
                <div>
                  <h3>Telefone</h3>
                  <p>(21) 9999-9999</p>
                </div>
              </div>

              <div className="info-item">
                <Mail size={32} />
                <div>
                  <h3>Email</h3>
                  <p>contato@paoderibammar.com.br</p>
                </div>
              </div>

              <div className="info-item">
                <MapPin size={32} />
                <div>
                  <h3>Localização</h3>
                  <p>Ribamar, Rio de Janeiro, RJ</p>
                </div>
              </div>
            </div>

            <form className="contact-form" onSubmit={handleContactSubmit}>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Seu Nome"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <input
                  type="email"
                  placeholder="Seu Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <textarea
                  placeholder="Sua Mensagem"
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                ></textarea>
              </div>

              <button type="submit" className="submit-button">
                Enviar Mensagem
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="section-container">
          <p>&copy; 2024 Pão de Ribamar. Todos os direitos reservados.</p>
          <p>Feito com ❤️ e muita farinha.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
