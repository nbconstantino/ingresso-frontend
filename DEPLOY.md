# 📋 Guia de Deploy Completo — IngressoBot

## Visão geral da arquitetura

```
[Você no VSCode]
      │
      ├── repo: ingresso-frontend (PÚBLICO) ──► Vercel (frontend + API Next.js)
      │                                              │
      └── repo: ingresso-bot-server (PRIVADO) ──► Render (bot Playwright)
                                                       │
                                           MongoDB Atlas (banco de dados)
```

Fluxo de dados:
1. Usuário clica "Iniciar Bot" no frontend
2. Frontend (Vercel) descriptografa senhas em RAM e envia ao bot (Render)
3. Bot compra ingressos no Ingresso Nacional e gera QR Codes
4. Bot chama /api/bot/callback no frontend para salvar os QR Codes
5. Usuário vê os QR Codes e marca como pago

---

## PARTE 1 — MongoDB Atlas (banco de dados)

### 1.1 Criar conta e cluster

1. Acesse https://cloud.mongodb.com e crie uma conta gratuita
2. Clique em "Build a Database" → escolha **M0 Free**
3. Escolha o provider (AWS) e região mais próxima (São Paulo)
4. Defina um nome para o cluster (ex: `ingresso-cluster`)
5. Clique em "Create"

### 1.2 Criar usuário do banco

1. No painel, vá em **Database Access** → "Add New Database User"
2. Método: Password
3. Username: `ingressobot`
4. Password: clique em "Autogenerate Secure Password" → **copie e salve essa senha**
5. Role: "Read and write to any database"
6. Clique em "Add User"

### 1.3 Liberar IP

1. Vá em **Network Access** → "Add IP Address"
2. Clique em **"Allow Access From Anywhere"** (0.0.0.0/0)
   ⚠️ Isso é necessário porque Vercel e Render usam IPs dinâmicos
3. Clique em "Confirm"

### 1.4 Pegar a connection string

1. Vá em **Database** → clique em "Connect" no seu cluster
2. Escolha "Connect your application"
3. Driver: Node.js, versão: 5.5 ou superior
4. Copie a string, que será parecida com:
   `mongodb+srv://ingressobot:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
5. Substitua `<password>` pela senha que você gerou
6. Adicione o nome do banco antes do `?`:
   `mongodb+srv://ingressobot:SENHA@cluster0.xxxxx.mongodb.net/ingressos?retryWrites=true&w=majority`

---

## PARTE 2 — Gerar as chaves secretas

Abra o terminal do VSCode (Ctrl+`) e rode:

```bash
# Gera ENCRYPTION_KEY (32 bytes = 64 chars hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Gera NEXTAUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Gera BOT_SECRET (compartilhada entre frontend e bot)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Guarde os três valores gerados** — você vai usar nas próximas etapas.

---

## PARTE 3 — GitHub (dois repositórios)

### 3.1 Instalar Git e configurar no VSCode

Se ainda não tem Git:
- Windows: https://git-scm.com/download/win
- Após instalar, abra o VSCode e pressione Ctrl+Shift+P → "Git: Set User Name" e "Git: Set User Email"

### 3.2 Criar os repositórios no GitHub

1. Acesse https://github.com → "New repository"

**Repositório 1 — Frontend (PÚBLICO):**
- Nome: `ingresso-frontend`
- Visibilidade: **Public**
- NÃO marque "Initialize with README"
- Clique em "Create repository"

**Repositório 2 — Bot Server (PRIVADO):**
- Nome: `ingresso-bot-server`
- Visibilidade: **Private**
- NÃO marque "Initialize with README"
- Clique em "Create repository"

### 3.3 Fazer o primeiro commit do frontend

No terminal do VSCode, dentro da pasta `ingresso-frontend`:

```bash
cd ingresso-frontend

# Crie o arquivo .env.local com suas chaves (NÃO será commitado pelo .gitignore)
cp .env.example .env.local
# Edite o .env.local e preencha os valores reais

git init
git add .
git commit -m "feat: initial commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/ingresso-frontend.git
git push -u origin main
```

### 3.4 Fazer o primeiro commit do bot server

```bash
cd ingresso-bot-server

# Crie o .env com suas chaves (NÃO será commitado)
cp .env.example .env
# Edite o .env e preencha os valores reais

git init
git add .
git commit -m "feat: initial commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/ingresso-bot-server.git
git push -u origin main
```

---

## PARTE 4 — Deploy do Bot no Render

### 4.1 Criar conta no Render

1. Acesse https://render.com e crie uma conta (pode usar o GitHub para fazer login)

### 4.2 Criar o serviço

1. No painel do Render, clique em **"New +"** → **"Web Service"**
2. Conecte seu GitHub e selecione o repositório `ingresso-bot-server` (privado)
3. Configure:
   - **Name:** `ingresso-bot-server`
   - **Region:** Oregon (US West) ou a mais próxima disponível no plano gratuito
   - **Branch:** `main`
   - **Runtime:** Node
   - **Build Command:** `npm install && npx playwright install chromium --with-deps`
   - **Start Command:** `node bot-server.js`
   - **Plan:** Free

4. Em **Environment Variables**, adicione:
   | Key | Value |
   |-----|-------|
   | `BOT_SECRET` | (o valor que você gerou) |
   | `FRONTEND_URL` | `https://ingresso-frontend.vercel.app` (ajuste depois) |
   | `PORT` | `3001` |

5. Clique em **"Create Web Service"**

6. Aguarde o deploy. Quando ficar verde, copie a URL do serviço (ex: `https://ingresso-bot-server.onrender.com`)

⚠️ **Importante sobre o plano gratuito do Render:**
O serviço "dorme" após 15 minutos sem requisições. Quando o frontend chamar `/start`, pode demorar ~30 segundos para "acordar". Isso é normal. Para manter acordado, você pode usar um serviço de ping gratuito como https://uptimerobot.com apontando para `https://ingresso-bot-server.onrender.com/health` a cada 5 minutos.

---

## PARTE 5 — Deploy do Frontend no Vercel

### 5.1 Criar conta no Vercel

1. Acesse https://vercel.com e faça login com GitHub

### 5.2 Importar o projeto

1. No painel da Vercel, clique em **"Add New..."** → **"Project"**
2. Selecione o repositório `ingresso-frontend`
3. **Framework Preset:** Next.js (detectado automaticamente)
4. Clique em **"Environment Variables"** e adicione:

   | Key | Value |
   |-----|-------|
   | `ENCRYPTION_KEY` | (o valor de 64 chars que você gerou) |
   | `MONGODB_URI` | (sua connection string do Atlas) |
   | `NEXTAUTH_SECRET` | (o valor que você gerou) |
   | `NEXTAUTH_URL` | `https://ingresso-frontend.vercel.app` |
   | `BOT_SERVER_URL` | `https://ingresso-bot-server.onrender.com` |
   | `BOT_SECRET` | (o mesmo valor do Render) |

5. Clique em **"Deploy"**
6. Aguarde. Quando terminar, copie a URL do seu app (ex: `https://ingresso-frontend.vercel.app`)

### 5.3 Atualizar FRONTEND_URL no Render

1. Volte ao Render → seu serviço → **Environment**
2. Atualize `FRONTEND_URL` com a URL real da Vercel
3. O Render vai fazer redeploy automaticamente

### 5.4 Atualizar NEXTAUTH_URL na Vercel

1. Se a URL final for diferente do que você colocou, vá em Vercel → Settings → Environment Variables
2. Atualize `NEXTAUTH_URL` com a URL real
3. Vá em Deployments → clique nos 3 pontos do último deploy → "Redeploy"

---

## PARTE 6 — Primeiro acesso

1. Abra `https://ingresso-frontend.vercel.app/register`
2. Crie sua conta — **o primeiro usuário cadastrado vira admin automaticamente**
3. Faça login
4. Vá em **Contas** e cadastre as contas do Ingresso Nacional
5. Vá em **Eventos**, cole a URL do evento, selecione as contas e o tipo de ingresso
6. Quando quiser iniciar o bot, clique em **"Iniciar Bot"**

---

## PARTE 7 — Fluxo de trabalho no VSCode (atualizações futuras)

Toda vez que você editar o código e quiser publicar:

```bash
# No terminal do VSCode, dentro da pasta do projeto editado
git add .
git commit -m "descricao da mudanca"
git push
```

A Vercel e o Render detectam o push automaticamente e fazem redeploy.

---

## PARTE 8 — Encontrando o ID da cidade para novas contas

O campo `cidadeId` é o ID numérico que o Ingresso Nacional usa internamente para as cidades.

Para descobrir o ID de uma cidade:
1. Abra o site do Ingresso Nacional
2. Pressione F12 (DevTools) → aba Network
3. Tente fazer um checkout qualquer
4. Procure a request para `cidades.php`
5. Na resposta, encontre sua cidade e copie o ID numérico

**IDs conhecidos:**
- Maringá (PR): `6190`
- São Paulo (SP): (faça o procedimento acima)
- Curitiba (PR): (faça o procedimento acima)

---

## PARTE 9 — Estrutura dos dois repositórios

```
ingresso-frontend/          ← repo PÚBLICO no GitHub → deploy Vercel
├── app/
│   ├── (auth)/login/
│   ├── (auth)/register/
│   ├── dashboard/
│   ├── contas/
│   ├── eventos/
│   ├── qrcodes/
│   ├── admin/
│   │   ├── usuarios/
│   │   └── relatorios/
│   └── api/
│       ├── auth/
│       ├── contas/
│       ├── eventos/
│       ├── bot/start/
│       ├── bot/callback/
│       ├── qrcodes/
│       └── admin/
├── components/Navbar.tsx
├── lib/
│   ├── auth/crypto.ts      ← AES-256-GCM
│   ├── auth/password.ts    ← bcrypt
│   ├── auth/authOptions.ts
│   └── db/models/          ← User, Conta, Evento, QRCode
└── .env.local              ← NUNCA commitar este arquivo

ingresso-bot-server/        ← repo PRIVADO no GitHub → deploy Render
├── bot-server.js           ← Express + Playwright
├── render.yaml
└── .env                    ← NUNCA commitar este arquivo
```

---

## Troubleshooting

**Bot não inicia:**
- Verifique se o Render está acordado (acesse a URL /health no browser)
- Confira se BOT_SECRET é igual nos dois serviços
- Veja os logs no painel do Render

**Login não funciona:**
- Confira se NEXTAUTH_URL está com a URL correta
- Confira se MONGODB_URI está correto e o IP 0.0.0.0/0 está liberado no Atlas

**QR Code não aparece:**
- O site pode ter mudado o layout do gateway
- Veja os logs do bot no Render para ver em qual etapa falhou
- O bot tira screenshot automático quando há erro (aparece nos logs)

**Erro "ENCRYPTION_KEY deve ter 64 caracteres":**
- Regere a chave com o comando da Parte 2
- Certifique-se de que não tem espaços ou quebras de linha no valor

---

## Resumo rápido (TL;DR)

1. MongoDB Atlas → cria cluster gratuito, pega connection string
2. Gera 3 chaves secretas com `node -e "..."`
3. GitHub → cria 2 repos (1 público, 1 privado), faz push de cada pasta
4. Render → conecta ao repo privado, configura env vars, faz deploy do bot
5. Vercel → conecta ao repo público, configura env vars, faz deploy do frontend
6. Atualiza FRONTEND_URL no Render com a URL final da Vercel
7. Acessa /register, cria conta admin, começa a usar
