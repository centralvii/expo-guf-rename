# 🛠️ GD Helper

> **Premium productivity suite for GD specialists.**  
> Built with performance, privacy, and aesthetics in mind.

[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)
[![React](https://img.shields.io/badge/Powered_by-React-blue?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/Strict-TypeScript-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Built_with-Vite-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)

---

## ✨ Обзор (Overview)

**GD Helper** — это набор инструментов для автоматизации рутинных процессов при работе с игровыми ресурсами и документацией. Приложение полностью клиентское: ваши файлы обрабатываются локально и никогда не передаются на сервер.

### 🍱 Основные инструменты:

#### 1. 📦 GUF Packer
Умный инструмент для пакетного переименования ресурсов внутри ZIP-архивов.
- **Гибкие шаблоны:** Используйте теги `{cleanName}`, `{order}` и другие для формирования имен.
- **Массовое заполнение:** Редактируйте параметры сразу для всех файлов.
- **Drag & Drop:** Изменяйте порядок файлов простым перетаскиванием (DnD).
- **README генератор:** Автоматическое создание сопроводительной документации к архиву.

#### 📝 2. Task Helper
Продвинутый реестр задач с фокусом на структуру и удобство.
- **Markdown Support:** Пишите отчеты и инструкции с использованием полноценного Markdown.
- **Структурированные разделы:** Разделение на "Предысторию", "Решение" и "Результат".
- **Локальное хранилище:** Все данные сохраняются в IndexedDB и не пропадают после перезагрузки.
- **Премиальный UX:** Всплывающие уведомления (Toasts) и плавные переходы.

---

## 🖼️ Скриншоты (Gallery)

### Главная страница / Home Page
![Home Page](./docs/screenshots/screenshot-home.png)

### GUF Packer в работе
![GUF Packer](./docs/screenshots/screenshot-guf.png)

### Task Helper / Редактор задач
![Task Helper](./docs/screenshots/screenshot-tasks.png)

---

## 🛠️ Технологический стек (Stack)

- **Frontend:** React 19 + Vite
- **Language:** TypeScript (Strict mode)
- **Styling:** CSS3 (Custom Design System + Glassmorphism)
- **Libraries:**
  - `lucide-react` — Иконки
  - `@dnd-kit` — Drag & Drop функционал
  - `jszip` — Работа с архивами
  - `react-markdown` — Рендеринг разметки
  - `idb-keyval` — Хранение данных

## 🚀 Быстрый старт (Development)

1. Установите зависимости:
   ```bash
   npm install
   ```

2. Запустите сервер разработки:
   ```bash
   npm run dev
   ```

3. Соберите проект для продакшена:
   ```bash
   npm run build
   ```

---

<p align="center">
  Сделано с ❤️ для ускорения разработки.
</p>
