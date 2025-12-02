/**
 * 前端 XSS 防護工具
 * 用於在用戶輸入時進行初步過濾和顯示時進行安全轉置
 */

/**
 * HTML 轉置字典
 */
const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;'
};

/**
 * 轉置 HTML 字元以防止 XSS
 * @param {string} text - 要轉置的文本
 * @returns {string} - 轉置後的安全文本
 */
export function escapeHtml(text) {
  if (typeof text !== 'string') {
    return String(text || '');
  }
  
  return text.replace(/[&<>"'\/]/g, (match) => HTML_ENTITIES[match]);
}

/**
 * 清理用戶輸入，移除潛在的危險字元
 * @param {string} input - 用戶輸入
 * @returns {string} - 清理後的輸入
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return String(input || '');
  }
  
  // 移除潛在的 script 標籤
  let cleaned = input.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // 移除事件處理器
  cleaned = cleaned.replace(/on\w+\s*=/gi, '');
  
  // 移除 javascript: 協議
  cleaned = cleaned.replace(/javascript:/gi, '');
  
  // 移除 vbscript: 協議
  cleaned = cleaned.replace(/vbscript:/gi, '');
  
  // 移除其他危險標籤
  cleaned = cleaned.replace(/<(iframe|object|embed|link|style)[^>]*>/gi, '');
  
  return cleaned.trim();
}

/**
 * 驗證輸入長度（區分英文和中文）
 * @param {string} text - 要驗證的文本
 * @param {number} maxEnglish - 英文字元最大長度
 * @param {number} maxChinese - 中文字元最大長度
 * @returns {boolean} - 是否通過驗證
 */
export function validateInputLength(text, maxEnglish = 20, maxChinese = 25) {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  // 計算英文和中文字符數
  const englishMatches = text.match(/[a-zA-Z0-9\s]/g) || [];
  const chineseMatches = text.match(/[\u4e00-\u9fff]/g) || [];
  
  const englishCount = englishMatches.length;
  const chineseCount = chineseMatches.length;
  
  // 檢查是否超過限制
  if (englishCount > maxEnglish || chineseCount > maxChinese) {
    return false;
  }
  
  // 總長度不應超過兩者之和
  if (text.length > maxEnglish + maxChinese) {
    return false;
  }
  
  return true;
}

/**
 * 安全地設置 innerHTML，自動轉置 HTML 字元
 * @param {HTMLElement} element - 目標元素
 * @param {string} content - 要設置的內容
 */
export function safeSetInnerHTML(element, content) {
  if (!element || typeof content !== 'string') {
    return;
  }
  
  element.textContent = content; // 使用 textContent 而非 innerHTML
}

/**
 * 對 Vue 模板中的文本進行安全轉置
 * @param {string} text - 要顯示的文本
 * @returns {string} - 轉置後的安全文本
 */
export function safeDisplayText(text) {
  return escapeHtml(String(text || ''));
}