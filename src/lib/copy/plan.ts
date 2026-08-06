/** Dashboard, mock-test setup and exam-countdown copy. */

import type { CopyDict } from "./index";

export const PLAN_COPY: CopyDict = {
  /* ---------------- dashboard ---------------- */
  "plan.overview": { ru: "Ваш прогресс", en: "Your progress", kk: "Үлгеріміңіз" },
  "plan.answered": { ru: "Отвечено", en: "Answered", kk: "Жауап берілді" },
  "plan.accuracy": { ru: "Точность", en: "Accuracy", kk: "Дәлдік" },
  "plan.queue": { ru: "На повторении", en: "In review", kk: "Қайталауда" },
  "plan.streak": { ru: "Дней подряд", en: "Day streak", kk: "Қатарынан күн" },
  "plan.ofBank": { ru: "из банка", en: "of the bank", kk: "банктен" },
  "plan.noAttempts": { ru: "пока нет попыток", en: "no attempts yet", kk: "әзірге әрекет жоқ" },
  "plan.queueClear": { ru: "всё разобрано", en: "all cleared", kk: "барлығы талданды" },
  "plan.streakStart": { ru: "начните сегодня", en: "start today", kk: "бүгін бастаңыз" },
  "plan.startHere": {
    ru: "Начните с одной сессии — десять вопросов, и на этом экране появятся ваши данные.",
    en: "Start with one session — ten questions, and this screen fills with your own data.",
    kk: "Бір сессиядан бастаңыз — он сұрақ, содан кейін бұл экранда деректеріңіз шығады.",
  },

  /* ---------------- exam countdown ---------------- */
  "plan.countdownLabel": { ru: "До следующего SAT", en: "Until the next SAT", kk: "Келесі SAT-қа дейін" },
  "plan.countdownDays": { ru: "дн.", en: "d", kk: "күн" },
  "plan.countdownHours": { ru: "ч", en: "h", kk: "сағ" },
  "plan.countdownMinutes": { ru: "мин", en: "m", kk: "мин" },
  "plan.countdownNone": {
    ru: "Дата ещё не объявлена",
    en: "No date announced yet",
    kk: "Күні әлі жарияланбаған",
  },
  "plan.countdownNoneHint": {
    ru: "Появится здесь, как только College Board опубликует расписание.",
    en: "It shows up here as soon as College Board publishes the schedule.",
    kk: "College Board кестені жариялағанда осында шығады.",
  },

  /* ---------------- mock test setup ---------------- */
  "plan.mockTitle": { ru: "Пробный тест SAT", en: "SAT mock test", kk: "SAT сынақ тесті" },
  "plan.mockSub": {
    ru: "Официальная структура и тайминг. Модули идут подряд, таймер сдаёт модуль сам.",
    en: "The official structure and timing. Modules run back to back; the timer submits for you.",
    kk: "Ресми құрылым мен хронометраж. Модульдер қатарынан, таймер өзі тапсырады.",
  },
  "plan.mockTotal": { ru: "Всего вопросов", en: "Questions", kk: "Барлық сұрақ" },
  "plan.mockDuration": { ru: "Длительность", en: "Duration", kk: "Ұзақтығы" },
  "plan.mockScale": { ru: "Шкала", en: "Score scale", kk: "Шкала" },
  "plan.mockModules": { ru: "Модули", en: "Modules", kk: "Модульдер" },
  "plan.mockReady": {
    ru: "Тест собран полностью",
    en: "The test is complete",
    kk: "Тест толық жиналды",
  },
  "plan.mockPartial": {
    ru: "Часть вопросов будет сгенерирована",
    en: "Some questions will be generated",
    kk: "Сұрақтардың бір бөлігі жасалады",
  },
  "plan.mockShortBody": {
    ru: "В банке пока меньше вопросов, чем требует полный формат. Мы можем дополнить недостающие вопросы с помощью ИИ — по той же спецификации, с тем же разбором. Без генерации тест пройдёт в сокращённом виде, а таймер каждого модуля сократится пропорционально.",
    en: "The bank currently holds fewer questions than the full format needs. We can fill the gap with AI-written questions built to the same blueprint, with the same explanations. Without generation the test runs shortened, and each module's clock shortens with it.",
    kk: "Банкте әзірге толық формат талап ететіннен аз сұрақ бар. Жетіспейтінін сол спецификация бойынша ИИ-мен толықтыра аламыз. Генерациясыз тест қысқартылған түрде өтеді.",
  },
  "plan.mockGenerate": { ru: "Дополнить вопросы", en: "Fill in the questions", kk: "Сұрақтарды толықтыру" },
  "plan.mockGenerating": { ru: "Генерируем…", en: "Generating…", kk: "Жасалуда…" },
  "plan.mockShortenedOk": {
    ru: "Пройти в сокращённом виде",
    en: "Take the shortened test",
    kk: "Қысқартылған түрде өту",
  },
  "plan.mockGenerated": {
    ru: "Вопросы добавлены в банк",
    en: "Questions added to the bank",
    kk: "Сұрақтар банкке қосылды",
  },
  "plan.mockGenPartial": {
    ru: "Удалось добавить не все вопросы — тест всё равно можно пройти.",
    en: "Not every question could be added — the test still runs.",
    kk: "Барлық сұрақ қосылмады — тестті бәрібір өтуге болады.",
  },
  "plan.mockGenUnavailable": {
    ru: "Генерация пока недоступна: на сервере не настроен ключ доступа. Тест можно пройти в сокращённом виде.",
    en: "Generation is unavailable: the server has no access key configured. The shortened test still runs.",
    kk: "Генерация қолжетімсіз: серверде кілт бапталмаған. Тестті қысқартылған түрде өтуге болады.",
  },
  "plan.mockGenFailed": {
    ru: "Не удалось сгенерировать вопросы. Попробуйте ещё раз или пройдите тест в сокращённом виде.",
    en: "Could not generate the questions. Try again, or take the shortened test.",
    kk: "Сұрақтарды жасау мүмкін болмады. Қайталап көріңіз немесе қысқартылған тестті өтіңіз.",
  },
  /* Shown on a generated item inside a test. A student sitting a practice exam
     is entitled to know which questions were not written by a human. */
  "plan.aiBadge": { ru: "ИИ", en: "AI", kk: "ИИ" },
  "plan.aiBadgeTitle": {
    ru: "Вопрос сгенерирован ИИ по спецификации SAT",
    en: "Question generated by AI against the SAT blueprint",
    kk: "Сұрақ SAT спецификациясы бойынша ИИ-мен жасалған",
  },
  "plan.aiInBank": {
    ru: "сгенерировано ИИ",
    en: "AI-generated",
    kk: "ИИ жасаған",
  },
};
