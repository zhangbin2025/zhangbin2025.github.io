/**
 * 围棋资源站 - 公共脚本
 * 访问标记 + 资源互通
 */

const ResourceTracker = {
    // 获取已访问的项目
    getVisited(type) {
        const key = `visited_${type}`;
        return JSON.parse(localStorage.getItem(key) || '{}');
    },
    
    // 标记为已访问
    markVisited(type, id) {
        const key = `visited_${type}`;
        const visited = this.getVisited(type);
        visited[id] = Date.now();
        localStorage.setItem(key, JSON.stringify(visited));
        this.updateUI(type, id);
    },
    
    // 检查是否已访问
    isVisited(type, id) {
        const visited = this.getVisited(type);
        return !!visited[id];
    },
    
    // 更新UI
    updateUI(type, id) {
        document.querySelectorAll(`[data-track="${id}"]`).forEach(el => {
            el.classList.add('visited');
            if (!el.querySelector('.visited-icon')) {
                el.insertAdjacentHTML('afterbegin', '<span class="visited-icon">✓ </span>');
            }
        });
    },
    
    // 初始化所有已访问的链接
    init() {
        ['games', 'quiz', 'joseki'].forEach(type => {
            const visited = this.getVisited(type);
            Object.keys(visited).forEach(id => {
                this.updateUI(type, id);
            });
        });
    },
    
    // 获取未访问的项目
    getUnvisited(type, items) {
        const visited = this.getVisited(type);
        return items.filter(item => !visited[item.id]);
    },
    
    // 清除所有访问记录
    clearAll() {
        localStorage.removeItem('visited_games');
        localStorage.removeItem('visited_quiz');
        localStorage.removeItem('visited_joseki');
        document.querySelectorAll('.visited').forEach(el => {
            el.classList.remove('visited');
            const icon = el.querySelector('.visited-icon');
            if (icon) icon.remove();
        });
    }
};

// 资源互通提示
const ResourceBridge = {
    config: {
        gameStayTime: 2 * 60 * 1000,  // 打谱页停留2分钟提示
        josekiStayTime: 30 * 1000,     // 定式页停留30秒提示
    },
    
    init() {
        this.detectContext();
        this.attachListeners();
    },
    
    detectContext() {
        const path = window.location.pathname;
        if (path.includes('/games/')) {
            this.type = 'game';
            this.info = this.parseGamePath(path);
        } else if (path.includes('/quiz/')) {
            this.type = 'quiz';
            this.info = this.parseQuizPath(path);
        } else if (path.includes('/joseki/')) {
            this.type = 'joseki';
            this.info = this.parseJosekiPath(path);
        }
    },
    
    parseGamePath(path) {
        const match = path.match(/\/games\/(\d{4}-\d{2}-\d{2})\/(\w+)\/(game_\d+)\.html/);
        if (match) {
            return { date: match[1], source: match[2], id: match[3] };
        }
        return null;
    },
    
    parseQuizPath(path) {
        const match = path.match(/\/quiz\/(\d{4}-\d{2}-\d{2})\/(\w+)\/(quiz_\d+)\.html/);
        if (match) {
            return { date: match[1], source: match[2], id: match[3] };
        }
        return null;
    },
    
    parseJosekiPath(path) {
        const match = path.match(/\/joseki\/(\d{4}-\d{2}-\d{2})\/(\w+)\/(joseki_\d+)\.html/);
        if (match) {
            return { date: match[1], source: match[2], id: match[3] };
        }
        return null;
    },
    
    attachListeners() {
        if (!this.info) return;
        
        // 场景1：打谱页停留超过2分钟 → 提示选点题
        if (this.type === 'game') {
            setTimeout(() => {
                this.showTip(
                    '🎯 这局棋有选点题，来挑战一下吗？',
                    `/quiz/${this.info.date}/${this.info.source}/`
                );
            }, this.config.gameStayTime);
        }
        
        // 场景2：定式页停留30秒 → 提示在棋谱库搜索
        if (this.type === 'joseki') {
            setTimeout(() => {
                this.showTip(
                    '🔍 在棋谱库搜索此定式的实战应用',
                    `/games/?joseki=${this.info.id}`
                );
            }, this.config.josekiStayTime);
        }
    },
    
    showTip(message, link) {
        // 检查是否已显示过
        const tipKey = `tip_shown_${this.type}_${this.info.id}`;
        if (localStorage.getItem(tipKey)) return;
        
        const tip = document.createElement('div');
        tip.className = 'resource-tip';
        tip.innerHTML = `
            <span>${message}</span>
            <a href="${link}" target="_blank">查看</a>
            <button onclick="this.parentElement.remove()">×</button>
        `;
        
        // 样式
        tip.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 15px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(tip);
        
        // 标记已显示
        localStorage.setItem(tipKey, Date.now());
        
        // 5秒后自动消失
        setTimeout(() => {
            tip.style.opacity = '0';
            tip.style.transform = 'translateY(20px)';
            setTimeout(() => tip.remove(), 300);
        }, 5000);
    }
};

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateY(100px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    .resource-tip a {
        color: white;
        text-decoration: underline;
        font-weight: bold;
    }
    .resource-tip button {
        background: rgba(255,255,255,0.3);
        border: none;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        cursor: pointer;
    }
    .visited {
        opacity: 0.5;
        text-decoration: line-through;
    }
    .visited-icon {
        color: #4CAF50;
    }
`;
document.head.appendChild(style);

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    ResourceTracker.init();
    ResourceBridge.init();
});

// 全局函数供HTML调用
function markVisited(type, id) {
    ResourceTracker.markVisited(type, id);
}

function showUnvisited(type) {
    // 筛选未访问的项目
    document.querySelectorAll(`[data-type="${type}"]`).forEach(el => {
        const id = el.dataset.track;
        if (ResourceTracker.isVisited(type, id)) {
            el.style.display = 'none';
        }
    });
}
