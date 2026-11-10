const MENU_ID = 'vietreader-read-selection';
const GOOGLE_TTS_ENDPOINT = 'https://translate.google.com/translate_tts';
const MAX_GOOGLE_CHUNK_LENGTH = 180;
const activeGoogleRequests = new Map();

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: 'Đọc văn bản đã chọn bằng VietReader',
      contexts: ['selection']
    });
  });
});

async function injectAndSend(tabId, message) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    console.warn('VietReader không thể chạy trên tab này:', error);
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab?.id || !info.selectionText?.trim()) return;
  injectAndSend(tab.id, { type: 'VR_READ_TEXT', text: info.selectionText.trim(), source: 'selection' });
});

function toBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

async function synthesizeGoogleVietnamese({ text, requestId }) {
  const cleanText = String(text || '').trim();
  if (!cleanText) throw new Error('Không có văn bản để đọc.');
  if (cleanText.length > MAX_GOOGLE_CHUNK_LENGTH) {
    throw new Error(`Đoạn gửi tới giọng Google quá dài (${MAX_GOOGLE_CHUNK_LENGTH} ký tự tối đa). VietReader sẽ tự chia đoạn; hãy tải lại trang nếu lỗi này vẫn xuất hiện.`);
  }

  const url = new URL(GOOGLE_TTS_ENDPOINT);
  url.searchParams.set('ie', 'UTF-8');
  url.searchParams.set('q', cleanText);
  url.searchParams.set('tl', 'vi');
  url.searchParams.set('client', 'tw-ob');

  const controller = new AbortController();
  if (requestId) activeGoogleRequests.set(requestId, controller);
  try {
    let response;
    try {
      response = await fetch(url.toString(), {
        method: 'GET',
        cache: 'no-store',
        credentials: 'omit',
        redirect: 'follow',
        headers: { Accept: 'audio/mpeg, audio/*;q=0.9, */*;q=0.8' },
        signal: controller.signal
      });
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      throw new Error('Không kết nối được giọng Google. Hãy kiểm tra Internet hoặc thử lại sau.');
    }

    if (response.status === 403 || response.status === 429) {
      throw new Error('Dịch vụ giọng Google đã từ chối hoặc giới hạn yêu cầu. Hãy đợi một lúc rồi thử lại. Đây là dịch vụ không có API công khai chính thức nên có thể thay đổi.');
    }
    if (!response.ok) {
      throw new Error(`Dịch vụ giọng Google phản hồi HTTP ${response.status}. Hãy thử lại sau.`);
    }

    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    const audio = await response.arrayBuffer();
    if (audio.byteLength < 128 || contentType.includes('text/html') || contentType.includes('application/json')) {
      throw new Error('Google không trả về âm thanh hợp lệ. Dịch vụ có thể đã thay đổi hoặc tạm thời không khả dụng.');
    }

    return { audioBase64: toBase64(audio) };
  } finally {
    if (requestId && activeGoogleRequests.get(requestId) === controller) activeGoogleRequests.delete(requestId);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'VR_CANCEL_GOOGLE_TTS' && message.requestId) {
    activeGoogleRequests.get(message.requestId)?.abort();
    activeGoogleRequests.delete(message.requestId);
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type === 'VR_GOOGLE_TTS') {
    synthesizeGoogleVietnamese(message)
      .then(result => sendResponse({ ok: true, ...result }))
      .catch(error => {
        if (error?.name === 'AbortError') sendResponse({ ok: false, error: 'Đã hủy yêu cầu đọc.' });
        else sendResponse({ ok: false, error: error?.message || 'Không tạo được giọng đọc tiếng Việt.' });
      });
    return true;
  }
  return false;
});
