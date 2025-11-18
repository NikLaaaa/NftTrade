// index.js
// Один файл: Express + мини-аппка + Telegram-бот (бот только открывает WebApp)

const express = require('express');
const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL; // например: https://novagift-production.up.railway.app

if (!BOT_TOKEN) {
  console.error('❌ Не задан BOT_TOKEN');
  process.exit(1);
}
if (!WEBAPP_URL) {
  console.warn('⚠ Не задан WEBAPP_URL (например https://...up.railway.app)');
}

// ------------------- Память сделок -------------------
/**
 * deal:
 * {
 *   id,
 *   creatorId,
 *   creatorUsername,
 *   otherUsername,
 *   giftFromA,
 *   giftFromB,
 *   status: 'CREATED' | 'A_SENT_TO_SUPPORT' | 'COMPLETED',
 *   createdAt
 * }
 */
const deals = new Map();

// ------------------- HTML мини-аппки -------------------

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

    /* Модалка */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(6px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 50;
    }

    .modal {
      width: 100%;
      max-width: 420px;
      background: radial-gradient(circle at top, #111827 0%, #020617 80%);
      border-radius: 20px;
      padding: 18px 16px 16px;
      border: 1px solid rgba(148, 163, 184, 0.25);
      box-shadow: 0 20px 60px rgba(15, 23, 42, 0.95);
    }

    .modal-title {
      font-size: 17px;
      font-weight: 600;
      margin: 0 0 6px;
    }

    .modal-text {
      font-size: 13px;
      color: #e5e7eb;
      margin: 0 0 10px;
    }

    .modal-sub {
      font-size: 12px;
      color: #9ca3af;
      margin: 0 0 10px;
    }

    .modal-link-box {
      background: rgba(15, 23, 42, 0.9);
      border-radius: 12px;
      border: 1px solid rgba(148, 163, 184, 0.35);
      padding: 8px 10px;
      font-size: 12px;
      color: #e5e7eb;
      word-break: break-all;
      margin-bottom: 10px;
    }

    .modal-buttons {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }

    .modal-btn {
      flex: 1;
      border: none;
      border-radius: 999px;
      height: 40px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }

    .modal-btn-primary {
      background: linear-gradient(135deg, #f97316, #ec4899, #8b5cf6);
      color: #fff;
    }

    .modal-btn-secondary {
      background: rgba(15, 23, 42, 0.9);
      color: #e5e7eb;
      border: 1px solid rgba(148, 163, 184, 0.7);
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
      <p class="small">После создания сделки появятся шаги и ссылка для второго участника.</p>
      <p id="createStatus" class="success" style="display:none;"></p>
    </section>

    <section id="screen-confirm" class="card" style="display:none;">
      <h2>Подтверждение подарка</h2>
      <p>Ты открыл ссылку сделки. Если подарок уже у тебя, нажми кнопку ниже.</p>
      <button class="primary-btn" id="btnConfirm">Я получил(а) подарок</button>
      <p class="small">После подтверждения сделка будет завершена.</p>
      <p id="confirmStatus" class="success" style="display:none;"></p>
      <p id="confirmWarning" class="warning" style="display:none;"></p>
    </section>

    <section class="card subtle">
      <h2>Как это работает</h2>
      <ol>
        <li>Первый человек создаёт сделку и отправляет свой подарок на <strong>@NovaGiftSupp</strong>.</li>
        <li>Второй человек отправляет свой подарок первому человеку (напрямую).</li>
        <li>Тот, кто получил подарок, открывает ссылку сделки и жмёт «Я получил(а) подарок».</li>
        <li>Сделка считается завершённой.</li>
      </ol>
    </section>
  </div>

  <!-- МОДАЛКА -->
  <div id="modalBackdrop" class="modal-backdrop">
    <div class="modal">
      <h3 id="modalTitle" class="modal-title"></h3>
      <p id="modalText" class="modal-text"></p>
      <p id="modalSub" class="modal-sub" style="display:none;"></p>
      <div id="modalLinkBox" class="modal-link-box" style="display:none;"></div>
      <div class="modal-buttons">
        <button id="modalSecondary" class="modal-btn modal-btn-secondary" style="display:none;">Отмена</button>
        <button id="modalPrimary" class="modal-btn modal-btn-primary">Ок</button>
      </div>
    </div>
  </div>

  <script src="https://telegram.org/js/telegram-web-app.js"></script>

  <script>
    const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
    let initUser = null;

    if (tg) {
      tg.expand();
      initUser = tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user : null;
      const envInfo = document.getElementById('envInfo');
      if (envInfo) envInfo.textContent = 'Открыто внутри Telegram WebApp ✔';
    } else {
      const envInfo = document.getElementById('envInfo');
      if (envInfo) envInfo.textContent = 'Сейчас страница открыта как обычный сайт. Всё равно можно тестировать.';
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
      loadDealAndShowJoinModal(dealIdFromUrl);
    } else {
      screenCreate.style.display = 'block';
      screenConfirm.style.display = 'none';
    }

    // ---------- модалка ----------
    const modalBackdrop = document.getElementById('modalBackdrop');
    const modalTitle = document.getElementById('modalTitle');
    const modalText = document.getElementById('modalText');
    const modalSub = document.getElementById('modalSub');
    const modalLinkBox = document.getElementById('modalLinkBox');
    const modalPrimary = document.getElementById('modalPrimary');
    const modalSecondary = document.getElementById('modalSecondary');

    function openModal(opts) {
      modalTitle.textContent = opts.title || '';
      modalText.textContent = opts.text || '';
      if (opts.sub) {
        modalSub.style.display = 'block';
        modalSub.textContent = opts.sub;
      } else {
        modalSub.style.display = 'none';
      }
      if (opts.link) {
        modalLinkBox.style.display = 'block';
        modalLinkBox.textContent = opts.link;
      } else {
        modalLinkBox.style.display = 'none';
      }
      modalPrimary.textContent = opts.primaryText || 'Ок';
      modalSecondary.style.display = opts.secondaryText ? 'inline-flex' : 'none';
      if (opts.secondaryText) modalSecondary.textContent = opts.secondaryText;

      modalBackdrop.style.display = 'flex';

      modalPrimary.onclick = () => {
        if (opts.onPrimary) opts.onPrimary();
      };
      modalSecondary.onclick = () => {
        if (opts.onSecondary) opts.onSecondary();
        closeModal();
      };
    }

    function closeModal() {
      modalBackdrop.style.display = 'none';
    }

    // ---------- создание сделки (без проверки tg/initUser) ----------

    document.getElementById('btnCreate').addEventListener('click', async () => {
      const otherUsername = document.getElementById('otherUsername').value.trim();
      const giftFromA = document.getElementById('giftFromA').value.trim();
      const giftFromB = document.getElementById('giftFromB').value.trim();

      if (!otherUsername || !giftFromA || !giftFromB) {
        createStatus.style.display = 'block';
        createStatus.textContent = 'Заполни все поля.';
        createStatus.style.color = '#f97316';
        return;
      }

      try {
        const res = await fetch('/api/deal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            otherUsername,
            giftFromA,
            giftFromB,
            user: initUser ? { id: initUser.id, username: initUser.username || '' } : null
          })
        });

        if (!res.ok) {
          createStatus.style.display = 'block';
          createStatus.style.color = '#f97316';
          createStatus.textContent = 'Ошибка при создании сделки.';
          return;
        }

        const deal = await res.json();
        const dealId = deal.id;
        const link = window.location.origin + '?dealId=' + encodeURIComponent(dealId) + '&mode=confirm';

        createStatus.style.display = 'block';
        createStatus.style.color = '#22c55e';
        createStatus.textContent = 'Сделка создана. Следуй инструкциям.';

        const otherTag = otherUsername.startsWith('@') ? otherUsername : '@' + otherUsername;

        // 1: отправь ссылку
        openModal({
          title: 'Сделка создана',
          text: 'Отправь эту ссылку второму участнику, чтобы он присоединился к сделке.',
          sub: 'Сделка уже сохранена на сервере и не пропадёт, если ты выйдешь из приложения.',
          link,
          primaryText: 'Дальше',
          onPrimary: () => {
            // 2: отправь подарок на поддержку и скрин
            openModal({
              title: 'Передай подарок на поддержку',
              text: 'Отправь свой подарок на аккаунт @NovaGiftSupp.',
              sub: 'Сделай скриншот передачи и отправь его пользователю ' + otherTag + ' в личные сообщения. После этого нажми кнопку ниже.',
              primaryText: 'Я отправил(а) подарок и скриншот',
              onPrimary: async () => {
                await fetch('/api/deal/' + encodeURIComponent(dealId) + '/creator-sent', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' }
                });
                closeModal();
              }
            });
          }
        });
      } catch (e) {
        console.error(e);
        createStatus.style.display = 'block';
        createStatus.style.color = '#f97316';
        createStatus.textContent = 'Ошибка сети. Попробуй ещё раз.';
      }
    });

    // ---------- подтверждение получения ----------

    document.getElementById('btnConfirm').addEventListener('click', async () => {
      if (!dealIdFromUrl) {
        confirmWarning.style.display = 'block';
        confirmWarning.textContent = 'Не найден ID сделки в ссылке.';
        return;
      }

      try {
        const res = await fetch('/api/deal/' + encodeURIComponent(dealIdFromUrl) + '/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user: initUser ? { id: initUser.id, username: initUser.username || '' } : null
          })
        });

        if (!res.ok) {
          confirmWarning.style.display = 'block';
          confirmWarning.textContent = 'Ошибка при подтверждении сделки.';
          return;
        }

        confirmStatus.style.display = 'block';
        confirmStatus.textContent = 'Подтверждение принято. Сделка завершена.';
      } catch (e) {
        console.error(e);
        confirmWarning.style.display = 'block';
        confirmWarning.textContent = 'Ошибка сети.';
      }
    });

    // ---------- модалка при присоединении по ссылке ----------

    async function loadDealAndShowJoinModal(dealId) {
      try {
        const res = await fetch('/api/deal/' + encodeURIComponent(dealId));
        if (!res.ok) return;
        const deal = await res.json();

        const myTag = initUser && initUser.username ? '@' + initUser.username : 'ты';
        const creatorTag = deal.creatorUsername ? '@' + deal.creatorUsername : 'создатель';
        const otherTag = deal.otherUsername ? '@' + deal.otherUsername : 'второй участник';

        // если у нас нет initUser, просто показываем общую фразу
        const otherSide = creatorTag + ' / ' + otherTag;

        openModal({
          title: 'Начать сделку',
          text: myTag + ', ты находишься в сделке между ' + creatorTag + ' и ' + otherTag + '.',
          sub: 'Следуйте договорённостям: подарки переводятся вручную, а здесь вы просто фиксируете факт обмена.',
          primaryText: 'Понятно',
          onPrimary: () => closeModal()
        });
      } catch (e) {
        console.error(e);
      }
    }

    // вызываем, если режим confirm
    if (mode === 'confirm' && dealIdFromUrl) {
      loadDealAndShowJoinModal(dealIdFromUrl);
    }
  </script>
</body>
</html>`;

// ------------------- Express сервер -------------------

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send(html);
});

// создать сделку
app.post('/api/deal', (req, res) => {
  const { otherUsername, giftFromA, giftFromB, user } = req.body || {};

  const id = 'deal_' + Date.now().toString(36);

  const deal = {
    id,
    creatorId: user && user.id ? user.id : null,
    creatorUsername: user && user.username ? user.username : 'user',
    otherUsername: (otherUsername || '').replace('@', ''),
    giftFromA: giftFromA || '',
    giftFromB: giftFromB || '',
    status: 'CREATED',
    createdAt: new Date()
  };

  deals.set(id, deal);
  res.json({
    id: deal.id,
    creatorUsername: deal.creatorUsername,
    otherUsername: deal.otherUsername,
    status: deal.status
  });
});

// получить сделку
app.get('/api/deal/:id', (req, res) => {
  const deal = deals.get(req.params.id);
  if (!deal) return res.status(404).json({ error: 'not_found' });
  res.json({
    id: deal.id,
    creatorUsername: deal.creatorUsername,
    otherUsername: deal.otherUsername,
    status: deal.status
  });
});

// отметка "создатель отправил подарок"
app.post('/api/deal/:id/creator-sent', (req, res) => {
  const deal = deals.get(req.params.id);
  if (!deal) return res.status(404).json({ error: 'not_found' });
  deal.status = 'A_SENT_TO_SUPPORT';
  res.json({ ok: true });
});

// подтверждение получения
app.post('/api/deal/:id/confirm', (req, res) => {
  const deal = deals.get(req.params.id);
  if (!deal) return res.status(404).json({ error: 'not_found' });
  deal.status = 'COMPLETED';
  res.json({ ok: true });
});

app.get('/health', (req, res) => {
  res.send('ok');
});

app.listen(PORT, () => {
  console.log('🌐 WebApp listening on', PORT);
});

// ------------------- Telegram-бот (только /start) -------------------

const bot = new Telegraf(BOT_TOKEN);

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

// Бот больше НИЧЕГО не обрабатывает, вся логика — в WebApp
bot.launch();
console.log('🤖 Telegram bot запущен');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
