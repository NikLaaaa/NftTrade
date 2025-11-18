// index.js
// NovaGift: Express + Telegram WebApp + Telegraf бот с deeplink'ами

const express = require('express');
const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL; // https://...up.railway.app
const BOT_USERNAME = process.env.BOT_USERNAME || ''; // без @

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
      background: radial-gradient(circle at top, #020617 0%, #020617 45%, #000 100%);
      color: #f9fafb;
      overflow-x: hidden;
    }

    .app {
      max-width: 480px;
      margin: 0 auto;
      padding: 18px 14px 32px;
      position: relative;
    }

    .bg-orb {
      position: fixed;
      border-radius: 999px;
      filter: blur(40px);
      opacity: 0.2;
      z-index: -1;
      pointer-events: none;
    }
    .bg-orb.orb-1 {
      width: 220px; height: 220px;
      background: radial-gradient(circle, #4f46e5, transparent 70%);
      top: -40px; left: -40px;
      animation: float1 14s ease-in-out infinite;
    }
    .bg-orb.orb-2 {
      width: 260px; height: 260px;
      background: radial-gradient(circle, #ec4899, transparent 70%);
      bottom: -80px; right: -60px;
      animation: float2 18s ease-in-out infinite;
    }

    @keyframes float1 {
      0%, 100% { transform: translate3d(0,0,0); }
      50% { transform: translate3d(12px, 18px, 0); }
    }
    @keyframes float2 {
      0%, 100% { transform: translate3d(0,0,0); }
      50% { transform: translate3d(-18px, -10px, 0); }
    }

    .app-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 18px;
      animation: fadeInUp 0.4s ease-out;
    }

    .logo-circle {
      width: 44px;
      height: 44px;
      border-radius: 999px;
      background: conic-gradient(from 180deg, #f97316, #ec4899, #6366f1, #22d3ee, #f97316);
      position: relative;
      box-shadow:
        0 0 0 1px rgba(15, 23, 42, 0.9),
        0 0 32px rgba(129, 140, 248, 0.7);
      overflow: hidden;
    }
    .logo-circle::after {
      content: "";
      position: absolute;
      inset: 4px;
      border-radius: inherit;
      background: radial-gradient(circle at 30% 0, rgba(255,255,255,0.4), transparent 55%);
      mix-blend-mode: screen;
    }

    .app-header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      letter-spacing: 0.03ем;
    }

    .app-header p {
      margin: 2px 0 0;
      font-size: 13px;
      color: #9ca3af;
    }

    .steps {
      margin-bottom: 14px;
      animation: fadeInUp 0.45s ease-out;
    }

    .steps-track {
      width: 100%;
      height: 5px;
      border-radius: 999px;
      background: rgba(30, 64, 175, 0.7);
      overflow: hidden;
      position: relative;
    }

    .steps-progress {
      height: 100%;
      width: 33%;
      border-radius: inherit;
      background: linear-gradient(90deg, #f97316, #ec4899, #8b5cf6);
      box-shadow: 0 0 14px rgba(129, 140, 248, 0.8);
      transition: width 0.35s ease-out;
    }

    .steps-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #9ca3af;
      margin-top: 6px;
    }

    .card {
      background: radial-gradient(circle at top left, rgba(37, 99, 235, 0.18), transparent 55%),
                  rgba(15, 23, 42, 0.96);
      border-radius: 20px;
      padding: 16px 14px 18px;
      margin-bottom: 14px;
      border: 1px solid rgba(148, 163, 184, 0.18);
      box-shadow:
        0 18px 40px rgba(15, 23, 42, 0.9),
        0 0 0 1px rgba(15, 23, 42, 0.9);
      animation: fadeInUp 0.35s ease-out;
    }

    .card.subtle {
      background: rgba(15, 23, 42, 0.9);
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.85);
    }

    .card h2 {
      margin: 0 0 8px;
      font-size: 16px;
      letter-spacing: 0.02em;
    }

    .info-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
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
      background: radial-gradient(circle at top, rgba(30, 64, 175, 0.5), rgba(15, 23, 42, 0.98));
      border-radius: 14px;
      border: 1px solid rgba(148, 163, 184, 0.45);
      padding: 9px 11px;
      color: #f9fafb;
      font-size: 14px;
      outline: none;
      transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.08s ease;
    }

    input::placeholder, textarea::placeholder {
      color: #6b7280;
    }

    input:focus, textarea:focus {
      border-color: #8b5cf6;
      box-shadow:
        0 0 0 1px rgba(129, 140, 248, 0.7),
        0 0 32px rgba(59, 130, 246, 0.35);
      transform: translateY(-0.5px);
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
      height: 48px;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 500;
      margin-top: 8px;
      position: relative;
      overflow: hidden;
    }

    .primary-btn {
      background: linear-gradient(120deg, #f97316, #ec4899, #8b5cf6);
      color: white;
      box-shadow:
        0 18px 40px rgba(59, 130, 246, 0.45),
        0 0 32px rgba(129, 140, 248, 0.8);
      transition: transform 0.1s ease, box-shadow 0.2s ease, filter 0.1s ease;
    }
    .primary-btn::before {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(120deg, rgba(255,255,255,0.4), transparent 50%, rgba(255,255,255,0.2));
      opacity: 0;
      transform: translateX(-40%);
      transition: opacity 0.25s ease, transform 0.25s ease;
    }
    .primary-btn:hover::before {
      opacity: 1;
      transform: translateX(40%);
    }
    .primary-btn:active {
      transform: translateY(1px);
      filter: brightness(0.97);
      box-shadow:
        0 12px 28px rgba(59, 130, 246, 0.4),
        0 0 22px rgba(129, 140, 248, 0.7);
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
      margin-top: 4px;
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

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: radial-gradient(circle at top, rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.96));
      backdrop-filter: blur(10px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 50;
    }

    .modal {
      width: 100%;
      max-width: 430px;
      background: radial-gradient(circle at top left, rgba(59, 130, 246, 0.25), transparent 70%),
                  rgba(15, 23, 42, 0.98);
      border-radius: 22px;
      padding: 18px 16px 16px;
      border: 1px solid rgba(148, 163, 184, 0.35);
      box-shadow:
        0 26px 70px rgba(15, 23, 42, 0.95),
        0 0 0 1px rgba(15, 23, 42, 0.9);
      animation: scaleIn 0.28s ease-out;
    }

    .modal-title {
      font-size: 17px;
      font-weight: 600;
      margin: 0 0 6px;
    }

    .modal-text {
      font-size: 13px;
      color: #e5e7eb;
      margin: 0 0 8px;
    }

    .modal-sub {
      font-size: 12px;
      color: #9ca3af;
      margin: 0 0 10px;
    }

    .modal-link-box {
      background: rgba(15, 23, 42, 0.9);
      border-radius: 14px;
      border: 1px solid rgba(148, 163, 184, 0.55);
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
      box-shadow: 0 14px 34px rgba(79, 70, 229, 0.6);
    }

    .modal-btn-secondary {
      background: rgba(15, 23, 42, 0.9);
      color: #e5e7eb;
      border: 1px solid rgba(148, 163, 184, 0.75);
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translate3d(0, 10px, 0);
      }
      to {
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }
    }

    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.94) translate3d(0, 8px, 0);
      }
      to {
        opacity: 1;
        transform: scale(1) translate3d(0, 0, 0);
      }
    }
  </style>
</head>
<body>
  <div class="bg-orb orb-1"></div>
  <div class="bg-orb orb-2"></div>

  <div class="app">
    <header class="app-header">
      <div class="logo-circle"></div>
      <div>
        <h1>NovaGift</h1>
        <p>Стильный обмен подарками через Telegram</p>
      </div>
    </header>

    <section class="steps">
      <div class="steps-track">
        <div id="stepsProgress" class="steps-progress"></div>
      </div>
      <div id="stepsLabel" class="steps-label">Шаг 1 из 3 · Создание сделки</div>
    </section>

    <section class="card">
      <p class="info-label">ЭСКРОУ-АККАУНТ</p>
      <p>Для передачи подарка используйте этот аккаунт:</p>
      <p class="accent">@NovaGiftSupp</p>
      <p class="small">Сначала один человек отправляет подарок на этот аккаунт, потом второй — напрямую первому.</p>
      <p id="envInfo" class="small" style="margin-top:4px; opacity:0.85;"></p>
    </section>

    <!-- Шаг 1: Создание сделки -->
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

    <!-- Шаг 2: Подтверждение скриншота -->
    <section id="screen-confirm" class="card" style="display:none;">
      <h2>Подтверждение скриншота</h2>
      <p>Если скриншот об отправке подарка получен, нажми кнопку ниже.</p>

      <button class="primary-btn" id="btnConfirm">Я получил(а) скриншот</button>

      <p class="small">
        После подтверждения можно переходить к отправке подарка второму человеку.
      </p>

      <p id="confirmStatus" class="success" style="display:none;"></p>
      <p id="confirmWarning" class="warning" style="display:none;"></p>
    </section>

    <!-- Шаг 3: Передача подарка второму участнику -->
    <section id="screen-send" class="card" style="display:none;">
      <h2>Передача подарка участнику</h2>

      <p id="sendGiftInfo" style="margin-bottom:12px;">
        Загружаем данные сделки...
      </p>

      <button class="primary-btn" id="btnSendGift">Я отправил(а) подарок</button>

      <p class="small" style="margin-top:10px;">
        Сделай скриншот отправки подарка и отправь его пользователю <strong id="sendGiftToUser"></strong>.
      </p>

      <p id="sendStatus" class="success" style="display:none;margin-top:10px;">
        Готово! Подарок отправлен. Сделка считается завершённой.
      </p>
    </section>

    <section class="card subtle">
      <h2>Как это работает</h2>
      <ol>
        <li>Первый человек создаёт сделку и отправляет свой подарок на <strong>@NovaGiftSupp</strong>.</li>
        <li>Второй человек отправляет свой подарок первому человеку (напрямую).</li>
        <li>Скриншоты перевода подарков отправляются друг другу.</li>
        <li>В NovaGift оба подтверждают обмен — и сделка считается завершённой.</li>
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
    const BOT_USERNAME = '${BOT_USERNAME}';

    if (tg) {
      tg.expand();
      initUser = tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user : null;
      const envInfo = document.getElementById('envInfo');
      if (envInfo) envInfo.textContent = 'Открыто внутри Telegram WebApp ✔';
    } else {
      const envInfo = document.getElementById('envInfo');
      if (envInfo) envInfo.textContent = 'Страница открыта как обычный сайт. Можно тестировать и так.';
    }

    function getQueryParam(key) {
      const params = new URLSearchParams(window.location.search);
      return params.get(key);
    }

    const screenCreate = document.getElementById('screen-create');
    const screenConfirm = document.getElementById('screen-confirm');
    const screenSend = document.getElementById('screen-send');
    const createStatus = document.getElementById('createStatus');
    const confirmStatus = document.getElementById('confirmStatus');
    const confirmWarning = document.getElementById('confirmWarning');
    const sendStatus = document.getElementById('sendStatus');

    const stepsLabelEl = document.getElementById('stepsLabel');
    const stepsProgressEl = document.getElementById('stepsProgress');

    function setStep(step, total, label) {
      const percent = Math.max(0, Math.min(100, (step / total) * 100));
      stepsProgressEl.style.width = percent + '%';
      stepsLabelEl.textContent = 'Шаг ' + step + ' из ' + total + ' · ' + label;
    }

    const mode = getQueryParam('mode');
    const dealIdFromUrl = getQueryParam('dealId');

    if (mode === 'confirm' && dealIdFromUrl) {
      screenCreate.style.display = 'none';
      screenConfirm.style.display = 'block';
      screenSend.style.display = 'none';
      setStep(2, 3, 'Подтверждение скриншота');
      loadDealAndShowJoinModal(dealIdFromUrl);
    } else {
      screenCreate.style.display = 'block';
      screenConfirm.style.display = 'none';
      screenSend.style.display = 'none';
      setStep(1, 3, 'Создание сделки');
    }

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

    // ---------- создание сделки ----------

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

        let shareLink;
        if (BOT_USERNAME) {
          shareLink = 'https://t.me/' + BOT_USERNAME + '?start=' + encodeURIComponent(dealId);
        } else {
          shareLink = window.location.origin + '?dealId=' + encodeURIComponent(dealId) + '&mode=confirm';
        }

        createStatus.style.display = 'block';
        createStatus.style.color = '#22c55e';
        createStatus.textContent = 'Сделка создана. Следуй шагам в окне.';

        const otherTag = otherUsername.startsWith('@') ? otherUsername : '@' + otherUsername;
        setStep(1, 3, 'Создание сделки');

        // Модалка 1: отправь ссылку
        openModal({
          title: 'Сделка создана',
          text: 'Отправь эту ссылку второму участнику. Она откроет бота, а затем мини-приложение с этой сделкой.',
          sub: 'Сделка сохранена на сервере и не пропадёт, если ты выйдешь из приложения.',
          link: shareLink,
          primaryText: 'Понятно',
          onPrimary: () => {
            // Модалка 2: передай подарок на поддержку + скриншот
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

                // Модалка 3: жди скрин от второго и отправь ему подарок
                openModal({
                  title: 'Жди скриншот от ' + otherTag,
                  text: 'Ожидаем скриншот, что ' + otherTag + ' отправил(а) свой подарок вам, в случае отказа сделки напишите нам, мы вернем вам подарок',
                  sub: 'После того как вы обменяетесь подарками и скриншотами, второй участник подтвердит сделку в NovaGift по ссылке.',
                  primaryText: 'Понятно',
                  onPrimary: () => {
                    closeModal();
                  }
                });
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

    // ---------- подтверждение получения скриншота (для второго) ----------

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
        confirmStatus.textContent = 'Подтверждение принято. Переходим к отправке подарка.';

        setStep(3, 3, 'Передача подарка участнику');
        screenConfirm.style.display = 'none';
        screenSend.style.display = 'block';
        loadSendGiftScreen(dealIdFromUrl);
      } catch (e) {
        console.error(e);
        confirmWarning.style.display = 'block';
        confirmWarning.textContent = 'Ошибка сети.';
      }
    });

    // ---------- экран отправки подарка (для второго) ----------

    document.getElementById('btnSendGift').addEventListener('click', () => {
      sendStatus.style.display = 'block';
    });

    async function loadSendGiftScreen(dealId) {
      try {
        const res = await fetch('/api/deal/' + encodeURIComponent(dealId));
        if (!res.ok) return;

        const deal = await res.json();

        const otherTag = deal.otherUsername ? '@' + deal.otherUsername : '(второй участник)';
        const creatorTag =
          deal.creatorUsername && deal.creatorUsername !== 'user'
            ? '@' + deal.creatorUsername
            : 'создатель сделки';

        const infoHtml =
          'Ты должен(на) передать подарок пользователю <strong>' + creatorTag + '</strong>.<br><br>' +
          '<strong>Описание вашей сделки:</strong><br>' +
          'Подарок от ' + creatorTag + ': ' + (deal.giftFromA || '—') + '<br>' +
          'Подарок от ' + otherTag + ': ' + (deal.giftFromB || '—');

        document.getElementById('sendGiftInfo').innerHTML = infoHtml;
        document.getElementById('sendGiftToUser').textContent = creatorTag;
      } catch (e) {
        console.error(e);
      }
    }

    // ---------- модалка при присоединении по ссылке (для второго) ----------

    async function loadDealAndShowJoinModal(dealId) {
      try {
        const res = await fetch('/api/deal/' + encodeURIComponent(dealId));
        if (!res.ok) return;
        const deal = await res.json();

        const myTag = initUser && initUser.username ? '@' + initUser.username : 'ты';
        const creatorTag =
          deal.creatorUsername && deal.creatorUsername !== 'user'
            ? '@' + deal.creatorUsername
            : 'создатель сделки';
        const otherTag =
          deal.otherUsername
            ? '@' + deal.otherUsername
            : 'второй участник';

        openModal({
          title: 'Начать сделку',
          text: myTag + ', ты находишься в сделке между ' + creatorTag + ' и ' + otherTag + '.',
          sub: 'Сначала дождись скриншота перевода подарка, затем подтвердите его в этом окне и завершите обмен.',
          primaryText: 'Понятно',
          onPrimary: () => closeModal()
        });
      } catch (e) {
        console.error(e);
      }
    }

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
    creatorUsername: user && user.username ? user.username : null,
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
    giftFromA: deal.giftFromA,
    giftFromB: deal.giftFromB,
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
    giftFromA: deal.giftFromA,
    giftFromB: deal.giftFromB,
    status: deal.status
  });
});

// отметка "создатель отправил на поддержку"
app.post('/api/deal/:id/creator-sent', (req, res) => {
  const deal = deals.get(req.params.id);
  if (!deal) return res.status(404).json({ error: 'not_found' });
  deal.status = 'A_SENT_TO_SUPPORT';
  res.json({ ok: true });
});

// подтверждение получения (используем как "получен скрин от второго")
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

// ------------------- Telegram-бот -------------------

const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
  const payload = ctx.startPayload;

  if (payload && payload.startsWith('deal_')) {
    const dealId = payload;
    const url = `${WEBAPP_URL}?dealId=${encodeURIComponent(dealId)}&mode=confirm`;

    return ctx.reply(
      'Ты открыл ссылку сделки. Нажми кнопку ниже, чтобы открыть её в мини-приложении NovaGift.',
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Открыть сделку',
                web_app: { url }
              }
            ]
          ]
        }
      }
    );
  }

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

bot.launch();
console.log('🤖 Telegram bot запущен');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
