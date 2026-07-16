<script setup>
import { ref } from 'vue'
import { useAuth } from '../context/AuthContext'

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const { login, isDark, toggleTheme } = useAuth()

const handleSubmit = async () => {
  error.value = ''
  loading.value = true
  try {
    const success = await login(email.value, password.value)
    if (!success) {
      error.value = 'Credenciais inválidas. Verifique seu e-mail e senha.'
    }
  } catch (err) {
    error.value = 'Ocorreu um erro ao tentar fazer login. Tente novamente.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <!-- Orbs / Glow elements -->
    <div class="login-glow-1"></div>
    <div class="login-glow-2"></div>
    <div class="login-bg-grid"></div>

    <!-- Theme Toggle Button -->
    <div class="login-theme-toggle">
      <button @click="toggleTheme" class="theme-toggle-btn" type="button" aria-label="Alternar tema">
        <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
      </button>
    </div>

    <div class="login-card glass-panel">
      <div class="logo-container">
        <div class="logo-wrapper">
          <!-- Logo Icon -->
          <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
      </div>

      <div class="welcome-box">
        <text class="title">Seja bem-vindo de volta!</text>
        <text class="subtitle">Faça login para acessar o painel</text>
      </div>

      <form class="login-form" @submit.prevent="handleSubmit">
        <div v-if="error" class="login-error-alert" role="alert">
          {{ error }}
        </div>

        <div class="input-group">
          <label for="email">E-mail</label>
          <div class="input-wrapper">
            <span class="input-icon">
              <!-- Mail icon replacement using raw SVG since lucide-react isn't here -->
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            </span>
            <input 
              type="email" 
              id="email" 
              v-model="email" 
              required 
              placeholder="seu@email.com"
              class="glass-input"
            />
          </div>
        </div>

        <div class="input-group">
          <label for="password">Senha</label>
          <div class="input-wrapper">
            <span class="input-icon">
              <!-- Lock icon replacement -->
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </span>
            <input 
              type="password" 
              id="password" 
              v-model="password" 
              required 
              placeholder="••••••••"
              class="glass-input"
            />
          </div>
        </div>

        <button type="submit" class="glass-btn primary" :disabled="loading">
          <span v-if="loading">Entrando...</span>
          <span v-else>Entrar</span>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  width: 100%;
  position: relative;
  background-color: var(--color-bg-base);
  overflow: hidden;
}

/* Background Grids & Glows matching CRM design */
.login-bg-grid {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    linear-gradient(to right, var(--bg-grid-color) 1px, transparent 1px),
    linear-gradient(to bottom, var(--bg-grid-color) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(ellipse 60% 50% at 50% 50%, #000 70%, transparent 100%);
  -webkit-mask-image: radial-gradient(ellipse 60% 50% at 50% 50%, #000 70%, transparent 100%);
  opacity: 0.8;
  pointer-events: none;
  z-index: 1;
}

.login-glow-1, .login-glow-2 {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.15;
  pointer-events: none;
  z-index: 1;
  transition: all 0.5s ease;
}

.login-glow-1 {
  top: 20%;
  left: 25%;
  width: 400px;
  height: 400px;
  background: var(--bg-glow-1);
}

.login-glow-2 {
  bottom: 20%;
  right: 25%;
  width: 450px;
  height: 450px;
  background: var(--bg-glow-2);
}

.login-theme-toggle {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 10;
}

.theme-toggle-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
}

.theme-toggle-btn:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-accent);
}

.login-card {
  width: 100%;
  max-width: 420px;
  padding: 40px;
  z-index: 5;
  animation: fadeIn 0.6s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.logo-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%);
  box-shadow: 0 8px 24px rgba(124, 58, 237, 0.3);
}

.logo-icon {
  width: 32px;
  height: 32px;
  color: white;
}

.welcome-box {
  text-align: center;
  margin-bottom: 32px;
}

.title {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 8px;
  letter-spacing: -0.5px;
}

.subtitle {
  font-size: 14px;
  color: var(--color-text-muted);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.input-wrapper input {
  width: 100%;
  padding-left: 44px;
}

.glass-btn {
  margin-top: 10px;
  width: 100%;
  height: 46px;
  font-size: 15px;
  font-weight: 600;
}
</style>
