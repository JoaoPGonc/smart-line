# Smart Line

Aplicativo de logística para caminhoneiros: planejamento de rotas, acompanhamento de filas em portos, agendamento de horários e alertas de trânsito em tempo real.

Stack: React 19 + TypeScript + Vite 6, Firebase (Authentication + Firestore), Leaflet para mapas, empacotado como PWA (instalável e com suporte offline básico via Workbox).

## Pré-requisitos

- Node.js 20+
- Um projeto no [Firebase Console](https://console.firebase.google.com/) com Authentication (email/senha) e Firestore habilitados

## Configuração

1. Instale as dependências:
   ```
   npm install
   ```
2. Copie `.env.example` para `.env` e preencha com as credenciais do seu projeto Firebase (Configurações do projeto > Geral > Seus apps):
   ```
   cp .env.example .env
   ```
3. Publique as regras de segurança do Firestore (`firestore.rules`) no seu projeto:
   ```
   firebase deploy --only firestore:rules
   ```

## Rodando localmente

```
npm run dev
```

O app sobe em `http://localhost:3000`.

## Build e deploy

```
npm run build      # gera a pasta dist/
npm run deploy      # publica dist/ no GitHub Pages (branch gh-pages)
```

O deploy automático (`.github/workflows/deploy.yml`) roda a cada push na branch `main` e publica em GitHub Pages. As credenciais do Firebase precisam estar cadastradas como *secrets* do repositório (mesmos nomes das variáveis em `.env.example`), já que o arquivo `.env` não é versionado.

## Verificação de tipos

```
npm run lint
```
