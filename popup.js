const button = document.getElementById('read-page');
const message = document.getElementById('message');

button.addEventListener('click', async () => {
  message.textContent = 'Đang chuẩn bị bộ đọc…';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('Không tìm thấy tab hiện tại.');
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    await chrome.tabs.sendMessage(tab.id, { type: 'VR_READ_PAGE' });
    message.textContent = 'Đã mở bộ điều khiển đọc trên trang.';
    window.close();
  } catch {
    message.textContent = 'Trang này không cho phép extension chạy (ví dụ chrome:// hoặc Chrome Web Store).';
  }
});