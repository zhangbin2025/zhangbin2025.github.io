/**
 * 统一认证工具函数
 * 提供 Token 管理和带认证的请求
 */

const TOKEN_KEY = 'weiqi_token';

// GitHub Pages 上的域名配置
const DOMAIN_JS_URL = 'https://weiqi-dev.github.io/weiqi-assets/js/domain.js';
const DOMAIN_CACHE_KEY = 'weiqi_api_domain';
const DOMAIN_CACHE_TIME_KEY = 'weiqi_api_domain_time';
const CACHE_MAX_AGE = 10 * 60 * 1000; // 10分钟缓存

// ========== 微信浏览器兼容性：存储检测 ==========
let storageAvailable = false;
let storageType = 'localStorage';

// 测试 localStorage 是否可用
try {
    const testKey = '__test_storage__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    storageAvailable = true;
} catch (e) {
    console.warn('localStorage 不可用，尝试使用 sessionStorage');
    try {
        const testKey = '__test_storage__';
        sessionStorage.setItem(testKey, 'test');
        sessionStorage.removeItem(testKey);
        storageAvailable = true;
        storageType = 'sessionStorage';
    } catch (e2) {
        console.warn('sessionStorage 也不可用，将使用内存存储（刷新丢失）');
        storageAvailable = false;
    }
}

// 内存存储作为最后的 fallback
let memoryToken = '';
let memoryApiDomain = '';
let memoryDomainTime = 0;

// ========== 域名相关 ==========
async function getApiBase() {
    // 1. 检查内存缓存
    if (window.API_BASE) {
        return window.API_BASE;
    }
    
    // 2. 检查存储缓存（未过期）
    const cached = safeGetItem(DOMAIN_CACHE_KEY);
    const cachedTime = parseInt(safeGetItem(DOMAIN_CACHE_TIME_KEY) || '0');
    const now = Date.now();
    
    if (cached && (now - cachedTime) < CACHE_MAX_AGE) {
        console.log('使用缓存的域名:', cached);
        window.API_BASE = cached;
        return cached;
    }
    
    // 3. 从 GitHub Pages 加载最新配置
    try {
        await loadScript(DOMAIN_JS_URL + '?v=' + now);
        if (window.API_BASE) {
            // 缓存
            safeSetItem(DOMAIN_CACHE_KEY, window.API_BASE);
            safeSetItem(DOMAIN_CACHE_TIME_KEY, now.toString());
            console.log('域名已更新:', window.API_BASE);
            return window.API_BASE;
        }
    } catch (e) {
        console.warn('加载域名配置失败:', e);
    }
    
    // 4. 使用过期缓存（降级）
    if (cached) {
        console.warn('使用过期的域名缓存:', cached);
        window.API_BASE = cached;
        return cached;
    }
    
    throw new Error('无法获取 API 域名，请检查网络连接或稍后刷新页面重试');
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        console.log('[Auth] 正在加载域名配置:', src);
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = 'anonymous';
        script.onload = () => {
            console.log('[Auth] 域名配置加载完成, API_BASE=', window.API_BASE);
            resolve();
        };
        script.onerror = (e) => {
            console.error('[Auth] 加载失败:', src, e);
            reject(new Error('Failed to load: ' + src));
        };
        document.head.appendChild(script);
    });
}

// ========== 安全的存储操作（微信兼容） ==========
function safeGetItem(key) {
    try {
        if (storageType === 'localStorage') {
            return localStorage.getItem(key);
        } else if (storageType === 'sessionStorage') {
            return sessionStorage.getItem(key);
        }
        // 内存存储
        if (key === TOKEN_KEY) return memoryToken;
        if (key === DOMAIN_CACHE_KEY) return memoryApiDomain;
        if (key === DOMAIN_CACHE_TIME_KEY) return memoryDomainTime.toString();
        return null;
    } catch (e) {
        console.error('读取存储失败:', key, e);
        return null;
    }
}

function safeSetItem(key, value) {
    try {
        if (storageType === 'localStorage') {
            localStorage.setItem(key, value);
        } else if (storageType === 'sessionStorage') {
            sessionStorage.setItem(key, value);
        }
        // 同时更新内存
        if (key === TOKEN_KEY) memoryToken = value;
        if (key === DOMAIN_CACHE_KEY) memoryApiDomain = value;
        if (key === DOMAIN_CACHE_TIME_KEY) memoryDomainTime = parseInt(value) || 0;
    } catch (e) {
        console.error('写入存储失败:', key, e);
        // 至少更新内存
        if (key === TOKEN_KEY) memoryToken = value;
        if (key === DOMAIN_CACHE_KEY) memoryApiDomain = value;
        if (key === DOMAIN_CACHE_TIME_KEY) memoryDomainTime = parseInt(value) || 0;
    }
}

function safeRemoveItem(key) {
    try {
        if (storageType === 'localStorage') {
            localStorage.removeItem(key);
        } else if (storageType === 'sessionStorage') {
            sessionStorage.removeItem(key);
        }
        // 同时清除内存
        if (key === TOKEN_KEY) memoryToken = '';
        if (key === DOMAIN_CACHE_KEY) memoryApiDomain = '';
        if (key === DOMAIN_CACHE_TIME_KEY) memoryDomainTime = 0;
    } catch (e) {
        console.error('删除存储失败:', key, e);
    }
}

// ========== Token 相关 ==========
function getToken() {
    return safeGetItem(TOKEN_KEY) || '';
}

function saveToken(token) {
    safeSetItem(TOKEN_KEY, token);
}

function clearToken() {
    safeRemoveItem(TOKEN_KEY);
}

function hasToken() {
    return !!getToken();
}

// ========== 页面跳转 ==========
function redirectToAuth(returnUrl) {
    const url = returnUrl || window.location.href;
    const encodedReturnUrl = encodeURIComponent(url);
    setTimeout(() => {
        window.location.replace(`/weiqi-page/auth.html?return=${encodedReturnUrl}`);
    }, 10);
}

// ========== 带认证的请求 ==========
async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    const apiBase = await getApiBase();
    
    const fullUrl = url.startsWith('http') ? url : `${apiBase}${url}`;
    
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };
    
    try {
        const response = await fetch(fullUrl, {
            ...options,
            headers
        });
        
        // 401/403 跳转到认证页面
        if (response.status === 401 || response.status === 403) {
            clearToken();
            setTimeout(() => {
                redirectToAuth(window.location.href);
            }, 0);
            return null;
        }
        
        return response;
    } catch (error) {
        console.error('请求失败:', error);
        throw new Error('网络请求失败，请检查网络连接');
    }
}

async function validateToken(token) {
    try {
        const apiBase = await getApiBase();
        const response = await fetch(`${apiBase}/api/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.ok;
    } catch {
        return false;
    }
}

async function initAuth(requireAuth = true) {
    if (requireAuth && !hasToken()) {
        redirectToAuth();
        return false;
    }
    try {
        await getApiBase();
    } catch (e) {
        console.warn('预加载域名失败:', e);
    }
    return true;
}
