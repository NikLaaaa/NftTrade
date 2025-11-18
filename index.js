// index.js
// Один файл: Express + HTML мини-аппка + Telegram-бот

const express = require('express');
const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const SUPPORT_CHAT_ID = process.env.SUPPORT_CHAT_ID; // id чата/канала поддержки
const WEBAPP_URL = process.env.WEBAPP_URL; // например: https://nfttrade-production.up.railway.app

if (!BOT_TOKEN) {
  console.error('❌ Не задан BOT_TOKEN в переменных окружения');
  process.exit(1);
}

if (!WEBAPP_URL) {
  console.warn('⚠ Не задан WEBAPP_URL. Укажи его в Railway Variables (например https://...up.railway.app)');
}

// ------------------- MINI-APP HTML (всё в одном) -------------------

const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <title>NovaGift</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
      background: radial-gradient(circle at top, #111827 0%, #050816 55%, #020617 100%);
      color: #f9fafb;
    }

    .app {
      max-width: 480px;
      margin: 0 auto;
      padding: 16px 16px 32px;
    }

    .app-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 18px;
    }

    .logo-circle {
      width: 44px;
      height: 44px;
      border-radius: 999px;
      background: conic-gradient(from 180deg, #f97316, #ec4899, #8b5cf6, #f97316);
      box-shadow: 0 0 26px rgba(129, 140, 248, 0.7);
    }

    .app-header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }

    .app-header p {
      margin: 2px 0 0;
      font-size: 13px;
      color: #9ca3af;
    }

    .card {
      background: rgba(15, 23, 42, 0.95);
      border-radius: 18px;
      padding: 16px 14px 18px;
      margin-bottom: 12px;
      border: 1px solid rgba(148, 163, 184, 0.14);
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.85);
    }

    .card.subtle {
      background: rgba(15, 23, 42, 0.8);
      box-shadow: none;
    }

    .card h2 {
      margin: 0 0 8px;
      font-size: 16px;
    }

    .info-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #60a5fa;
      margin: 0 0 4px;
    }

    .accent {
      font-weight: 600;
      font-size: 15px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 10px;
    }

    .field span {
      font-size: 13px;
      color: #e5e7eb;
    }

    input, textarea {
      background: rgba(15, 23, 42, 0.85);
      border-radius: 12px;
      border: 1px solid rgba(148, 163, 184, 0.4);
      padding: 8px 10px;
      color: #f9fafb;
      font-size: 14px;
      outline: none;
    }

    input::placeholder, textarea::placeholder {
      color: #6b7280;
    }

    input:focus, textarea:focus {
      border-color: #8b5cf6;
      box-shadow: 0 0 0 1px rgba(129, 140, 248, 0.6);
    }

    textarea {
      resize: vertical;
      min-height: 60px;
    }

    .primary-btn, .secondary-btn {
      width: 100%;
      border: none;
      outline: none;
      cursor: pointer;
      height: 46px;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 500;
      margin-top: 6px;
    }

    .primary-btn {
      background: linear-gradient(135deg, #f97316, #ec4899, #8b5cf6);
      color: white;
      box-shadow: 0 14px 30px rgba(59, 130, 246, 0.4);
    }

    .primary-btn:active {
      transform: translateY(1px);
      filter: brightness(0.97);
      box-shadow: 0 10px 24px rgba(59, 130, 246, 0.35);
    }

    .secondary-btn {
      background: rgba(15, 23, 42, 0.9);
      color: #e5e7eb;
      border: 1px solid rgba(148, 163, 184, 0.7);
    }

    ol {
      padding-left: 20px;
      margin: 4px 0 0;
      font-size: 13px;
      color: #d1d5db;
    }

    ol li + li {
      margin-top: 3px;
    }

    .small {
      font-size: 12px;
      color: #9ca3af;
      margin-top: 6px;
    }

    .success {
      color: #22c55e;
      font-size: 13px;
      margin-top: 8px;
    }

    .warning {
      color: #f97316;
      font-size: 13px;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="app">
    <header class="app-header">
      <div class="logo-circle"></div>
      <div>
        <h1>NovaGift</h1>
        <p>Стильный обмен подарками через Telegram</p>
      </div>
    </header>

    <section class="card">
      <p class="info-label">Эскроу-аккаунт</p>
      <p>Для передачи подарка используйте этот аккаунт:</p>
      <p class="accent">@NovaGiftSupp</p>
      <p class="small">Сначала один человек отправляет подарок на этот аккаунт, потом второй — напрямую первому.</p>
      <p id="envInfo" class="small" style="margin-top:4px; opacity:0.8;"></p>
    </section>

    <section id="screen-create" class="card">
      <h2>Создать сделку</h2>

      <div class="field">
        <span>Второй участник (Telegram @)</span>
        <input id="otherUsername" type="text" placeholder="@username" />
      </div>

      <div class="field">
        <span>Ваш подарок</span>
        <textarea id="giftFromA" placeholder="Например: NFT #123 из коллекции ..."></textarea>
      </div>

      <div class="field">
        <span>Подарок второго участника</span>
        <textarea id="giftFromB" placeholder="Что должен передать второй участник"></textarea>
      </div>

      <button class="primary-btn" id="btnCreate">Создать сделку</button>
      <p class="small">После создания сделки бот отправит тебе ссылку, которую ты скинешь второму участнику.</p>
      <p id="createStatus" class="success" style="display:none;"></p>
    </section>

    <section id="screen-confirm" class="card" style="display:none;">
      <h2>Подтверждение подарка</h2>
      <p>Ты открыл ссылку сделки. Если подарок уже у тебя, нажми кнопку ниже.</p>
      <button class="primary-btn" id="btnConfirm">Я получил подарок</button>
      <p class="small">После подтверждения бот передаст сигнал аккаунту @NovaGiftSupp, чтобы отправить другой подарок.</p>
      <p id="confirmStatus" class="success" style="display:none;"></p>
      <p id="confirmWarning" class="warning" style="display:none;"></p>
    </section>

    <section class="card subtle">
      <h2>Как это работает</h2>
      <ol>
        <li>Первый человек создаёт сделку и отправляет свой подарок на <strong>@NovaGiftSupp</strong>.</li>
        <li>Второй человек отправляет свой подарок первому человеку (напрямую).</li>
        <li>Тот, кто получил подарок, открывает ссылку сделки и жмёт «Я получил подарок».</li>
        <li>Бот сообщает поддержке, и подарок от @NovaGiftSupp уходит второму участнику.</li>
      </ol>
    </section>
  </div>

  <!-- ВАЖНО: подключаем Telegram WebApp SDK -->
  <script src="https://telegram.org/js/telegram-web-app.js"></script>

  <script>
    // Проверяем, есть ли WebApp-окружение
    const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
    if (tg) {
      tg.expand();
      const envInfo = document.getElementById('envInfo');
      if (envInfo) envInfo.textContent = 'Открыто внутри Telegram WebApp ✔';
    } else {
      const envInfo = document.getElementById('envInfo');
      if (envInfo) envInfo.textContent = 'Сейчас страница открыта как обычный сайт. Для работы открой её через бота в Telegram.';
    }

    function getQueryParam(key) {
      const params = new URLSearchParams(window.location.search);
      return params.get(key);
    }

    const screenCreate = document.getElementById('screen-create');
    const screenConfirm = document.getElementById('screen-confirm');
    const createStatus = document.getElementById('createStatus');
    const confirmStatus = document.getElementById('confirmStatus');
    const confirmWarning = document.getElementById('confirmWarning');

    const mode = getQueryParam('mode');
    const dealIdFromUrl = getQueryParam('dealId');

    if (mode === 'confirm' && dealIdFromUrl) {
      screenCreate.style.display = 'none';
      screenConfirm.style.display = 'block';
    } else {
      screenCreate.style.display = 'block';
      screenConfirm.style.display = 'none';
    }

    // Создание сделки
    document.getElementById('btnCreate').addEventListener('click', () => {
      const otherUsername = document.getElementById('otherUsername').value.trim();
      const giftFromA = document.getElementById('giftFromA').value.trim();
      const giftFromB = document.getElementById('giftFromB').value.trim();

      if (!otherUsername || !giftFromA || !giftFromB) {
        createStatus.style.display = 'block';
        createStatus.textContent = 'Заполни все поля.';
        createStatus.style.color = '#f97316';
        return;
      }

      const payload = {
        type: 'CREATE_DEAL',
        otherUsername,
        giftFromA,
        giftFromB
      };

      if (!tg) {
        createStatus.style.display = 'block';
        createStatus.style.color = '#f97316';
        createStatus.textContent = 'Открой мини-приложение через бота в Telegram (кнопка "Открыть NovaGift"), тогда сделка создастся.';
        return;
      }

      tg.sendData(JSON.stringify(payload));
      createStatus.style.display = 'block';
      createStatus.style.color = '#22c55e';
      createStatus.textContent = 'Сделка отправлена боту, смотри сообщение в чате.';
      setTimeout(() => tg.close(), 800);
    });

    // Подтверждение получения подарка
    document.getElementById('btnConfirm').addEventListener('click', () => {
      if (!dealIdFromUrl) {
        confirmWarning.style.display = 'block';
        confirmWarning.textContent = 'Не найден ID сделки в ссылке.';
        return;
      }

      const payload = {
        type: 'CONFIRM_RECEIVE',
        dealId: dealIdFromUrl
      };

      if (!tg) {
        confirmWarning.style.display = 'block';
        confirmWarning.textContent = 'Открой эту страницу через бота в Telegram (WebApp), тогда можно будет подтвердить сделку.';
        return;
      }

      tg.sendData(JSON.stringify(payload));
      confirmStatus.style.display = 'block';
      confirmStatus.textContent = 'Подтверждение отправлено. Бот всё сделает дальше.';
      setTimeout(() => tg.close(), 800);
    });
  </script>
</body>
</html>`;

// ------------------- EXPRESS СЕРВЕР -------------------

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send(html);
});

app.get('/health', (req, res) => {
  res.send('ok');
});

app.listen(PORT, () => {
  console.log(`🌐 WebApp слушает порт ${PORT}`);
});

// ------------------- TELEGRAM BOT -------------------

const bot = new Telegraf(BOT_TOKEN);

// простое хранилище сделок в памяти
const deals = new Map();

/**
 * deal:
 * {
 *   id,
 *   creatorId,
 *   creatorUsername,
 *   otherUsername,
 *   giftFromA,
 *   giftFromB,
 *   status: 'CREATED' | 'COMPLETED',
 *   createdAt
 * }
 */

bot.start((ctx) => {
  const text =
    '👋 Добро пожаловать в NovaGift — безопасный обмен подарками.\n\n' +
    'Для передачи подарка используйте аккаунт: @NovaGiftSupp\n\n' +
    'Нажми кнопку ниже, чтобы открыть мини-приложение.';

  return ctx.reply(text, {
    reply_markup: {
      keyboard: [
        [
          {
            text: '🎁 Открыть NovaGift',
            web_app: { url: WEBAPP_URL }
          }
        ]
      ],
      resize_keyboard: true
    }
  });
});

bot.on('message', async (ctx) => {
  const webAppData = ctx.message.web_app_data;
  if (!webAppData) return;

  let payload;
  try {
    payload = JSON.parse(webAppData.data);
  } catch (e) {
    console.error('Bad WebApp data', e);
    return;
  }

  // Создание сделки
  if (payload.type === 'CREATE_DEAL') {
    const from = ctx.from;
    const dealId = 'deal_' + Date.now().toString(36);

    const deal = {
      id: dealId,
      creatorId: from.id,
      creatorUsername: from.username || ('id' + from.id),
      otherUsername: (payload.otherUsername || '').replace('@', ''),
      giftFromA: payload.giftFromA || '',
      giftFromB: payload.giftFromB || '',
      status: 'CREATED',
      createdAt: new Date()
    };

    deals.set(dealId, deal);

    const linkForOther = `${WEBAPP_URL}?dealId=${encodeURIComponent(dealId)}&mode=confirm`;

    await ctx.reply(
      '✅ Сделка создана.\n\n' +
      `ID сделки: ${dealId}\n\n` +
      '1️⃣ Отправь свой подарок на @NovaGiftSupp.\n' +
      '2️⃣ Отправь эту ссылку второму участнику, чтобы он подтвердил получение подарка:\n' +
      linkForOther
    );

    if (SUPPORT_CHAT_ID) {
      await ctx.telegram.sendMessage(
        SUPPORT_CHAT_ID,
        `Новая сделка ${deal.id}\n` +
        `От: @${deal.creatorUsername}\n` +
        `Второй участник: @${deal.otherUsername}\n` +
        `Подарок от A: ${deal.giftFromA}\n` +
        `Подарок от B: ${deal.giftFromB}`
      );
    }
  }

  // Подтверждение получения подарка
  if (payload.type === 'CONFIRM_RECEIVE') {
    const { dealId } = payload;
    const user = ctx.from;
    const deal = deals.get(dealId);

    if (!deal) {
      await ctx.reply('❌ Сделка не найдена. Возможно, ссылка устарела.');
      return;
    }

    if (deal.status === 'COMPLETED') {
      await ctx.reply('✅ Эта сделка уже завершена.');
      return;
    }

    deal.status = 'COMPLETED';

    await ctx.reply(
      '✅ Ты подтвердил, что подарок получен.\n' +
      'Поддержка передаст второй подарок с аккаунта @NovaGiftSupp.'
    );

    if (deal.creatorId && deal.creatorId !== user.id) {
      try {
        await ctx.telegram.sendMessage(
          deal.creatorId,
          `✅ Ваша сделка ${deal.id} подтверждена вторым участником.\n` +
          'Поддержка отправит ваш подарок с @NovaGiftSupp.'
        );
      } catch (e) {
        console.error('Cannot notify creator', e);
      }
    }

    if (SUPPORT_CHAT_ID) {
      const confirmerUsername = user.username || ('id' + user.id);
      await ctx.telegram.sendMessage(
        SUPPORT_CHAT_ID,
        `🔔 Подтверждение сделки ${deal.id}\n\n` +
        `Создатель: @${deal.creatorUsername}\n` +
        `Второй участник: @${deal.otherUsername}\n` +
        `Подтвердил получение: @${confirmerUsername}\n\n` +
        `Нужно отправить подарок создателя (@${deal.creatorUsername}) ` +
        `второму участнику (@${deal.otherUsername}) с аккаунта @NovaGiftSupp.`
      );
    }
  }
});

bot.launch();
console.log('🤖 Telegram bot запущен');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
