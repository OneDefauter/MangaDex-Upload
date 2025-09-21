// download/download.js
(() => {
  // i18n helper
  const tS = (k, params = {}) => {
    const dict = (window.I18N_SCRIPT || {});
    let s = dict[k] || (
      k === 'download.queue.error'          ? 'Falha ao enfileirar downloads. Tente novamente.' :
      k === 'download.no.chapters.lang'     ? 'Não há capítulos para {lang}.' :
      k === 'download.no.chapters.volume'   ? 'Sem capítulos para o volume {volume} ({lang}).' :
      k === 'download.adding'               ? 'Adicionando...' :
      k
    );
    for (const [p, v] of Object.entries(params)) {
      s = s.replaceAll(`{${p}}`, v);
    }
    return s;
  };

  const toast = (msg, type='info') => {
    if (typeof window.showToast === 'function') window.showToast(msg, type);
    else alert(msg);
  };

  // Lê dados do servidor
  const chaptersByLang = JSON.parse(document.getElementById('chapters-json')?.textContent || '{}');
  const manga = JSON.parse(document.getElementById('manga-json')?.textContent || '{}');

  // Seletores
  const btnDownloadLang = document.getElementById('btnDownloadLang');
  const btnLangLabel = document.getElementById('btnLangLabel');
  const langTabs = document.getElementById('langTabs');
  const downloadVolumeBtns = document.querySelectorAll('.download-volume-btn');
  const downloadChapterBtns = document.querySelectorAll('.download-chapter-btn');

  // Helper: idioma ativo (pega do id da aba ativa)
  function getActiveLang() {
    const activeBtn = langTabs?.querySelector('.nav-link.active');
    if (!activeBtn) {
      const keys = Object.keys(chaptersByLang || {});
      return keys.length ? keys[0] : 'pt-br';
    }
    // id = tab-pt_br -> volta "pt-br"
    const id = activeBtn.id || '';
    return id.replace(/^tab-/, '').replace('_', '-');
  }

  // Helper: ids por idioma
  function chapterIdsForLang(lang) {
    const volumes = chaptersByLang?.[lang] || {};
    const ids = [];
    for (const rows of Object.values(volumes)) {
      for (const c of rows) ids.push(c.id);
    }
    return ids;
  }

  // Helper: ids por idioma + volume
  function chapterIdsForVolume(lang, volume) {
    const rows = chaptersByLang?.[lang]?.[volume] || [];
    return rows.map(c => c.id);
  }

  // Atualiza rótulo do botão principal
  function updateLangButtonLabel() {
    const lang = getActiveLang();
    if (btnLangLabel) btnLangLabel.textContent = lang;
  }

  // Envia batch de download ao backend
  async function queueDownload({ lang, chapterIds }) {
    const payload = {
      manga_id: manga.id,
      manga_title: manga.title,
      language: lang,
      chapter_ids: chapterIds
    };

    const btn = btnDownloadLang;
    if (btn) { btn.disabled = true; btn.classList.add('disabled'); }

    try {
      const r = await fetch('/api/download/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json().catch(() => ({}));
      // feedback opcional
      if (typeof data?.queued === 'number') {
        toast(`+${data.queued} capítulo(s) enfileirado(s) (${lang}).`, 'success');
      } else {
        toast(`Pedidos de download enviados (${lang}).`, 'success');
      }
    } catch (e) {
      console.error(e);
      toast(tS('download.queue.error'), 'danger');
    } finally {
      if (btn) { btn.disabled = false; btn.classList.remove('disabled'); }
    }
  }

  // Clique no botão principal: baixa todos do idioma atual
  if (btnDownloadLang) {
    btnDownloadLang.addEventListener('click', async () => {
      const lang = getActiveLang();
      const ids = chapterIdsForLang(lang);
      if (!ids.length) {
        toast(tS('download.no.chapters.lang', { lang }), 'warning');
        return;
      }
      await queueDownload({ lang, chapterIds: ids });
    });
  }

  // Clique nos botões de volume: baixa todos do volume
  downloadVolumeBtns.forEach(el => {
    el.addEventListener('click', async () => {
      const lang = el.dataset.lang;
      const volume = el.dataset.volume;
      const ids = chapterIdsForVolume(lang, volume);
      if (!ids.length) {
        toast(tS('download.no.chapters.volume', { volume, lang }), 'warning');
        return;
      }
      // feedback local no botão de volume
      const old = el.textContent;
      el.disabled = true; el.textContent = tS('download.adding');
      try {
        await queueDownload({ lang, chapterIds: ids });
      } finally {
        el.disabled = false; el.textContent = old;
      }
    });
  });

  downloadChapterBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const chapterId = btn.dataset.idChapter;            // data-id-chapter -> idChapter
      const lang = getActiveLang();                       // usa a aba ativa
      if (!chapterId) return;

      const originalText = btn.textContent;
      btn.disabled = true;
      btn.classList.add('disabled');
      btn.textContent = tS('download.adding');

      try {
        await queueDownload({
          lang,
          chapterIds: [chapterId],                        // envia 1 capítulo no batch
        });
      } catch (e) {
        console.error(e);
        toast(tS('download.queue.error'), 'danger');
      } finally {
        btn.disabled = false;
        btn.classList.remove('disabled');
        btn.textContent = originalText;
      }
    });
  });

  // Mudar rótulo ao trocar de aba
  if (langTabs) {
    langTabs.addEventListener('shown.bs.tab', updateLangButtonLabel);
  }

  // Inicializa rótulo
  updateLangButtonLabel();
})();
