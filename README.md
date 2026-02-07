# 🚀 Baileys Server para WhatsApp CRM

## Deploy no Railway

### 1. Suba para o GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/SEU_USUARIO/baileys-server.git
git push -u origin main
```

### 2. No Railway
1. Crie novo projeto → Deploy from GitHub
2. Selecione o repositório
3. Em **Variables**, adicione:
   - `SUPABASE_WEBHOOK_URL` = `https://jwddiyuezqrpuakazvgg.supabase.co/functions/v1/whatsapp-webhook`

### 3. Aguarde o deploy
O servidor deve mostrar nos logs:
```
🚀 [v1.0.0] Baileys Server running on port XXXX
📡 Webhook URL: https://jwddiyuezqrpuakazvgg.supabase.co/functions/v1/whatsapp-webhook
```

### 4. Teste
Acesse: `https://SEU-DOMINIO.railway.app/api/health`

## Estrutura
```
baileys-server/
├── src/
│   ├── routes/
│   │   └── message.ts
│   ├── server.ts
│   ├── types.ts
│   └── whatsapp.ts
├── package.json
├── tsconfig.json
├── .gitignore
└── .env.example
```
