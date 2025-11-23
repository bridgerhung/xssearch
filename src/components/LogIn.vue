<script setup>
import { useRouter } from 'vue-router';
import { ref, onMounted } from 'vue';
import googleLogin from './googleLogin.vue';
import { useTurnstile } from '../composables/useTurnstile';
import { useInputStore } from '../stores/useInputStore';
import Navbar from './Navbar.vue';

const router = useRouter();
const inputStore = useInputStore();
const email = ref('');
const password = ref('');
const { renderTurnstile, initTurnstile, hasValidToken, resetTurnstile , getCurrentToken } = useTurnstile();
const turnstileWidgetId = ref(null);
const canShowGoogleLogin = ref(false);
const turnstileStatus = ref('等待驗證...');
const googleLoginRef = ref(null);
const isTestLoginLoading = ref(false);

function handleLogin(){
    router.push('/search');
}

// 測試帳號登入
async function handleTestLogin() {
    if (!checkTokenStatus()) {
        alert('請先完成機器人驗證！');
        return;
    }
    
    // 設置載入狀態
    isTestLoginLoading.value = true;
    
    try {
        // 使用固定的Premium測試帳號
        const testAccount = {
            google_id: "test_premium_user_12345",
            name: "測試用戶 Premium",
            email: "test-premium@yuntech.dev",
            permission: true
        };
        
        // console.log('🧪 使用測試帳號登入:', testAccount.email);
        
        // 獲取 Turnstile token
        const turnstileToken = getCurrentToken();
        
        // 調用 googleLogin 組件的測試帳號登入方法
        await googleLoginRef.value.loginWithTestAccount(testAccount, turnstileToken);
        
    } catch (error) {
        // console.error('❌ 測試帳號登入錯誤:', error);
        alert(`測試帳號登入失敗：${error.message}`);
    } finally {
        // 結束載入狀態
        isTestLoginLoading.value = false;
    }
}

// 重新驗證 Turnstile
function retryTurnstile() {
    // console.log('🔄 重試 Turnstile 驗證...');
    //debugTurnstileState();
    
    if (turnstileWidgetId.value) {
        resetTurnstile(turnstileWidgetId.value);
        canShowGoogleLogin.value = false;
        turnstileStatus.value = '等待驗證...';
    }
}

// 檢查 token 狀態
function checkTokenStatus() {
    const hasToken = hasValidToken();
    // console.log('🔍 檢查 Turnstile token 狀態:', hasToken);
    if (!hasToken && canShowGoogleLogin.value) {
        // console.warn('⚠️ Token 已失效，需要重新驗證');
        canShowGoogleLogin.value = false;
        turnstileStatus.value = 'Token 已過期，請重新驗證';
    }
    return hasToken;
}

onMounted(async () => {
    // console.log('📝 登入頁面 onMounted 被呼叫');
    
    // 初始化 Turnstile
    await initTurnstile();
    
    //debugTurnstileState();
    
    // 渲柔 Turnstile 小工具
    turnstileWidgetId.value = await renderTurnstile(
        'turnstile-widget-login',
        (token) => {
            canShowGoogleLogin.value = true;
            turnstileStatus.value = '驗證成功！現在可以登入';
            // console.log('✅ Turnstile 驗證成功，顯示 Google 登入');
            // console.log('🎫 新 Token:', token.substring(0, 20) + '...');
            
            // 立即檢查 token 是否正確儲存
            setTimeout(() => {
                const storedToken = getCurrentToken();
                // console.log('🔍 驗證後檢查 token 狀態:', storedToken ? '已儲存' : '未儲存');
                //debugTurnstileState();
            }, 100);
        },
        (error) => {
            canShowGoogleLogin.value = false;
            turnstileStatus.value = '驗證失敗，請重試';
            // console.error('❌ Turnstile 驗證失敗:', error);
        }
    );
});
</script>

<template>
<Navbar />
<section class="registerPage">
    <div class="login">
        <div class="google">
            登入即註冊
        </div>
        
        <!-- Turnstile 驗證小工具 -->
        <div class="turnstile-container">
            <div id="turnstile-widget-login"></div>
        </div>
        
        <!-- 只有在 Turnstile 驗證成功後才顯示 Google 登入 -->
        <div v-if="canShowGoogleLogin" class="google-login-container">
            <googleLogin ref="googleLoginRef" />
            
            <!-- 測試帳號登入按鈕 
            <div class="test-login-section">
                <div class="divider">或</div>
                <button @click="handleTestLogin" class="test-login-btn" :disabled="isTestLoginLoading">
                    <span v-if="!isTestLoginLoading">🧪 測試用帳號登入</span>
                    <span v-else>⚙️ 登入中...</span>
                </button>
                <p v-if="isTestLoginLoading" class="loading-text">登入中，請稍待</p>
            </div> -->
        </div>
        
        <!-- 未完成驗證的提示 -->
        <div v-if="!canShowGoogleLogin" class="verification-hint">
            <p>{{ turnstileStatus }}</p>
            <button 
                v-if="turnstileStatus.includes('失敗') || turnstileStatus.includes('過期')" 
                @click="retryTurnstile" 
                class="retry-btn"
            >
                🔄 重新驗證
            </button>
        </div>
    </div>
</section>
</template>


<style lang="scss" scoped>
$word-color:#2F2F2F;
section.registerPage{
    background-image: url('../assets/background.png');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    min-height: 100vh;
    width: 100vw;
    top: 0;
    left: 0;
    box-sizing: border-box;
    color: $word-color;
    
    div.login{
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        
        div.google{
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-size: 2.5rem;
            padding: 8rem 0 0 0;
        }
        
        .turnstile-container {
            margin-top: 3rem;
            display: flex;
            justify-content: center;
            
            #turnstile-widget-login {
                transform: scale(0.9);
                transform-origin: center;
            }
            
            @media screen and (max-width: 520px) {
                margin-top: 2rem;
                
                #turnstile-widget-login {
                    transform: scale(0.8);
                }
            }
        }
        
        .google-login-container {
            margin-top: 2rem;
            opacity: 1;
            transition: opacity 0.3s ease-in;
        }
        
        .verification-hint {
            margin-top: 2rem;
            text-align: center;
            color: #666;
            font-size: 1.1rem;
            
            p {
                margin: 0 0 1rem 0;
            }
            
            .retry-btn {
                background-color: #f59e0b;
                color: white;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 0.375rem;
                cursor: pointer;
                font-size: 0.9rem;
                transition: background-color 0.2s;
                
                &:hover {
                    background-color: #d97706;
                }
            }
        }
        
        .test-login-section {
            margin-top: 2rem;
            text-align: center;
            
            .divider {
                margin: 1.5rem 0;
                color: #9ca3af;
                font-size: 0.9rem;
                position: relative;
                
                &:before, &:after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    width: 45%;
                    height: 1px;
                    background-color: #d1d5db;
                }
                
                &:before {
                    left: 0;
                }
                
                &:after {
                    right: 0;
                }
            }
            
            .test-login-btn {
                background-color: #f3f4f6;
                color: $word-color;
                border: 2px solid #d1d5db;
                padding: 0.75rem 1.5rem;
                border-radius: 0.375rem;
                cursor: pointer;
                font-size: 0.95rem;
                font-weight: 500;
                transition: all 0.2s;
                
                &:hover:not(:disabled) {
                    background-color: #e5e7eb;
                    border-color: #9ca3af;
                }
                
                &:active:not(:disabled) {
                    background-color: #d1d5db;
                }
                
                &:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                    background-color: #f9fafb;
                }
            }
            
            .loading-text {
                margin-top: 0.75rem;
                font-size: 0.85rem;
                color: #6b7280;
                font-style: italic;
            }
            
            .test-account-info {
                margin-top: 1rem;
                font-size: 0.8rem;
                color: #6b7280;
                line-height: 1.4;
            }
        }
    }
}

</style>
