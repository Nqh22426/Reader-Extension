(() => {
  if (window.__vietReaderInstalled) return;
  window.__vietReaderInstalled = true;

  const LANGUAGES = [
    { id: 'vi-google', label: 'Tiếng Việt — giọng Google (trực tuyến)', type: 'google', locale: 'vi-VN' },
    { id: 'en-GB', label: 'Tiếng Anh — Anh (UK)', type: 'local', locale: 'en-GB' },
    { id: 'en-US', label: 'Tiếng Anh — Mỹ (US)', type: 'local', locale: 'en-US' },
    { id: 'zh-CN', label: 'Tiếng Trung phổ thông', type: 'local', locale: 'zh-CN' },
    { id: 'ja-JP', label: 'Tiếng Nhật', type: 'local', locale: 'ja-JP' },
    { id: 'ko-KR', label: 'Tiếng Hàn', type: 'local', locale: 'ko-KR' },
    { id: 'es', label: 'Tiếng Tây Ban Nha', type: 'local', locale: 'es' },
    { id: 'fr', label: 'Tiếng Pháp', type: 'local', locale: 'fr' },
    { id: 'de', label: 'Tiếng Đức', type: 'local', locale: 'de' },
    { id: 'hi-IN', label: 'Tiếng Hindi', type: 'local', locale: 'hi-IN' }
  ];

  let currentText = '';
  let currentIndex = 0;
  let selectedLanguage = 'vi-google';
  let rate = 1;
  let isPaused = false;
  let localVoices = [];
  let chunkRanges = [];
  let currentAudio = null;
  let currentAudioUrl = '';
  let pendingGoogleRequestIds = new Set();
  const contentInstanceId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let session = 0;
  let googlePendingSession = null;
  let googleAudioCache = new Map();
  let googleAudioPromises = new Map();
  let voiceEventsAttached = false;
  let voiceChangeHandler = null;
  let previousVoicesChangedHandler = null;
  let voiceChangeFallbackHandler = null;
  let panelInitPromise = Promise.resolve();

  const css = `
    #vietreader-panel{position:fixed;z-index:2147483647;right:20px;bottom:20px;width:340px;max-width:calc(100vw - 32px);max-height:calc(100vh - 32px);overflow:auto;background:#17191f;color:#f6f7fb;border:1px solid #3b3f49;border-radius:16px;box-shadow:0 12px 40px #0005;font:14px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;padding:14px;box-sizing:border-box}
    #vietreader-panel *{box-sizing:border-box}#vietreader-panel .vr-head{display:flex;align-items:center;gap:9px;margin-bottom:10px;cursor:grab;user-select:none;touch-action:none}#vietreader-panel .vr-head:active{cursor:grabbing}#vietreader-panel .vr-logo{width:34px;height:34px;border-radius:10px;background:#3b82f6;display:grid;place-items:center;flex:0 0 34px}#vietreader-panel .vr-logo svg{width:21px;height:21px;display:block;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}#vietreader-panel .vr-title{font-size:15px;font-weight:700;flex:1}#vietreader-panel button,#vietreader-panel select{font:inherit;border-radius:9px;border:1px solid #454a56;background:#242731;color:#f6f7fb;padding:8px 10px;cursor:pointer}#vietreader-panel button:hover{background:#343947}#vietreader-panel button:disabled{opacity:.55;cursor:wait}#vietreader-panel .vr-close{padding:3px 8px;font-size:19px}#vietreader-panel .vr-status{font-size:12px;color:#b8bfce;margin:7px 0 10px;white-space:pre-wrap}#vietreader-panel .vr-text{font-size:12px;color:#cdd2dd;max-height:68px;overflow:auto;white-space:pre-wrap;border:1px solid #363b46;border-radius:9px;padding:8px;margin-bottom:10px}#vietreader-panel label{display:block;font-size:12px;color:#cdd2dd;margin:8px 0 5px}#vietreader-panel select{width:100%}#vietreader-panel input[type=range]{width:100%;accent-color:#60a5fa}#vietreader-panel .vr-controls{display:flex;gap:9px;margin-top:10px}#vietreader-panel .vr-controls button{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;min-width:0;padding:9px 10px}#vietreader-panel .vr-button-icon{font-size:17px;line-height:1}#vietreader-panel .vr-pause-symbol{display:inline-flex;align-items:center;justify-content:center;gap:3px;width:16px;height:16px}#vietreader-panel .vr-pause-symbol i{display:block;width:3px;height:13px;border-radius:1px;background:currentColor}#vietreader-panel .vr-primary{background:#2563eb;border-color:#2563eb}#vietreader-panel .vr-primary:hover{background:#1d4ed8}
  `;

  function ensurePanel() {
    let panel = document.getElementById('vietreader-panel');
    if (panel) return panel;
    const style = document.createElement('style');
    style.id = 'vietreader-style';
    style.textContent = css;
    document.documentElement.appendChild(style);
    panel = document.createElement('section');
    panel.id = 'vietreader-panel';
    panel.setAttribute('aria-label', 'VietReader');
    panel.innerHTML = `
      <div class="vr-head" title="Kéo phần đầu bảng để di chuyển"><div class="vr-logo" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M2.5 10v4M6.3 6v12M10.1 3v18M13.9 7v10M17.7 5v14M21.5 10v4"/></svg></div><div class="vr-title">VietReader</div><button class="vr-close" id="vr-close" title="Đóng">×</button></div>
      <div class="vr-status" id="vr-status">Sẵn sàng đọc văn bản</div>
      <div class="vr-text" id="vr-text">Chọn văn bản hoặc bấm “Đọc nội dung chính”.</div>
      <label for="vr-voice">Ngôn ngữ / giọng đọc</label><select id="vr-voice"></select>
      <label for="vr-rate">Tốc độ: <span id="vr-rate-label">1,00×</span></label><input id="vr-rate" type="range" min="0" max="100" step="1" value="50" aria-label="Tốc độ đọc">
      <div class="vr-controls"><button id="vr-play" class="vr-primary" aria-label="Đọc lại"><span class="vr-button-icon" aria-hidden="true">↻</span><span>Đọc lại</span></button><button id="vr-pause" aria-label="Tạm dừng đọc"><span class="vr-button-icon vr-pause-symbol" id="vr-pause-icon" aria-hidden="true"><i></i><i></i></span><span id="vr-pause-label">Tạm dừng</span></button></div>`;
    document.documentElement.appendChild(panel);
    setupPanelDragging(panel);

    panel.querySelector('#vr-close').addEventListener('click', () => {
      stop();
      currentText = '';
      chunkRanges = [];
      localVoices = [];
      detachVoiceChangeListener();
      if (panel.__vrResizeHandler) window.removeEventListener('resize', panel.__vrResizeHandler);
      panel.remove();
      document.getElementById('vietreader-style')?.remove();
    });
    panel.querySelector('#vr-play').addEventListener('click', () => {
      if (currentText) startFromBeginning();
    });
    panel.querySelector('#vr-pause').addEventListener('click', togglePause);
    updatePauseButton();
    panel.querySelector('#vr-voice').addEventListener('change', async e => {
      selectedLanguage = e.target.value;
      await chrome.storage.local.set({ vrLanguage: selectedLanguage });
      if (currentText) startFromBeginning();
      else refreshStatus();
    });
    panel.querySelector('#vr-rate').addEventListener('input', e => {
      rate = sliderPositionToRate(e.target.value);
      e.target.value = String(rateToSliderPosition(rate));
      panel.querySelector('#vr-rate-label').textContent = rate.toFixed(2).replace('.', ',') + '×';
      if (currentAudio && !currentAudio.paused) currentAudio.playbackRate = rate;
      chrome.storage.local.set({ vrRate: rate }).catch(() => {});
    });

    panelInitPromise = initialisePanel();
    return panel;
  }

  // Giữ miền tốc độ 0,70×–1,50× nhưng ánh xạ 1,00× vào đúng giữa thanh.
  // Nửa trái bao phủ 0,70×–1,00×; nửa phải bao phủ 1,00×–1,50×.
  function rateToSliderPosition(value) {
    const bounded = Math.min(1.5, Math.max(0.7, Number(value) || 1));
    if (bounded <= 1) return Math.round(((bounded - 0.7) / 0.3) * 50);
    return Math.round(50 + ((bounded - 1) / 0.5) * 50);
  }

  function sliderPositionToRate(value) {
    const position = Math.min(100, Math.max(0, Number(value) || 0));
    const raw = position <= 50
      ? 0.7 + (position / 50) * 0.3
      : 1 + ((position - 50) / 50) * 0.5;
    return Math.min(1.5, Math.max(0.7, Math.round(raw * 20) / 20));
  }

  function applyPanelPosition(panel, left, top) {
    if (!panel || !panel.isConnected) return;
    const margin = 8;
    const maxLeft = Math.max(margin, window.innerWidth - panel.offsetWidth - margin);
    const maxTop = Math.max(margin, window.innerHeight - panel.offsetHeight - margin);
    const safeLeft = Math.round(Math.min(maxLeft, Math.max(margin, Number(left) || margin)));
    const safeTop = Math.round(Math.min(maxTop, Math.max(margin, Number(top) || margin)));
    panel.style.left = `${safeLeft}px`;
    panel.style.top = `${safeTop}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  }

  function setupPanelDragging(panel) {
    const handle = panel.querySelector('.vr-head');
    if (!handle) return;
    let drag = null;

    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const rect = panel.getBoundingClientRect();
      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        left: rect.left,
        top: rect.top
      };
      panel.style.left = `${rect.left}px`;
      panel.style.top = `${rect.top}px`;
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      try { handle.setPointerCapture(event.pointerId); } catch {}
      event.preventDefault();
    });

    handle.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      applyPanelPosition(
        panel,
        drag.left + event.clientX - drag.startX,
        drag.top + event.clientY - drag.startY
      );
    });

    const finishDrag = async event => {
      if (!drag || (event && event.pointerId !== drag.pointerId)) return;
      drag = null;
      const rect = panel.getBoundingClientRect();
      try {
        await chrome.storage.local.set({
          vrPanelPosition: { left: Math.round(rect.left), top: Math.round(rect.top) }
        });
      } catch {}
    };
    handle.addEventListener('pointerup', finishDrag);
    handle.addEventListener('pointercancel', finishDrag);

    panel.__vrResizeHandler = () => {
      if (panel.style.left && panel.style.top) {
        const rect = panel.getBoundingClientRect();
        applyPanelPosition(panel, rect.left, rect.top);
      }
    };
    window.addEventListener('resize', panel.__vrResizeHandler);
  }

  async function initialisePanel() {
    try {
      const saved = await chrome.storage.local.get(['vrLanguage', 'vrRate', 'vrPanelPosition']);
      if (LANGUAGES.some(language => language.id === saved.vrLanguage)) selectedLanguage = saved.vrLanguage;
      if (Number.isFinite(saved.vrRate)) rate = Math.min(1.5, Math.max(0.7, saved.vrRate));
      const panel = document.querySelector('#vietreader-panel');
      if (panel && saved.vrPanelPosition && Number.isFinite(saved.vrPanelPosition.left) && Number.isFinite(saved.vrPanelPosition.top)) {
        applyPanelPosition(panel, saved.vrPanelPosition.left, saved.vrPanelPosition.top);
      }
      const rateInput = document.querySelector('#vietreader-panel #vr-rate');
      if (rateInput) rateInput.value = String(rateToSliderPosition(rate));
      const rateLabel = document.querySelector('#vietreader-panel #vr-rate-label');
      if (rateLabel) rateLabel.textContent = rate.toFixed(2).replace('.', ',') + '×';
    } catch {}
    loadLocalVoices();
    renderLanguageOptions();
    refreshStatus();
  }

  function setStatus(text) {
    const el = document.querySelector('#vietreader-panel #vr-status');
    if (!el) return;
    el.textContent = text || '';
    el.style.display = text ? '' : 'none';
  }

  function updatePauseButton() {
    const button = document.querySelector('#vietreader-panel #vr-pause');
    const icon = document.querySelector('#vietreader-panel #vr-pause-icon');
    const label = document.querySelector('#vietreader-panel #vr-pause-label');
    if (!button || !icon || !label) return;
    const paused = isPaused;
    if (paused) {
      icon.classList.remove('vr-pause-symbol');
      icon.replaceChildren(document.createTextNode('▶'));
    } else {
      icon.classList.add('vr-pause-symbol');
      const firstBar = document.createElement('i');
      const secondBar = document.createElement('i');
      icon.replaceChildren(firstBar, secondBar);
    }
    label.textContent = paused ? 'Tiếp tục' : 'Tạm dừng';
    button.setAttribute('aria-label', paused ? 'Tiếp tục đọc' : 'Tạm dừng đọc');
    button.title = paused ? 'Tiếp tục đọc' : 'Tạm dừng đọc';
  }

  function setDisplayText(text) {
    const el = document.querySelector('#vietreader-panel #vr-text');
    if (el) el.textContent = text.length > 700 ? text.slice(0, 700) + '…' : text;
  }

  function isGoogleLanguage() {
    return selectedLanguage === 'vi-google';
  }

  function normaliseLocale(locale) {
    return String(locale || '').replace(/_/g, '-').toLowerCase();
  }

  function voiceMatchesLanguage(voice, languageId) {
    const locale = normaliseLocale(voice.lang);
    if (!locale) return false;
    switch (languageId) {
      case 'en-GB': return locale === 'en-gb' || locale.startsWith('en-gb-');
      case 'en-US': return locale === 'en-us' || locale.startsWith('en-us-');
      case 'zh-CN': return locale === 'zh-cn' || locale.startsWith('zh-cn-') || locale === 'zh-hans' || locale.startsWith('zh-hans-') || locale === 'zh-hans-cn';
      case 'ja-JP': return locale === 'ja-jp' || locale.startsWith('ja-jp-') || locale === 'ja';
      case 'ko-KR': return locale === 'ko-kr' || locale.startsWith('ko-kr-') || locale === 'ko';
      case 'es': return locale === 'es' || locale.startsWith('es-');
      case 'fr': return locale === 'fr' || locale.startsWith('fr-');
      case 'de': return locale === 'de' || locale.startsWith('de-');
      case 'hi-IN': return locale === 'hi-in' || locale.startsWith('hi-in-') || locale === 'hi';
      default: return false;
    }
  }

  function resolveLocalVoice(languageId) {
    const candidates = localVoices.filter(voice => voiceMatchesLanguage(voice, languageId));
    if (!candidates.length) return null;
    const language = LANGUAGES.find(item => item.id === languageId);
    const target = normaliseLocale(language?.locale);
    candidates.sort((a, b) => {
      const score = voice => {
        const actual = normaliseLocale(voice.lang);
        let value = actual === target ? 0 : actual.startsWith(target + '-') ? 1 : 2;
        if (voice.default) value -= 0.3;
        if (voice.localService) value -= 0.1;
        return value;
      };
      return score(a) - score(b) || String(a.name).localeCompare(String(b.name));
    });
    return candidates[0];
  }

  function renderLanguageOptions() {
    const select = document.querySelector('#vietreader-panel #vr-voice');
    if (!select) return;
    select.replaceChildren();
    for (const language of LANGUAGES) {
      const option = document.createElement('option');
      option.value = language.id;
      if (language.type === 'google') {
        option.textContent = language.label;
      } else {
        const voice = resolveLocalVoice(language.id);
        option.textContent = voice ? `${language.label} — ${voice.name}` : `${language.label} — chưa có giọng trên máy`;
        option.disabled = !voice;
      }
      select.appendChild(option);
    }
    select.value = selectedLanguage;
  }

  function loadLocalVoices() {
    const synthesis = window.speechSynthesis;
    const refresh = () => {
      localVoices = synthesis?.getVoices?.() || [];
      renderLanguageOptions();
      refreshStatus();
    };
    refresh();
    if (voiceEventsAttached || !synthesis) return;
    voiceChangeHandler = refresh;
    if (typeof synthesis.addEventListener === 'function') {
      synthesis.addEventListener('voiceschanged', voiceChangeHandler);
    } else {
      previousVoicesChangedHandler = synthesis.onvoiceschanged;
      voiceChangeFallbackHandler = event => {
        if (typeof previousVoicesChangedHandler === 'function') {
          try { previousVoicesChangedHandler.call(synthesis, event); } catch {}
        }
        refresh();
      };
      synthesis.onvoiceschanged = voiceChangeFallbackHandler;
    }
    voiceEventsAttached = true;
  }

  function detachVoiceChangeListener() {
    if (!voiceEventsAttached || !window.speechSynthesis) return;
    const synthesis = window.speechSynthesis;
    if (voiceChangeHandler && typeof synthesis.removeEventListener === 'function') {
      synthesis.removeEventListener('voiceschanged', voiceChangeHandler);
    } else if (synthesis.onvoiceschanged === voiceChangeFallbackHandler) {
      synthesis.onvoiceschanged = previousVoicesChangedHandler || null;
    }
    voiceChangeHandler = null;
    previousVoicesChangedHandler = null;
    voiceChangeFallbackHandler = null;
    voiceEventsAttached = false;
  }

  function refreshStatus() {
    if (isGoogleLanguage()) {
      setStatus('Sẵn sàng dùng giọng Google cho tiếng Việt. Cần kết nối Internet; dịch vụ có thể giới hạn yêu cầu.');
      return;
    }
    const language = LANGUAGES.find(item => item.id === selectedLanguage);
    const voice = resolveLocalVoice(selectedLanguage);
    if (voice) setStatus(`Sẵn sàng đọc bằng giọng có sẵn: ${voice.name} (${voice.lang}).`);
    else setStatus(`Thiết bị chưa cung cấp giọng ${language?.label || selectedLanguage}. VietReader sẽ không tự đổi sang giọng tiếng Anh. Hãy cài giọng tương ứng trong hệ điều hành/Chrome rồi tải lại trang.`);
  }

  // Keep only ranges into currentText, not a second copy of every chunk.
  // This saves memory on long articles while still allowing replay/language changes.
  function splitTextRanges(text, maxLength = 240) {
    const source = String(text || '').replace(/\r/g, '');
    const ranges = [];

    function pushTrimmed(start, end) {
      while (start < end && /\s/.test(source[start])) start++;
      while (end > start && /\s/.test(source[end - 1])) end--;
      if (end > start) ranges.push({ start, end });
    }

    function splitParagraph(start, end) {
      while (start < end && /\s/.test(source[start])) start++;
      while (end > start && /\s/.test(source[end - 1])) end--;
      if (end <= start) return;

      const paragraph = source.slice(start, end);
      const sentencePattern = /[^.!?。！？；;]+[.!?。！？；;]?/g;
      let bufferStart = -1;
      let bufferEnd = -1;
      const flushBuffer = () => {
        if (bufferStart >= 0) pushTrimmed(bufferStart, bufferEnd);
        bufferStart = -1;
        bufferEnd = -1;
      };

      for (const match of paragraph.matchAll(sentencePattern)) {
        let sentenceStart = start + match.index;
        let sentenceEnd = sentenceStart + match[0].length;
        while (sentenceStart < sentenceEnd && /\s/.test(source[sentenceStart])) sentenceStart++;
        while (sentenceEnd > sentenceStart && /\s/.test(source[sentenceEnd - 1])) sentenceEnd--;
        if (sentenceEnd <= sentenceStart) continue;

        if (sentenceEnd - sentenceStart > maxLength) {
          flushBuffer();
          let cursor = sentenceStart;
          while (sentenceEnd - cursor > maxLength) {
            const limit = cursor + maxLength;
            let cut = source.lastIndexOf(' ', limit);
            if (cut < cursor + Math.floor(maxLength * 0.55) || cut <= cursor) cut = limit;
            if (cut > 0 && cut < source.length && /[\uD800-\uDBFF]/.test(source.charAt(cut - 1)) && /[\uDC00-\uDFFF]/.test(source.charAt(cut))) cut--;
            pushTrimmed(cursor, cut);
            cursor = cut;
            while (cursor < sentenceEnd && /\s/.test(source[cursor])) cursor++;
          }
          pushTrimmed(cursor, sentenceEnd);
          continue;
        }

        if (bufferStart >= 0 && sentenceEnd - bufferStart > maxLength) {
          flushBuffer();
          bufferStart = sentenceStart;
        } else if (bufferStart < 0) {
          bufferStart = sentenceStart;
        }
        bufferEnd = sentenceEnd;
      }
      flushBuffer();
    }

    for (const match of source.matchAll(/[^\n]+/g)) {
      splitParagraph(match.index, match.index + match[0].length);
    }
    return ranges;
  }

  function getChunkText(index) {
    const range = chunkRanges[index];
    return range ? currentText.slice(range.start, range.end).replace(/[ \t]+/g, ' ').trim() : '';
  }

  async function startFromBeginning() {
    if (!currentText) return;
    await panelInitPromise;
    if (!currentText) return;
    stopPlaybackOnly();
    session++;
    googlePendingSession = null;
    googleAudioCache = new Map();
    googleAudioPromises = new Map();
    currentIndex = 0;
    isPaused = false;
    updatePauseButton();
    const maxLength = isGoogleLanguage() ? 170 : 260;
    chunkRanges = splitTextRanges(currentText, maxLength);
    speakNext(session);
  }

  function speakNext(activeSession) {
    if (activeSession !== session) return;
    if (currentIndex >= chunkRanges.length) {
      setStatus('Đã đọc xong.');
      isPaused = false;
      updatePauseButton();
      return;
    }
    if (isGoogleLanguage()) speakGoogleChunk(activeSession);
    else speakLocalChunk(activeSession);
  }

  function pruneGoogleAudioCache() {
    for (const index of googleAudioCache.keys()) {
      if (index < currentIndex || index > currentIndex + 1) googleAudioCache.delete(index);
    }
    while (googleAudioCache.size > 2) {
      const oldest = Math.min(...googleAudioCache.keys());
      googleAudioCache.delete(oldest);
    }
  }

  function requestGoogleAudio(index, activeSession) {
    if (activeSession !== session || index < 0 || index >= chunkRanges.length) {
      return Promise.resolve(null);
    }
    if (googleAudioCache.has(index)) return Promise.resolve(googleAudioCache.get(index));
    if (googleAudioPromises.has(index)) return googleAudioPromises.get(index);

    const cacheForRequest = googleAudioCache;
    const pendingForRequest = googleAudioPromises;
    const requestId = `${contentInstanceId}:${activeSession}:${index}`;
    pendingGoogleRequestIds.add(requestId);
    const request = chrome.runtime.sendMessage({
      type: 'VR_GOOGLE_TTS',
      requestId,
      text: getChunkText(index)
    }).then(result => {
      if (activeSession !== session) return null;
      const normalized = result?.ok && result.audioBase64
        ? { ok: true, audioBase64: result.audioBase64 }
        : { ok: false, error: result?.error || 'Không tạo được âm thanh tiếng Việt.' };
      // Keep only the currently playing chunk and at most one next chunk in memory.
      if (index >= currentIndex && index <= currentIndex + 1) {
        cacheForRequest.set(index, normalized);
        pruneGoogleAudioCache();
      }
      return normalized;
    }).catch(error => {
      if (activeSession !== session) return null;
      const normalized = { ok: false, error: error?.message || 'Không thể kết nối tới dịch vụ giọng Google.' };
      if (index >= currentIndex && index <= currentIndex + 1) {
        cacheForRequest.set(index, normalized);
        pruneGoogleAudioCache();
      }
      return normalized;
    }).finally(() => {
      pendingGoogleRequestIds.delete(requestId);
      if (pendingForRequest.get(index) === request) pendingForRequest.delete(index);
    });

    pendingForRequest.set(index, request);
    return request;
  }

  function speakGoogleChunk(activeSession) {
    if (activeSession !== session || googlePendingSession === activeSession) return;
    const index = currentIndex;
    googlePendingSession = activeSession;
    setStatus(`Đang chuẩn bị phần âm thanh ${index + 1}/${chunkRanges.length}…`);

    requestGoogleAudio(index, activeSession).then(result => {
      if (activeSession !== session || !result) return;
      if (googlePendingSession === activeSession) googlePendingSession = null;

      if (!result.ok || !result.audioBase64) {
        setStatus(result.error || 'Không tạo được âm thanh tiếng Việt.');
        return;
      }

      let audioUrl;
      try {
        const binary = atob(result.audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        audioUrl = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
      } catch {
        googleAudioCache.delete(index);
        setStatus('Không thể chuẩn bị âm thanh tiếng Việt. Hãy nhấn Đọc lại để thử lại.');
        return;
      }
      // The Blob URL can be revoked after playback; this avoids keeping a large data: URL alive.
      googleAudioCache.delete(index);
      pruneGoogleAudioCache();
      const audio = new Audio(audioUrl);
      currentAudio = audio;
      currentAudioUrl = audioUrl;
      audio.preload = 'auto';
      audio.playbackRate = rate;
      audio.onplay = () => setStatus('');
      audio.onended = () => {
        if (activeSession !== session) return;
        releaseAudio(audio);
        currentIndex = index + 1;
        pruneGoogleAudioCache();
        if (!isPaused) speakNext(activeSession);
      };
      audio.onerror = () => {
        if (activeSession !== session) return;
        releaseAudio(audio);
        setStatus('Không phát được âm thanh trả về từ Google. Hãy thử đọc lại hoặc kiểm tra kết nối mạng.');
      };

      // Keep only one audio request ahead to limit network work and retained audio data.
      if (index + 1 < chunkRanges.length) requestGoogleAudio(index + 1, activeSession);

      if (isPaused) {
        setStatus('Đã tạm dừng. Nhấn Tiếp tục để phát đoạn âm thanh đã tải.');
        return;
      }
      return audio.play().catch(() => {
        if (activeSession === session) setStatus('Chrome đã chặn phát âm thanh tự động. Hãy nhấn “Đọc lại” để thử phát lại.');
      });
    }).catch(error => {
      if (activeSession !== session) return;
      if (googlePendingSession === activeSession) googlePendingSession = null;
      setStatus('Lỗi tải giọng Google: ' + (error?.message || 'không rõ nguyên nhân'));
    });
  }

  function speakLocalChunk(activeSession) {
    if (activeSession !== session) return;
    const voice = resolveLocalVoice(selectedLanguage);
    const language = LANGUAGES.find(item => item.id === selectedLanguage);
    if (!voice) {
      setStatus(`Không thể đọc: máy chưa có giọng ${language?.label || selectedLanguage}. Tôi không chuyển sang tiếng Anh để tránh đọc sai ngôn ngữ.`);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(getChunkText(currentIndex));
    utterance.voice = voice;
    utterance.lang = String(voice.lang || language.locale).replace(/_/g, '-');
    utterance.rate = rate;
    utterance.onstart = () => setStatus(`Đang đọc đoạn ${currentIndex + 1}/${chunkRanges.length} · ${voice.name} (${voice.lang})`);
    utterance.onend = () => {
      if (activeSession !== session) return;
      currentIndex++;
      if (!isPaused) speakNext(activeSession);
    };
    utterance.onerror = event => {
      if (activeSession === session && event.error !== 'canceled' && event.error !== 'interrupted') {
        setStatus('Lỗi phát giọng trên thiết bị: ' + event.error);
      }
    };
    window.speechSynthesis.speak(utterance);
  }

  function togglePause() {
    if (isGoogleLanguage()) {
      if (currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        isPaused = true;
        updatePauseButton();
        setStatus('Đã tạm dừng.');
        return;
      }
      if (currentAudio && currentAudio.paused) {
        isPaused = false;
        updatePauseButton();
        currentAudio.play().catch(() => setStatus('Không thể tiếp tục âm thanh. Hãy nhấn Đọc lại để thử lại.'));
        return;
      }
      if (!isPaused) {
        isPaused = true;
        updatePauseButton();
        setStatus('Đã yêu cầu tạm dừng. Đang chờ đoạn âm thanh hiện tại tải xong…');
      } else {
        isPaused = false;
        updatePauseButton();
        if (googlePendingSession !== session) speakNext(session);
        else setStatus('Đang chờ đoạn âm thanh tải xong…');
      }
      return;
    }

    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      isPaused = true;
      updatePauseButton();
      setStatus('Đã tạm dừng.');
    } else if (window.speechSynthesis.paused) {
      isPaused = false;
      updatePauseButton();
      window.speechSynthesis.resume();
    }
  }

  function releaseAudio(audio = currentAudio) {
    if (!audio) return;
    audio.onended = null;
    audio.onerror = null;
    audio.onplay = null;
    try {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    } catch {}
    if (currentAudioUrl) {
      try { URL.revokeObjectURL(currentAudioUrl); } catch {}
      currentAudioUrl = '';
    }
    if (currentAudio === audio) currentAudio = null;
  }

  function cancelPendingGoogleRequests() {
    for (const requestId of pendingGoogleRequestIds) {
      try {
        chrome.runtime.sendMessage({ type: 'VR_CANCEL_GOOGLE_TTS', requestId }).catch(() => {});
      } catch {}
    }
    pendingGoogleRequestIds.clear();
  }

  function stopPlaybackOnly() {
    cancelPendingGoogleRequests();
    try { window.speechSynthesis?.cancel(); } catch {}
    releaseAudio();
    googleAudioCache.clear();
    googleAudioPromises.clear();
  }

  function stop() {
    session++;
    googlePendingSession = null;
    stopPlaybackOnly();
    isPaused = false;
    updatePauseButton();
    currentIndex = 0;
    setStatus('Đã dừng.');
  }

  function normalizeSelectedText(text) {
    // Các xuống dòng đơn trong Selection thường là ngắt dòng hiển thị, không phải đoạn văn mới.
    // Chỉ giữ ngắt đoạn kép; các dòng mềm được nối bằng một dấu cách để giọng đọc liền mạch.
    return String(text || '')
      .replace(/\r\n?/g, '\n')
      .split(/\n{2,}/)
      .map(paragraph => paragraph.replace(/[ \t]*\n[ \t]*/g, ' ').replace(/[ \t]+/g, ' ').trim())
      .filter(Boolean)
      .join('\n\n')
      .trim();
  }

  function getStructuredSelectionText(fallbackText) {
    const selection = window.getSelection?.();
    if (!selection || !selection.rangeCount || !selection.toString().trim()) {
      return normalizeSelectedText(fallbackText);
    }

    try {
      const fragment = selection.getRangeAt(0).cloneContents();
      const paragraphTags = new Set(['P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'DT', 'DD', 'FIGCAPTION']);
      const extractNode = node => {
        if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || '';
        if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return '';
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR') return '\n';
        const childrenText = [...node.childNodes].map(extractNode).join('');
        if (node.nodeType === Node.ELEMENT_NODE && paragraphTags.has(node.tagName)) {
          return `\n\n${childrenText}\n\n`;
        }
        return childrenText;
      };
      const structured = extractNode(fragment).replace(/\n{3,}/g, '\n\n');
      const cleanStructured = normalizeSelectedText(structured);
      const cleanFallback = normalizeSelectedText(fallbackText);
      // Ensure the live Selection still corresponds to the item clicked in Chrome's context menu.
      const compact = value => value.replace(/\s+/g, ' ').trim();
      if (cleanStructured && (!cleanFallback || compact(cleanStructured) === compact(cleanFallback))) {
        return cleanStructured;
      }
    } catch {}

    return normalizeSelectedText(fallbackText);
  }

  function readText(text, isSelection = false) {
    const clean = isSelection
      ? getStructuredSelectionText(text)
      : String(text || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    if (!clean) { ensurePanel(); setStatus('Không tìm thấy văn bản để đọc.'); return; }
    ensurePanel();
    currentText = clean;
    setDisplayText(clean);
    startFromBeginning();
  }

  function extractMainText() {
    const preferred = document.querySelectorAll('article, main, [role="main"], .article-content, .article__content, .content-detail, .detail-content, .news-content, .post-content, #content, #article-body');
    let bestText = '';
    for (const node of preferred) {
      const candidateText = (node.innerText || '').trim();
      if (candidateText.length > bestText.length) bestText = candidateText;
    }
    const hadPreferredContainer = preferred.length > 0;
    if (!hadPreferredContainer) bestText = (document.body?.innerText || '').trim();

    if (!hadPreferredContainer || bestText.length < 250) {
      const paragraphs = [];
      for (const p of document.querySelectorAll('p')) {
        if (!p.getClientRects().length) continue;
        const paragraphText = (p.innerText || '').trim();
        if (paragraphText.length > 45) paragraphs.push({ text: paragraphText, length: paragraphText.length });
      }
      // Keep only a bounded number of the most useful paragraphs, but restore DOM order.
      if (paragraphs.length > 80) {
        const keep = new Set([...paragraphs].sort((a, b) => b.length - a.length).slice(0, 80));
        bestText = paragraphs.filter(item => keep.has(item)).map(item => item.text).join('\n\n');
      } else {
        bestText = paragraphs.map(item => item.text).join('\n\n');
      }
    }
    const title = document.querySelector('h1')?.innerText?.trim();
    if (title && bestText && !bestText.startsWith(title)) bestText = title + '\n\n' + bestText;
    return bestText;
  }

  chrome.runtime.onMessage.addListener(message => {
    if (message?.type === 'VR_READ_TEXT') readText(message.text, message.source === 'selection');
    if (message?.type === 'VR_READ_PAGE') readText(extractMainText());
  });
})();
