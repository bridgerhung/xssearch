import axios from 'axios';
import { useInputStore } from '../stores/useInputStore';

// 創建 axios 實例
const apiClient = axios.create({
  baseURL: 'https://api.brid.pw',
  timeout: 90000, // 90 秒超時 (RAG 推薦需要更長時間)
});

// 請求攔截器：自動添加 Authorization header 並檢查 token
apiClient.interceptors.request.use(
  (config) => {
    const inputStore = useInputStore();
    
    // 檢查 token 是否存在且有效
    if (inputStore.token) {
      // 檢查 token 是否過期
      if (inputStore.isTokenExpired()) {
        // console.log('🚫 請求被拒絕：Token 已過期');
        inputStore.removeToken();
        
        // 觸發 token 過期事件
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('token-expired'));
        }
        
        // 拒絕請求
        return Promise.reject(new Error('Token 已過期'));
      }
      
      // 添加 Authorization header
      config.headers.Authorization = `Bearer ${inputStore.token}`;
      // console.log('✅ 已添加 Authorization header');
    }
    
    return config;
  },
  (error) => {
    // console.error('❌ 請求攔截器錯誤:', error);
    return Promise.reject(error);
  }
);

// 回應攔截器：處理 401 錯誤
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const inputStore = useInputStore();
    
    // 檢查是否為 401 未授權錯誤
    if (error.response && error.response.status === 401) {
      // console.log('🚫 收到 401 錯誤，自動清除 Token 並跳轉登入');
      
      // 清除過期或無效的 token
      inputStore.removeToken();
      
      // 觸發 token 過期事件讓 main.js 處理跳轉
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('token-expired'));
        // console.log('💡 提示：請重新登入');
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;