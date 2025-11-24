<script setup>
import Navbar from './Navbar.vue'
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSearchStore } from '../stores/useSearchStore';
import { useAlert } from '../SweetAlert';
import apiClient from '../utils/axios';
import { useAnimations } from '../composables/useAnimations';
import { useTurnstile } from '../composables/useTurnstile';
import { useInputStore } from '../stores/useInputStore';

const inputStore = useInputStore();

const searchQuery = ref('');
const router = useRouter();
const searchStore = useSearchStore();
const { showLoading, closeLoading, showWarning, updateLoading } = useAlert();
const {  searchBoxAnimation} = useAnimations();
const { renderTurnstile, initTurnstile, hasValidToken, getCurrentToken } = useTurnstile();
const turnstileWidgetId = ref(null);
const canSubmit = ref(false);

// 備用警告方法，以防 SweetAlert 出現問題
const safeShowWarning = (title, text) => {
  try {
    return showWarning(title, text);
  } catch (error) {
    // console.error('SweetAlert 錯誤:', error);
    // 使用原生 alert 作為備用
    alert(`${title}\n${text}`);
    return Promise.resolve();
  }
};

onMounted(async ()=>{
    searchBoxAnimation('.searchBar')
    
    // 使用新的 token 檢查機制
    if (!inputStore.token || !inputStore.checkTokenValidity()) {
        // console.log('❌ 使用者未登入或 Token 已過期，跳轉到登入頁');
        await safeShowWarning(
            inputStore.token ? 'Token 已過期' : '請先登入',
            inputStore.token ? '您的登入已過期，請重新登入' : '您需要登入才能免費使用個人化搜尋'
        );
        router.push('/login');
    } else {
        // console.log('✅ 使用者已登入:', inputStore.userInfo.name);
        
        // 顯示 token 剩餘時間（開發階段除錯用）
        const tokenInfo = inputStore.tokenInfo;
        if (tokenInfo) {
            // console.log(`⏰ Token 剩餘時間: ${tokenInfo.remainingHours} 小時 ${tokenInfo.remainingMinutes % 60} 分鐘`);
        }
        
        // 初始化 Turnstile
        await initTurnstile();
        
        // 渲染 Turnstile 小工具
        turnstileWidgetId.value = await renderTurnstile(
            'turnstile-widget-recommend',
            (token) => {
                canSubmit.value = true;
                // console.log('✅ Turnstile 驗證成功');
            },
            (error) => {
                canSubmit.value = false;
                // console.error('❌ Turnstile 驗證失敗:', error);
            }
        );
    }
})

async function handleSearch(){
    if(searchQuery.value.trim() === '') {
        await safeShowWarning('請輸入商品型號或關鍵字，例如：iphone 17', '搜尋欄位不能為空！');
        return;
    }
    
    if (!canSubmit.value) {
        await safeShowWarning('請先完成安全驗證', '需要通過 Turnstile 驗證才能搜尋');
        return;
    }
    
    showLoading('努力搜尋中...')
    try{
        updateLoading(5);
        
        // 取得 Turnstile token
        const turnstileToken = getCurrentToken();
        
        updateLoading(15);
        
        // 準備請求資料
        const requestData = {
            "keyword": searchQuery.value,
            "turnstile_token": turnstileToken
        };
        
        // console.log('✅ 已包含 Turnstile token 在搜尋請求中');
        
        const response = await apiClient.post(
            '/api/search/',
            requestData,
            {
                headers: {
                    'Content-Type': 'application/json'
                    // Authorization header 會由 axios 攔截器自動添加
                },
                onDownloadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        // 將下載進度映射到 20% - 80%
                        const percentCompleted = Math.round(
                            (progressEvent.loaded * 60) / progressEvent.total + 20
                        );
                        updateLoading(percentCompleted);
                        // console.log('下載進度:', percentCompleted);
                    } else {
                        // 如果沒有 total，使用假進度
                        updateLoading(50);
                    }
                }
            }
        );

        const data = response.data;
        // console.log(data);
        updateLoading(85);  // 資料處理中
        searchStore.saveSearchResults(data);
        updateLoading(95);
        // 稍微延遲，讓進度條到達 100%
        await new Promise(resolve => setTimeout(resolve, 200));
        updateLoading(100);
        
        // 再延遲一下讓使用者看到 100%
        await new Promise(resolve => setTimeout(resolve, 300));
        closeLoading()
        router.push('/searchPagecache')
    }catch(error){
        // console.error('搜尋錯誤:', error);
        closeLoading();
        
        // 檢查是否為 429 錯誤 (Gemini 忙碌)
        if (error.response && error.response.status === 429) {
            await safeShowWarning("抱歉，目前Gemini 忙碌中", "請稍後再試");
            return;
        }
        
        // 檢查是否為 Turnstile 相關錯誤
        if (error.response && error.response.status === 403) {
            const errorData = error.response.data;
            if (errorData.error && errorData.error.includes('Turnstile')) {
                await safeShowWarning(
                    "🤖 安全驗證失敗", 
                    "為了防止機器人攻擊，請稍後再試。如果問題持續發生，請刷新網頁。"
                );
                // 使用者點擊確定後刷新網頁
                window.location.reload();
                return;
            }
        }
        
        // 檢查錯誤訊息中是否包含 API 錯誤標記
        const errorMessage = error.response?.data?.error || error.message || '';
        if (errorMessage.includes('API 請求頻率過高') || errorMessage.includes('429')) {
            await safeShowWarning("抱歉，目前Gemini 忙碌中", "請稍後再試");
            return;
        }
        
        await safeShowWarning("QQ 沒找到相關資訊!", "請檢查您的輸入是否有拼寫錯誤，或嘗試使用不同的關鍵詞進行搜索。");
    }
}


</script>

<template>
    <div class="searchPage">
        <Navbar />
        <p>買前先掃這一頁
        <br>
        踩雷從此是別人的夜</p>
        <form @submit.prevent="handleSearch">
            <div class="searchBar">
                <input v-model="searchQuery" type="text" placeholder="請輸入商品型號或關鍵字，例如：iphone 17" class="searchInput">
                <button type="submit" :disabled="!canSubmit" :class="{ disabled: !canSubmit }">
                    <i class="fa-solid fa-magnifying-glass"></i>
                </button>
            </div>
            
            <div class="turnstile-container">
                <div id="turnstile-widget"></div>
            </div>
        </form>
    </div>
    
</template>


<style lang="scss" scoped>
$word-color: #2F2F2F;
.searchPage{
    background-image: url('../assets/background.png');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    min-height: 100vh;
    width: 100vw;
    background-attachment: fixed;
    top: 0;
    left: 0;
}
p{
    margin-top: 8rem;
    margin-bottom: 2.5rem;
    font-size: 2.5rem;
    font-weight: 450;
    text-align: center;
    color: $word-color;
    @media screen and (max-width: 520px) {
        font-size: 1.5rem;
        // margin-top: 4rem;
        
    }
}
form{
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    .searchBar{
        position: relative;
        width: 50%;
        min-width: 300px; /* 正常狀態下的最小寬度 */
        input.searchInput{
        padding: 1.25rem 4rem 1.25rem 1.5rem;
        width: 100%;
        background-color: #EFECE9;
        border: 2px solid #B5B8A3;
        border-radius: 50px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        font-size: 1.2rem;
        margin-top: 1rem;
        @media screen and (max-width: 520px) {
            padding: 1rem 4rem 1rem 1.25rem;
            font-size: 1rem;
        }
        &:focus{
            outline: none;
        }
        }
        button{
            position: absolute;
            right: 10px;
            top: 60%;
            transform: translateY(-50%);
            background-color: transparent;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            font-size: 1.5rem;
            transition: all 0.3s ease;
            &:hover{
                background-color: rgba(154, 167, 184, 0.1);
            }
            i{
                color: #7E90A7;
            }
            
            &.disabled {
                opacity: 0.5;
                cursor: not-allowed;
                
                &:hover {
                    background-color: transparent;
                }
            }
        }
    }
    
    .turnstile-container {
        display: flex;
        justify-content: center;
        margin-top: 1.5rem;
        
        #turnstile-widget {
            transform: scale(0.9);
            transform-origin: center;
        }
        
        @media screen and (max-width: 520px) {
            margin-top: 1rem;
            
            #turnstile-widget {
                transform: scale(0.8);
            }
        }
    }
}

</style>

