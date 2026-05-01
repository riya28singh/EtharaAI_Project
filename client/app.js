const API_URL = window.location.origin === 'http://127.0.0.1:5500' || window.location.origin === 'http://localhost:5500' ? 'http://127.0.0.1:8000' : window.location.origin;

const state = {
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user')),
    projects: [],
    currentProject: null,
    tasks: [],
    stats: { total: 0, todo: 0, in_progress: 0, completed: 0 }
};

const ui = {
    render: (html) => {
        document.getElementById('app').innerHTML = html;
        if (window.lucide) {
            lucide.createIcons();
        }
    },
    showModal: (id) => document.getElementById(id).style.display = 'flex',
    closeModal: (id) => document.getElementById(id).style.display = 'none'
};

const app = {
    async init() {
        if (state.token) {
            await this.loadDashboard();
        } else {
            this.renderLogin();
        }
    },

    async login(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.access_token) {
                state.token = data.access_token;
                state.user = data.user;
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('user', JSON.stringify(data.user));
                await this.loadDashboard();
            } else {
                alert(data.detail || 'Login failed');
            }
        } catch (err) {
            console.error(err);
        }
    },

    async signup(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const body = Object.fromEntries(formData.entries());
        body.role = 'member'; // Default role for new users
        try {
            const res = await fetch(`${API_URL}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                alert('Account created! Please login.');
                this.renderLogin();
            } else {
                const data = await res.json();
                alert(data.detail || 'Signup failed');
            }
        } catch (err) {
            console.error(err);
        }
    },

    logout() {
        localStorage.clear();
        location.reload();
    },

    async loadDashboard() {
        try {
            const [projRes, statsRes] = await Promise.all([
                fetch(`${API_URL}/projects`, { headers: { 'Authorization': `Bearer ${state.token}` } }),
                fetch(`${API_URL}/dashboard/stats`, { headers: { 'Authorization': `Bearer ${state.token}` } })
            ]);
            state.projects = await projRes.json();
            state.stats = await statsRes.json();
            this.renderDashboard();
        } catch (err) {
            console.error(err);
            this.logout();
        }
    },

    async viewProject(id) {
        state.currentProject = state.projects.find(p => p.id === id);
        const res = await fetch(`${API_URL}/projects/${id}/tasks`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        state.tasks = await res.json();
        this.renderProjectDetails();
    },

    async createProject() {
        const name = document.getElementById('projName').value;
        const description = document.getElementById('projDesc').value;
        const res = await fetch(`${API_URL}/projects`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${state.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, description })
        });
        if (res.ok) {
            ui.closeModal('projectModal');
            await this.loadDashboard();
        }
    },

    async createTask() {
        const title = document.getElementById('taskTitle').value;
        const description = document.getElementById('taskDesc').value;
        const res = await fetch(`${API_URL}/projects/${state.currentProject.id}/tasks`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${state.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, description })
        });
        if (res.ok) {
            ui.closeModal('taskModal');
            await this.viewProject(state.currentProject.id);
        }
    },

    async updateTask(id, status) {
        await fetch(`${API_URL}/tasks/${id}?status=${status}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        await this.viewProject(state.currentProject.id);
    },

    async deleteTask(id) {
        if (!confirm('Delete this task?')) return;
        await fetch(`${API_URL}/tasks/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        await this.viewProject(state.currentProject.id);
    },

    async deleteProject(id, e) {
        if (e) e.stopPropagation();
        if (!confirm('Are you sure you want to delete this project? All tasks will be lost.')) return;
        
        await fetch(`${API_URL}/projects/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        await this.loadDashboard();
    },

    renderLogin() {
        ui.render(`
            <div class="auth-wrapper fade-in">
                <div class="auth-card glass-container">
                    <h1 style="margin-bottom: 2rem; text-align: center;">Welcome Back</h1>
                    <form onsubmit="app.login(event)">
                        <div class="input-group">
                            <label>Email Address</label>
                            <input type="email" name="username" required>
                        </div>
                        <div class="input-group">
                            <label>Password</label>
                            <input type="password" name="password" required>
                        </div>
                        <button type="submit" class="btn">Login</button>
                    </form>
                    <p style="margin-top: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.875rem;">
                        Don't have an account? <a href="#" onclick="app.renderSignup()" style="color: var(--primary);">Sign up</a>
                    </p>
                </div>
            </div>
        `);
    },

    renderSignup() {
        ui.render(`
            <div class="auth-wrapper fade-in">
                <div class="auth-card glass-container">
                    <h1 style="margin-bottom: 2rem; text-align: center;">Create Account</h1>
                    <form onsubmit="app.signup(event)">
                        <div class="input-group">
                            <label>Full Name</label>
                            <input type="text" name="full_name" required>
                        </div>
                        <div class="input-group">
                            <label>Email Address</label>
                            <input type="email" name="email" required>
                        </div>
                        <div class="input-group">
                            <label>Password</label>
                            <input type="password" name="password" required>
                        </div>
                        <button type="submit" class="btn">Sign Up</button>
                    </form>
                    <p style="margin-top: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.875rem;">
                        Already have an account? <a href="#" onclick="app.renderLogin()" style="color: var(--primary);">Login</a>
                    </p>
                </div>
            </div>
        `);
    },

    renderDashboard() {
        ui.render(`
            <div class="app-layout fade-in">
                <aside class="sidebar">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 2.5rem;">
                        <i data-lucide="layout-grid" style="color: var(--primary); width: 24px; height: 24px;"></i>
                        <h2 style="color: var(--primary); margin: 0;">Ethara AI</h2>
                    </div>
                    <nav>
                        <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: var(--glass-bg); border-radius: 8px; margin-bottom: 0.5rem; cursor: pointer;">
                            <i data-lucide="home" style="width: 18px;"></i>
                            Dashboard
                        </div>
                    </nav>
                    <div style="margin-top: auto;">
                        <div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                            <i data-lucide="user" style="width: 16px;"></i>
                            ${state.user.full_name}
                        </div>
                        <button class="btn" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; display: flex; align-items: center; justify-content: center; gap: 0.5rem;" onclick="app.logout()">
                            <i data-lucide="log-out" style="width: 18px;"></i>
                            Logout
                        </button>
                    </div>
                </aside>
                <main class="main-content">
                    <header class="header">
                        <h1>Your Projects</h1>
                        <button class="btn" style="width: auto; padding: 0.75rem 1.5rem;" onclick="ui.showModal('projectModal')">+ New Project</button>
                    </header>

                    <div class="stats-grid">
                        <div class="stat-card glass-container">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div style="color: var(--text-muted); font-size: 0.875rem;">Total Tasks</div>
                                <i data-lucide="list" style="color: var(--text-muted); width: 18px;"></i>
                            </div>
                            <div class="stat-value">${state.stats.total}</div>
                        </div>
                        <div class="stat-card glass-container">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div style="color: var(--text-muted); font-size: 0.875rem;">In Progress</div>
                                <i data-lucide="clock" style="color: var(--primary); width: 18px;"></i>
                            </div>
                            <div class="stat-value" style="color: var(--primary);">${state.stats.in_progress}</div>
                        </div>
                        <div class="stat-card glass-container">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div style="color: var(--text-muted); font-size: 0.875rem;">Completed</div>
                                <i data-lucide="check-circle" style="color: #22c55e; width: 18px;"></i>
                            </div>
                            <div class="stat-value" style="color: #22c55e;">${state.stats.completed}</div>
                        </div>
                    </div>

                    <div class="project-grid">
                        ${state.projects.map(p => `
                            <div class="project-card glass-container fade-in" onclick="app.viewProject(${p.id})">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                                    <div style="background: rgba(99, 102, 241, 0.1); padding: 0.5rem; border-radius: 8px;">
                                        <i data-lucide="folder" style="color: var(--primary); width: 20px;"></i>
                                    </div>
                                    <button onclick="app.deleteProject(${p.id}, event)" style="background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px;">
                                        <i data-lucide="trash-2" style="width: 16px;"></i>
                                    </button>
                                </div>
                                <h3 style="margin-bottom: 0.5rem;">${p.name}</h3>
                                <p style="color: var(--text-muted); font-size: 0.875rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.5rem;">
                                    ${p.description || 'No description provided.'}
                                </p>
                                <div style="margin-top: 1.5rem; font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem;">
                                    <i data-lucide="calendar" style="width: 12px;"></i>
                                    Created ${new Date(p.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        `).join('')}
                        ${state.projects.length === 0 ? `
                            <div style="grid-column: 1/-1; text-align: center; padding: 4rem; background: var(--glass-bg); border-radius: 16px; border: 1px dashed var(--border);">
                                <i data-lucide="folder-plus" style="width: 48px; height: 48px; color: var(--text-muted); margin-bottom: 1rem;"></i>
                                <h3 style="color: var(--text-muted);">No projects yet</h3>
                                <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 0.5rem;">Create your first project to start managing tasks.</p>
                            </div>
                        ` : ''}
                    </div>
                </main>
            </div>
        `);
    },

    renderProjectDetails() {
        ui.render(`
            <div class="app-layout fade-in">
                <aside class="sidebar">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 2.5rem;">
                        <i data-lucide="layout-grid" style="color: var(--primary); width: 24px; height: 24px;"></i>
                        <h2 style="color: var(--primary); margin: 0;">Ethara AI</h2>
                    </div>
                    <nav>
                        <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border-radius: 8px; cursor: pointer; color: var(--text-muted);" onclick="app.loadDashboard()">
                            <i data-lucide="arrow-left" style="width: 18px;"></i>
                            Back to Dashboard
                        </div>
                    </nav>
                </aside>
                <main class="main-content">
                    <header class="header">
                        <div>
                            <h1>${state.currentProject.name}</h1>
                            <p style="color: var(--text-muted); margin-top: 0.5rem;">${state.currentProject.description}</p>
                        </div>
                        <button class="btn" style="width: auto; padding: 0.75rem 1.5rem;" onclick="ui.showModal('taskModal')">+ Add Task</button>
                    </header>

                    <div class="task-list">
                        ${state.tasks.map(t => `
                            <div class="task-item fade-in">
                                <div style="background: rgba(255,255,255,0.05); padding: 0.75rem; border-radius: 10px; margin-right: 1rem;">
                                    <i data-lucide="clipboard-list" style="color: var(--text-muted); width: 20px;"></i>
                                </div>
                                <div style="flex: 1;">
                                    <h4 style="margin-bottom: 0.25rem;">${t.title}</h4>
                                    <p style="color: var(--text-muted); font-size: 0.875rem;">${t.description || 'No description'}</p>
                                </div>
                                <div style="display: flex; gap: 1rem; align-items: center;">
                                    <select onchange="app.updateTask(${t.id}, this.value)" style="background: rgba(15, 23, 42, 0.8); color: white; border: 1px solid var(--border); border-radius: 8px; padding: 6px 12px; font-size: 0.875rem; outline: none; cursor: pointer;">
                                        <option value="todo" ${t.status === 'todo' ? 'selected' : ''}>To Do</option>
                                        <option value="in_progress" ${t.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                                        <option value="completed" ${t.status === 'completed' ? 'selected' : ''}>Completed</option>
                                    </select>
                                    <span class="status-badge status-${t.status}">${t.status.replace('_', ' ')}</span>
                                    <button onclick="app.deleteTask(${t.id})" style="background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; display: flex; align-items: center;">
                                        <i data-lucide="trash-2" style="width: 16px;"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                        ${state.tasks.length === 0 ? `
                            <div style="text-align: center; padding: 4rem; background: var(--glass-bg); border-radius: 16px; border: 1px dashed var(--border);">
                                <i data-lucide="check-square" style="width: 48px; height: 48px; color: var(--text-muted); margin-bottom: 1rem;"></i>
                                <h3 style="color: var(--text-muted);">No tasks yet</h3>
                                <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 0.5rem;">Add a task to start tracking your progress.</p>
                            </div>
                        ` : ''}
                    </div>
                </main>
            </div>
        `);
    }
};

app.init();
window.app = app;
window.ui = ui;
window.state = state;
