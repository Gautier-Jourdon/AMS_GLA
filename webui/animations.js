/**
 * AMS GLA - Advanced Animations & UI Effects
 * Premium visual effects for crypto dashboard
 */

// ==========================================
// PARTICLE BACKGROUND EFFECT
// ==========================================
class ParticleBackground {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.particleCount = 50;
    this.mouse = { x: null, y: null, radius: 150 };

    this.init();
  }

  init() {
    this.resize();
    this.createParticles();
    this.animate();

    window.addEventListener('resize', () => this.resize());
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1
      });
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Update and draw particles
    this.particles.forEach(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Bounce off edges
      if (particle.x < 0 || particle.x > this.canvas.width) particle.vx *= -1;
      if (particle.y < 0 || particle.y > this.canvas.height) particle.vy *= -1;

      // Mouse interaction
      if (this.mouse.x && this.mouse.y) {
        const dx = this.mouse.x - particle.x;
        const dy = this.mouse.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.mouse.radius) {
          const force = (this.mouse.radius - distance) / this.mouse.radius;
          particle.x -= dx * force * 0.03;
          particle.y -= dy * force * 0.03;
        }
      }

      // Draw particle
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(0, 212, 255, 0.3)';
      this.ctx.fill();
    });

    // Connect nearby particles
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 150) {
          this.ctx.beginPath();
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.strokeStyle = `rgba(139, 92, 246, ${0.15 * (1 - distance / 150)})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.stroke();
        }
      }
    }

    requestAnimationFrame(() => this.animate());
  }
}

// ==========================================
// TOAST NOTIFICATION SYSTEM
// ==========================================
class ToastManager {
  constructor() {
    this.container = this.createContainer();
  }

  createContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 12px;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }
    return container;
  }

  show(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const colors = {
      success: '#00ff88',
      error: '#ff4757',
      warning: '#ffd93d',
      info: '#60a5fa'
    };

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    toast.style.cssText = `
      background: rgba(15, 23, 36, 0.95);
      backdrop-filter: blur(12px);
      border: 1px solid ${colors[type] || colors.info};
      border-left: 4px solid ${colors[type] || colors.info};
      padding: 16px 20px;
      border-radius: 12px;
      color: #e6eef8;
      font-weight: 600;
      font-size: 0.9rem;
      min-width: 280px;
      max-width: 400px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      pointer-events: auto;
      animation: slideInRight 0.3s ease;
      display: flex;
      align-items: center;
      gap: 12px;
    `;

    toast.innerHTML = `
      <span style="font-size:1.2rem;color:${colors[type] || colors.info}">${icons[type] || icons.info}</span>
      <span style="flex:1">${message}</span>
    `;

    this.container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);
  }
}

// ==========================================
// NUMBER COUNTER ANIMATION
// ==========================================
function animateNumber(element, start, end, duration = 1000, decimals = 2) {
  if (!element) return;

  const startTime = performance.now();
  const range = end - start;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function (ease-out)
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (range * eased);

    element.textContent = current.toLocaleString('fr-FR', {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals
    });

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// ==========================================
// PRICE FLASH EFFECT
// ==========================================
function flashPriceChange(element, isIncrease) {
  if (!element) return;

  const color = isIncrease ? '#00ff88' : '#ff4757';
  const originalBg = element.style.backgroundColor;

  element.style.transition = 'background-color 0.1s ease';
  element.style.backgroundColor = `${color}20`;

  setTimeout(() => {
    element.style.transition = 'background-color 0.5s ease';
    element.style.backgroundColor = originalBg || 'transparent';
  }, 100);
}

// ==========================================
// SCROLL ANIMATIONS (Intersection Observer)
// ==========================================
function initScrollAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll('.animate-on-scroll').forEach(el => {
    observer.observe(el);
  });
}

// ==========================================
// SPARKLINE MINI CHARTS
// ==========================================
function createSparkline(container, data, color = '#00d4ff') {
  if (!container || !data || data.length === 0) return;

  const canvas = document.createElement('canvas');
  canvas.width = 80;
  canvas.height = 30;
  canvas.style.display = 'block';

  const ctx = canvas.getContext('2d');
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  ctx.beginPath();
  data.forEach((value, i) => {
    const x = (i / (data.length - 1)) * canvas.width;
    const y = canvas.height - ((value - min) / range) * canvas.height;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Fill gradient
  ctx.lineTo(canvas.width, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.closePath();

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, `${color}40`);
  gradient.addColorStop(1, `${color}00`);
  ctx.fillStyle = gradient;
  ctx.fill();

  container.innerHTML = '';
  container.appendChild(canvas);
}

// ==========================================
// TICKER ANIMATION
// ==========================================
function initTickerAnimation() {
  const ticker = document.getElementById('market-ticker');
  if (!ticker) return;

  let position = 0;
  const speed = 0.5;

  function animate() {
    position -= speed;
    const content = ticker.textContent || '';

    if (Math.abs(position) > content.length * 8) {
      position = 0;
    }

    ticker.style.transform = `translateX(${position}px)`;
    requestAnimationFrame(animate);
  }

  animate();
}

// ==========================================
// LOADING SKELETON
// ==========================================
function createSkeletonLoader(container, rows = 5) {
  if (!container) return;

  const skeleton = document.createElement('div');
  skeleton.className = 'skeleton-loader';
  skeleton.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  `;

  for (let i = 0; i < rows; i++) {
    const row = document.createElement('div');
    row.style.cssText = `
      height: 40px;
      background: linear-gradient(
        90deg,
        rgba(255,255,255,0.03) 0%,
        rgba(255,255,255,0.08) 50%,
        rgba(255,255,255,0.03) 100%
      );
      background-size: 200% 100%;
      border-radius: 8px;
      animation: shimmer 1.5s infinite;
    `;
    skeleton.appendChild(row);
  }

  container.innerHTML = '';
  container.appendChild(skeleton);
}

// ==========================================
// STATS CARD ANIMATION
// ==========================================
function animateStatsCard(cardId, value, label, trend) {
  const card = document.getElementById(cardId);
  if (!card) return;

  const trendColor = trend >= 0 ? '#00ff88' : '#ff4757';
  const trendIcon = trend >= 0 ? '↑' : '↓';

  card.style.cssText = `
    padding: 24px;
    background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    text-align: center;
    animation: fadeInUp 0.6s ease;
  `;

  card.innerHTML = `
    <div style="font-size: 0.85rem; color: #9aa4b2; margin-bottom: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
      ${label}
    </div>
    <div id="${cardId}-value" style="font-size: 2rem; font-weight: 900; background: linear-gradient(135deg, #00d4ff, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px;">
      ${value}
    </div>
    <div style="font-size: 0.9rem; font-weight: 700; color: ${trendColor};">
      ${trendIcon} ${Math.abs(trend).toFixed(2)}%
    </div>
  `;
}

// ==========================================
// CONFETTI EFFECT (for successful trades)
// ==========================================
function createConfetti() {
  const colors = ['#00ff88', '#00d4ff', '#8b5cf6', '#ffd93d'];
  const confettiCount = 50;

  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.style.cssText = `
      position: fixed;
      width: 10px;
      height: 10px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      top: -10px;
      left: ${Math.random() * 100}vw;
      opacity: ${Math.random() * 0.5 + 0.5};
      transform: rotate(${Math.random() * 360}deg);
      animation: confettiFall ${Math.random() * 2 + 2}s linear forwards;
      pointer-events: none;
      z-index: 9999;
    `;

    document.body.appendChild(confetti);

    setTimeout(() => {
      if (confetti.parentNode) {
        confetti.parentNode.removeChild(confetti);
      }
    }, 4000);
  }
}

// ==========================================
// CSS ANIMATIONS INJECTION
// ==========================================
function injectAnimationStyles() {
  const styleId = 'ams-animations';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes slideInRight {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOutRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
    
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    
    @keyframes confettiFall {
      to {
        transform: translateY(100vh) rotate(720deg);
        opacity: 0;
      }
    }
    
    .animate-in {
      animation: fadeInUp 0.6s ease;
    }
  `;

  document.head.appendChild(style);
}

// ==========================================
// INITIALIZATION
// ==========================================
export const toast = new ToastManager();

export function initUIEnhancements() {
  if (typeof window === 'undefined') return;

  // Inject animation styles
  injectAnimationStyles();

  // Initialize particle background
  const particleCanvas = document.getElementById('particle-canvas');
  if (particleCanvas) {
    new ParticleBackground('particle-canvas');
  }

  // Initialize scroll animations
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollAnimations);
  } else {
    initScrollAnimations();
  }
}

// Export functions
export {
  ParticleBackground,
  ToastManager,
  animateNumber,
  flashPriceChange,
  initScrollAnimations,
  createSparkline,
  initTickerAnimation,
  createSkeletonLoader,
  animateStatsCard,
  createConfetti
};

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  initUIEnhancements();

  // Expose createSparkline to window for app.js usage
  window.createSparkline = createSparkline;
  window.toast = toast;
  window.animateNumber = animateNumber;
  window.flashPriceChange = flashPriceChange;
  window.createConfetti = createConfetti;
}
