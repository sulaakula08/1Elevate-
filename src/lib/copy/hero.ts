/** Header, hero and site chrome copy. */

import type { CopyDict } from "./index";

export const HERO_COPY: CopyDict = {
  /* The escaped non-breaking space is deliberate: Russian typography does not
     leave a one-letter preposition at the end of a line, and it also leaves the
     headline exactly one place it can break — before the last word. */
  "hero.title": {
    ru: "Готовься к\u00A0SAT эффективнее",
    en: "Prep smarter for the SAT",
    kk: "SAT-қа тиімдірек дайындал",
  },

  /* Sits beside the wordmark in the signed-out bar, where there is no product
     navigation to carry the left half of the row. */
  "hero.navTagline": {
    ru: "Подготовка к SAT",
    en: "SAT preparation",
    kk: "SAT дайындығы",
  },

  /* ---------------- hero score chart ---------------- */
  "hero.chartTitle": {
    ru: "Динамика баллов",
    en: "Score trend",
    kk: "Балл динамикасы",
  },
  "hero.chartSub": {
    ru: "Четыре пробных теста",
    en: "Four mock tests",
    kk: "Төрт сынақ тест",
  },
  /* The four results are illustrative marketing content, so the card says so. */
  "hero.chartSample": { ru: "Пример", en: "Example", kk: "Мысал" },
  "hero.chartNote": {
    ru: "Иллюстративные данные, а не ваш результат",
    en: "Illustrative data, not your own result",
    kk: "Бұл — көрнекі деректер, сіздің нәтижеңіз емес",
  },
  "hero.chartGoal": { ru: "цель", en: "goal", kk: "мақсат" },
  "hero.chartTest": { ru: "Тест", en: "Test", kk: "Тест" },
  "hero.chartPoints": {
    ru: "Результаты пробных тестов",
    en: "Mock test results",
    kk: "Сынақ тест нәтижелері",
  },
  "hero.chartScoreUnit": { ru: "баллов", en: "points", kk: "балл" },
  "hero.chartVerbal": {
    ru: "Чтение и письмо",
    en: "Reading and Writing",
    kk: "Оқу және жазу",
  },
  "hero.chartMath": { ru: "Математика", en: "Math", kk: "Математика" },

  /* ---------------- footer ---------------- */
  "hero.footerNav": { ru: "Разделы", en: "Sections", kk: "Бөлімдер" },
  "hero.footerAccount": { ru: "Аккаунт", en: "Account", kk: "Аккаунт" },
};
