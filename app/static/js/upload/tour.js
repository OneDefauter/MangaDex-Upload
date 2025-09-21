// static/js/upload/tour.js
(() => {
  // ==================== CONFIG ====================
  const TOUR_KEY = 'upload.tour.v1.seen';   // marca tour visto
  const BREAKPOINT_SM = 576;                // ~ Bootstrap sm
  const $ = (s, r=document) => r.querySelector(s);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const isMobile = () => window.innerWidth <= BREAKPOINT_SM;

  // Passos do tour (ajuste textos conforme quiser)
  const STEPS = [
    { el:'#projectInput',  title:T('upload.tour.steps.project.title'),   text:T('upload.tour.steps.project.text'),   focus:true,  pad:8  },
    { el:'#groupInput',    title:T('upload.tour.steps.groups.title'),    text:T('upload.tour.steps.groups.text'),    focus:true,  pad:8  },
    { el:'#langSelect',    title:T('upload.tour.steps.lang.title'),      text:T('upload.tour.steps.lang.text'),      focus:false, pad:8  },
    { el:'#titleInput',    title:T('upload.tour.steps.title.title'),     text:T('upload.tour.steps.title.text'),     focus:true,  pad:8  },
    { el:'#chapterInput',  title:T('upload.tour.steps.chapter.title'),   text:T('upload.tour.steps.chapter.text'),   focus:true,  pad:8  },
    { el:'#volumeInput',   title:T('upload.tour.steps.volume.title'),    text:T('upload.tour.steps.volume.text'),    focus:false, pad:8  },
    { el:'#oneshotCheck',  title:T('upload.tour.steps.oneshot.title'),   text:T('upload.tour.steps.oneshot.text'),   focus:false, pad:10 },
    { el:'#scheduleAt',    title:T('upload.tour.steps.date.title'),      text:T('upload.tour.steps.date.text'),      focus:false, pad:8  },
    { el:'#filesInput',    title:T('upload.tour.steps.source.title'),    text:T('upload.tour.steps.source.text'),    focus:false, pad:10 },
    { el:'#btnSubmit',     title:T('upload.tour.steps.submit.title'),    text:T('upload.tour.steps.submit.text'),    focus:false, pad:12 }
  ];

  // ============== SINGLETON (anti-duplo-tour) ==============
  let activeTour = null;

  // ==================== ESTILOS (injeção) ===================
  function injectStyles(){
    if (document.getElementById('tour-styles')) return;
    const css = /* css */`
      .tour-overlay{
        position:fixed; inset:0; background:rgba(0,0,0,.5);
        z-index: 1090;
      }
      .tour-highlight{
        position:absolute; z-index:1091; pointer-events:none;
        border-radius:12px; outline:3px solid var(--bs-primary);
        box-shadow:0 0 0 6px rgba(13,110,253,.25);
        transition: all .2s ease;
      }
      .tour-tip{
        position:absolute; z-index:1092; max-width: min(420px, calc(100vw - 32px));
        background: var(--bs-body-bg); color: var(--bs-body-color);
        border:1px solid var(--bs-border-color); border-radius:.75rem;
        padding: .9rem; box-shadow: 0 12px 30px rgba(0,0,0,.25);
      }
      .tour-tip h3{ font-size:1rem; margin:0 0 .25rem 0; }
      .tour-tip p{ margin:0 0 .75rem 0; color: var(--bs-secondary-color); }
      .tour-tip .actions{ display:flex; gap:.5rem; justify-content:flex-end; }
      .tour-tip .actions .btn{ padding:.25rem .6rem; }

      /* Mobile: sheet fixo no rodapé */
      .tour-tip-mobile{
        position:fixed; left: max(8px, env(safe-area-inset-left));
        right: max(8px, env(safe-area-inset-right));
        bottom: max(8px, env(safe-area-inset-bottom));
        max-width: unset;
      }
    `;
    const s = document.createElement('style');
    s.id = 'tour-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ==================== GEOMETRIA / POSICIONAMENTO ====================
  function getRect(el) {
    const r = el.getBoundingClientRect();
    return {
      x: r.left + window.scrollX,
      y: r.top + window.scrollY,
      w: r.width,
      h: r.height
    };
  }

  // Garante que o alvo esteja visível (considerando a tooltip depois)
  function ensureInView(rect, tipH=220, pad=24){
    const topWanted = rect.y - pad;
    const bottomWanted = rect.y + rect.h + pad + tipH;

    const vTop = window.scrollY;
    const vBottom = vTop + window.innerHeight;

    if (topWanted < vTop) {
      window.scrollTo({ top: Math.max(0, topWanted), behavior:'smooth' });
    } else if (bottomWanted > vBottom) {
      window.scrollTo({ top: bottomWanted - window.innerHeight, behavior:'smooth' });
    }
  }

  // Posiciona tooltip no desktop (tenta abaixo; se não couber, tenta acima)
  function placeTipDesktop(tip, rect){
    const margin = 12;
    const vw = document.documentElement.clientWidth;
    const th = tip.offsetHeight, tw = tip.offsetWidth;

    // tenta abaixo
    let top = rect.y + rect.h + margin;
    let left = clamp(rect.x, 8, vw - tw - 8);

    // se estourar embaixo, tenta acima
    const viewportBottom = window.scrollY + window.innerHeight;
    if (top + th > viewportBottom) {
      top = Math.max(8 + window.scrollY, rect.y - th - margin);
    }

    // se o alvo for muito estreito, centraliza relativo a ele
    if (rect.w < tw) {
      left = clamp(rect.x + (rect.w/2) - (tw/2), 8, vw - tw - 8);
    }

    tip.style.top = `${top}px`;
    tip.style.left = `${left}px`;
  }

  // ==================== CLASSE DO TOUR ====================
  class UploadTour{
    constructor(steps){
      this.steps = steps.slice();
      this.i = 0;
      this.mobile = isMobile();

      // elementos
      this.overlay = document.createElement('div');
      this.overlay.className = 'tour-overlay';
      this.hl = document.createElement('div');
      this.hl.className = 'tour-highlight';
      this.tip = document.createElement('div');
      this.tip.className = 'tour-tip';

      // UI da tip
      this.tip.innerHTML = `
        <h3></h3>
        <p></p>
        <div class="actions">
          <button class="btn btn-sm btn-outline-secondary" data-act="prev">Voltar</button>
          <button class="btn btn-sm btn-secondary" data-act="skip">Pular</button>
          <button class="btn btn-sm btn-primary" data-act="next">Próximo</button>
        </div>
      `;
      this.titleEl = this.tip.querySelector('h3');
      this.textEl  = this.tip.querySelector('p');
      this.btnPrev = this.tip.querySelector('[data-act="prev"]');
      this.btnSkip = this.tip.querySelector('[data-act="skip"]');
      this.btnNext = this.tip.querySelector('[data-act="next"]');

      // binds
      this._onScrollResize = this.reposition.bind(this);
      this._onKey = this.onKey.bind(this);

      // ações
      this.btnPrev.addEventListener('click', () => this.prev());
      this.btnSkip.addEventListener('click', () => this.end());
      this.btnNext.addEventListener('click', () => this.next());
      this.overlay.addEventListener('click', () => this.next());
    }

    start(){
      if (activeTour) return;                            // já existe
      if (document.querySelector('.tour-overlay')) return;

      activeTour = this;
      injectStyles();

      document.body.append(this.overlay, this.hl, this.tip);
      this.tip.classList.toggle('tour-tip-mobile', this.mobile);

      window.addEventListener('scroll', this._onScrollResize, { passive:true });
      window.addEventListener('resize', this._onScrollResize, { passive:true });
      window.addEventListener('keydown', this._onKey);

      document.dispatchEvent(new CustomEvent('tour:status', { detail:'on' }));

      this.show(0);
    }

    show(idx){
      // pula steps cujo seletor não existe
      while (idx < this.steps.length && !document.querySelector(this.steps[idx].el)) idx++;
      if (idx >= this.steps.length) return this.end();

      this.i = idx;
      const step = this.steps[this.i];
      const el = document.querySelector(step.el);
      const rect = getRect(el);
      const pad = step.pad ?? 8;

      // highlight
      this.hl.style.top    = `${rect.y - pad}px`;
      this.hl.style.left   = `${rect.x - pad}px`;
      this.hl.style.width  = `${rect.w + pad*2}px`;
      this.hl.style.height = `${rect.h + pad*2}px`;
      this.hl.style.borderRadius = (getComputedStyle(el).borderRadius || '12px');

      // conteúdo
      this.titleEl.textContent = step.title || '';
      this.textEl.textContent  = step.text  || '';

      // botões
      this.btnPrev.disabled = (this.i === 0);
      this.btnNext.textContent = (this.i === this.steps.length - 1)
        ? T('upload.tour.buttons.finish')
        : T('upload.tour.buttons.next');

      // foco opcional
      if (step.focus) {
        try { el.focus({ preventScroll:true }); } catch {}
      }

      // posiciona tip
      if (this.mobile) {
        this.tip.style.removeProperty('top');
        this.tip.style.removeProperty('left');
      } else {
        // primeiro mede; depois posiciona (para pegar offsetHeight correto)
        this.tip.style.visibility = 'hidden';
        requestAnimationFrame(() => {
          this.tip.style.visibility = '';
          placeTipDesktop(this.tip, rect);
        });
      }

      // rola pra garantir visibilidade
      ensureInView(rect, this.tip.offsetHeight, 24);
    }

    reposition(){
      // reposiciona no scroll/resize (apenas desktop; no mobile é fixo)
      if (this.mobile) return;
      const step = this.steps[this.i];
      const el = document.querySelector(step.el);
      if (!el) return;
      const rect = getRect(el);
      const pad = step.pad ?? 8;

      this.hl.style.top    = `${rect.y - pad}px`;
      this.hl.style.left   = `${rect.x - pad}px`;
      this.hl.style.width  = `${rect.w + pad*2}px`;
      this.hl.style.height = `${rect.h + pad*2}px`;

      placeTipDesktop(this.tip, rect);
    }

    next(){
      if (this.i >= this.steps.length - 1) return this.end();
      this.show(this.i + 1);
    }

    prev(){
      if (this.i <= 0) return;
      this.show(this.i - 1);
    }

    onKey(ev){
      if (ev.key === 'Escape') { this.end(); }
      else if (ev.key === 'ArrowRight') { this.next(); }
      else if (ev.key === 'ArrowLeft') { this.prev(); }
      else if (ev.key === 'Enter') { this.next(); }
    }

    end(){
      window.removeEventListener('scroll', this._onScrollResize);
      window.removeEventListener('resize', this._onScrollResize);
      window.removeEventListener('keydown', this._onKey);
      this.overlay.remove(); this.hl.remove(); this.tip.remove();

      try { localStorage.setItem(TOUR_KEY, '1'); } catch {}
      document.dispatchEvent(new CustomEvent('tour:status', { detail:'off' }));
      if (activeTour === this) activeTour = null;
    }
  }

  // ==================== API PÚBLICA ====================
  function openTour({ force=false } = {}){
    if (activeTour) return activeTour;                    // já abriu
    if (!force && localStorage.getItem(TOUR_KEY) === '1') return null;
    const t = new UploadTour(STEPS);
    t.start();
    return t;
  }

  // Auto-start na página de upload (1ª vez)
  function maybeStart(){
    if (!document.querySelector('#uploadForm')) return;
    setTimeout(() => openTour({ force:false }), 350);
    // Botão “Ajuda” pode chamar isso:
    window.startUploadTour = () => {
      try { localStorage.removeItem(TOUR_KEY); } catch {}
      openTour({ force:true });
    };
  }

  document.addEventListener('DOMContentLoaded', maybeStart);
})();
