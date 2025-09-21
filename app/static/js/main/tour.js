// static/js/main/tour.js
(() => {
  // ====== i18n (pega de window.I18N_SCRIPT) ======
  const I18N = (typeof window !== "undefined" && window.I18N_SCRIPT) || {};
  const get = (obj, path) => path.split('.').reduce((o, k) => (o && k in o ? o[k] : undefined), obj);
  const t = (key, def = "") => {
    const v = get(I18N, key);
    return (v === undefined || v === null) ? def : String(v);
  };

  // ====== Config ======
  const TOUR_KEY = 'home.tour.v1.seen';   // chave p/ lembrar que já viu
  const BREAKPOINT_SM = 576;

  const $ = (s, r=document) => r.querySelector(s);
  const clamp = (v,a,b)=>Math.min(b,Math.max(a,v));
  const isMobile = () => window.innerWidth <= BREAKPOINT_SM;

  // Passos (usa os cards pela data-link)
  const STEPS = [
    { el: '.card[data-link="/settings"]',       title: t('tour.steps.settings.title', 'Configurações'),       text: t('tour.steps.settings.text', 'Ajuste preferências, paths, filtros e comportamento do app.'), pad:10 },
    { el: '.card[data-link="/upload"]',         title: t('tour.steps.upload.title', 'Enviar'),                text: t('tour.steps.upload.text', 'Envie um capítulo individual com validações e autocomplete.'), pad:10 },
    { el: '.card[data-link="/upload/complex"]', title: t('tour.steps.upload_many.title', 'Enviar vários'),    text: t('tour.steps.upload_many.text', 'Envie múltiplos capítulos de uma vez.'), pad:10 },
    { el: '.card[data-link="/queue"]',          title: t('tour.steps.queue.title', 'Fila'),                   text: t('tour.steps.queue.text', 'Acompanhe progresso, estados e priorize tarefas.'), pad:10 },
    { el: '.card[data-link="/download"]',       title: t('tour.steps.download.title', 'Baixar'),              text: t('tour.steps.download.text', 'Busque títulos e baixe capítulos com filtros por idioma/volume.'), pad:10 },
    { el: '.card[data-link="/edit"]',           title: t('tour.steps.edit.title', 'Editar'),                  text: t('tour.steps.edit.text', 'Edite projetos existentes.'), pad:10 },
    // { el: '.card[data-link="/create"]',         title: t('tour.steps.create.title', 'Criar projeto'),         text: t('tour.steps.create.text', 'Crie um novo projeto/título que ainda não existe.'), pad:10 },
    { el: '.card[data-link="/logs"]',           title: t('tour.steps.logs.title', 'Registro'),                text: t('tour.steps.logs.text', 'Consulte histórico de envios e detalhes.'), pad:10 },
    { el: '.card[data-link="/updates"]',        title: t('tour.steps.updates.title', 'Atualizações'),         text: t('tour.steps.updates.text', 'Veja novidades e mudanças do aplicativo.'), pad:10 },
  ];

  // ====== Singleton ======
  let activeTour = null;

  // ====== Styles ======
  function injectStyles(){
    if ($('#tour-styles')) return;
    const css = `
      .tour-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1090}
      .tour-highlight{position:absolute;z-index:1091;pointer-events:none;border-radius:12px;outline:3px solid var(--bs-primary);box-shadow:0 0 0 6px rgba(13,110,253,.25);transition:all .2s ease}
      .tour-tip{position:absolute;z-index:1092;max-width:min(420px,calc(100vw - 32px));background:var(--bs-body-bg);color:var(--bs-body-color);border:1px solid var(--bs-border-color);border-radius:.75rem;padding:.9rem;box-shadow:0 12px 30px rgba(0,0,0,.25)}
      .tour-tip h3{font-size:1rem;margin:0 0 .25rem 0}
      .tour-tip p{margin:0 0 .75rem 0;color:var(--bs-secondary-color)}
      .tour-tip .actions{display:flex;gap:.5rem;justify-content:flex-end}
      .tour-tip .actions .btn{padding:.25rem .6rem}
      .tour-tip-mobile{position:fixed;left:max(8px,env(safe-area-inset-left));right:max(8px,env(safe-area-inset-right));bottom:max(8px,env(safe-area-inset-bottom));max-width:unset}

      .tour-help-btn{
        position:fixed;right:16px;bottom:16px;z-index:1089;
        border:none;border-radius:999px;padding:.6rem .75rem;
        background:var(--bs-primary);color:#fff;box-shadow:0 8px 20px rgba(0,0,0,.25);
      }
    `;
    const s = document.createElement('style');
    s.id = 'tour-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ====== Geometria ======
  function getRect(el){
    const r = el.getBoundingClientRect();
    return { x:r.left + window.scrollX, y:r.top + window.scrollY, w:r.width, h:r.height };
  }
  function ensureInView(rect, tipH=220, pad=24){
    const topWanted = rect.y - pad;
    const bottomWanted = rect.y + rect.h + pad + tipH;
    const vTop = window.scrollY, vBottom = vTop + window.innerHeight;
    if (topWanted < vTop) window.scrollTo({ top: Math.max(0, topWanted), behavior:'smooth' });
    else if (bottomWanted > vBottom) window.scrollTo({ top: bottomWanted - window.innerHeight, behavior:'smooth' });
  }
  function placeTipDesktop(tip, rect){
    const margin = 12, vw = document.documentElement.clientWidth;
    const th = tip.offsetHeight, tw = tip.offsetWidth;
    let top = rect.y + rect.h + margin;
    let left = clamp(rect.x, 8, vw - tw - 8);
    const viewportBottom = window.scrollY + window.innerHeight;
    if (top + th > viewportBottom) top = Math.max(8 + window.scrollY, rect.y - th - margin);
    if (rect.w < tw) left = clamp(rect.x + rect.w/2 - tw/2, 8, vw - tw - 8);
    tip.style.top = `${top}px`;
    tip.style.left = `${left}px`;
  }

  // ====== Classe do tour ======
  class HomeTour{
    constructor(steps){
      this.steps = steps.slice();
      this.i = 0;
      this.mobile = isMobile();

      this.overlay = document.createElement('div');
      this.overlay.className = 'tour-overlay';
      this.hl = document.createElement('div');
      this.hl.className = 'tour-highlight';
      this.tip = document.createElement('div');
      this.tip.className = 'tour-tip';
      this.tip.innerHTML = `
        <h3></h3>
        <p></p>
        <div class="actions">
          <button class="btn btn-sm btn-outline-secondary" data-act="prev">${t('tour.buttons.prev','Voltar')}</button>
          <button class="btn btn-sm btn-secondary" data-act="skip">${t('tour.buttons.skip','Pular')}</button>
          <button class="btn btn-sm btn-primary" data-act="next">${t('tour.buttons.next','Próximo')}</button>
        </div>
      `;
      this.titleEl = this.tip.querySelector('h3');
      this.textEl  = this.tip.querySelector('p');
      this.btnPrev = this.tip.querySelector('[data-act="prev"]');
      this.btnSkip = this.tip.querySelector('[data-act="skip"]');
      this.btnNext = this.tip.querySelector('[data-act="next"]');

      this._onScrollResize = this.reposition.bind(this);
      this._onKey = this.onKey.bind(this);

      this.btnPrev.addEventListener('click', () => this.prev());
      this.btnSkip.addEventListener('click', () => this.end());
      this.btnNext.addEventListener('click', () => this.next());
      this.overlay.addEventListener('click', () => this.next());
    }

    start(){
      if (activeTour) return;
      if (document.querySelector('.tour-overlay')) return;
      activeTour = this;
      injectStyles();

      document.body.append(this.overlay, this.hl, this.tip);
      this.tip.classList.toggle('tour-tip-mobile', this.mobile);

      window.addEventListener('scroll', this._onScrollResize, { passive:true });
      window.addEventListener('resize', this._onScrollResize, { passive:true });
      window.addEventListener('keydown', this._onKey);

      this.show(0);
    }

    show(idx){
      while (idx < this.steps.length && !document.querySelector(this.steps[idx].el)) idx++;
      if (idx >= this.steps.length) return this.end();

      this.i = idx;
      const step = this.steps[this.i];
      const el = document.querySelector(step.el);
      const rect = getRect(el);
      const pad = step.pad ?? 8;

      this.hl.style.top = `${rect.y - pad}px`;
      this.hl.style.left = `${rect.x - pad}px`;
      this.hl.style.width = `${rect.w + pad*2}px`;
      this.hl.style.height = `${rect.h + pad*2}px`;
      this.hl.style.borderRadius = getComputedStyle(el).borderRadius || '12px';

      this.titleEl.textContent = step.title || '';
      this.textEl.textContent  = step.text  || '';
      this.btnPrev.disabled = (this.i === 0);
      this.btnNext.textContent = (this.i === this.steps.length-1)
        ? t('tour.buttons.finish','Concluir')
        : t('tour.buttons.next','Próximo');

      if (!this.mobile) {
        this.tip.style.visibility = 'hidden';
        requestAnimationFrame(() => {
          this.tip.style.visibility = '';
          placeTipDesktop(this.tip, rect);
        });
      } else {
        this.tip.style.removeProperty('top');
        this.tip.style.removeProperty('left');
      }

      ensureInView(rect, this.tip.offsetHeight, 24);
    }

    reposition(){
      if (this.mobile) return;
      const step = this.steps[this.i];
      const el = document.querySelector(step.el);
      if (!el) return;
      const rect = getRect(el);
      const pad = step.pad ?? 8;

      this.hl.style.top = `${rect.y - pad}px`;
      this.hl.style.left = `${rect.x - pad}px`;
      this.hl.style.width = `${rect.w + pad*2}px`;
      this.hl.style.height = `${rect.h + pad*2}px`;

      placeTipDesktop(this.tip, rect);
    }

    next(){ (this.i >= this.steps.length-1) ? this.end() : this.show(this.i+1); }
    prev(){ if (this.i > 0) this.show(this.i-1); }
    onKey(ev){
      if (ev.key === 'Escape') this.end();
      else if (ev.key === 'ArrowRight' || ev.key === 'Enter') this.next();
      else if (ev.key === 'ArrowLeft') this.prev();
    }
    end(){
      window.removeEventListener('scroll', this._onScrollResize);
      window.removeEventListener('resize', this._onScrollResize);
      window.removeEventListener('keydown', this._onKey);
      this.overlay.remove(); this.hl.remove(); this.tip.remove();
      try { localStorage.setItem(TOUR_KEY, '1'); } catch {}
      if (activeTour === this) activeTour = null;
    }
  }

  // ====== API ======
  function openTour({ force=false } = {}){
    if (activeTour) return activeTour;
    if (!force && localStorage.getItem(TOUR_KEY) === '1') return null;
    const t = new HomeTour(STEPS);
    t.start();
    return t;
  }

  // Botão de ajuda (opcional, mas prático)
  function addHelpButton(){
    if ($('.tour-help-btn')) return;
    const b = document.createElement('button');
    b.className = 'tour-help-btn';
    b.type = 'button';
    b.title = t('tour.help.title','Ajuda');
    b.textContent = t('tour.help.text','Ajuda');
    b.addEventListener('click', () => {
      try { localStorage.removeItem(TOUR_KEY); } catch {}
      openTour({ force:true });
    });
    document.body.appendChild(b);
  }

  // Auto start (1ª visita)
  function init(){
    if (!$('.row.gy-4')) return; // só na home
    addHelpButton();
    setTimeout(() => openTour({ force:false }), 400);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
