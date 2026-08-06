/** Question bank, question player and AI tutor copy. */

import type { CopyDict } from "./index";

export const STUDY_COPY: CopyDict = {
  /* ---------------- question bank ---------------- */
  "study.bankTitle": { ru: "Банк вопросов", en: "Question bank", kk: "Сұрақ банкі" },
  "study.bankSub": {
    ru: "Выберите раздел и уровень — сессия соберётся из 10 вопросов, начиная с тех, где вы ошибались.",
    en: "Pick a section and a level — a session is 10 questions, starting with the ones you got wrong.",
    kk: "Бөлім мен деңгейді таңдаңыз — сессия 10 сұрақтан жиналады, қате жауаптардан бастап.",
  },
  "study.filterSection": { ru: "Раздел", en: "Section", kk: "Бөлім" },
  "study.filterStatus": { ru: "Статус", en: "Status", kk: "Күй" },
  "study.allSections": { ru: "Все разделы", en: "All sections", kk: "Барлық бөлім" },
  "study.statusAll": { ru: "Все", en: "All", kk: "Барлығы" },
  "study.statusNew": { ru: "Не решённые", en: "Unseen", kk: "Шешілмеген" },
  "study.statusWrong": { ru: "С ошибками", en: "Answered wrong", kk: "Қате жауаптар" },
  "study.statusDone": { ru: "Решённые", en: "Solved", kk: "Шешілген" },
  "study.mixTitle": { ru: "Распределение по сложности", en: "Difficulty mix", kk: "Күрделілік бөлінісі" },
  "study.solvedOf": { ru: "решено", en: "solved", kk: "шешілді" },
  "study.accuracy": { ru: "точность", en: "accuracy", kk: "дәлдік" },
  "study.startSession": { ru: "Начать сессию", en: "Start a session", kk: "Сессияны бастау" },
  "study.resumeSession": { ru: "Продолжить", en: "Resume", kk: "Жалғастыру" },
  "study.noMatch": {
    ru: "Под эти фильтры вопросов нет. Снимите один из них.",
    en: "No questions match these filters. Clear one of them.",
    kk: "Бұл сүзгілерге сай сұрақ жоқ. Біреуін алып тастаңыз.",
  },
  "study.inReview": { ru: "в повторении", en: "in review", kk: "қайталауда" },

  /* ---------------- question player ---------------- */
  "study.passage": { ru: "Текст", en: "Passage", kk: "Мәтін" },
  "study.chooseAnswer": {
    ru: "Выберите один вариант",
    en: "Choose one answer",
    kk: "Бір нұсқаны таңдаңыз",
  },
  /* Surfaced as a hint under the choices, so the shortcut is discoverable
     rather than folklore. */
  "study.keyHint": {
    ru: "Клавиши 1–4 выбирают ответ, Enter проверяет",
    en: "Keys 1–4 pick an answer, Enter checks it",
    kk: "1–4 пернелері жауап таңдайды, Enter тексереді",
  },

  /* ---------------- tutor ----------------
     The assistant has a name so a student can refer to it. Deliberately not
     localised: it is a proper noun. */
  "study.tutorName": { ru: "Elevate", en: "Elevate", kk: "Elevate" },
  "study.tutorRole": { ru: "ИИ-помощник", en: "AI assistant", kk: "AI-көмекші" },
  "study.tutorOpen": { ru: "Спросить Elevate", en: "Ask Elevate", kk: "Elevate-тен сұрау" },
  "study.tutorGreeting": {
    ru: "Разберём это задание вместе. Выберите вопрос ниже или напишите свой.",
    en: "Let's work through this task. Pick a question below or type your own.",
    kk: "Осы тапсырманы бірге талдайық. Төменнен таңдаңыз немесе өз сұрағыңызды жазыңыз.",
  },
  "study.tutorThinking": { ru: "Думает…", en: "Thinking…", kk: "Ойлануда…" },
  "study.tutorWriting": { ru: "Печатает…", en: "Writing…", kk: "Жазуда…" },
  "study.tutorSkip": { ru: "Показать сразу", en: "Show it all", kk: "Толық көрсету" },
  "study.tutorCopy": { ru: "Скопировать", en: "Copy", kk: "Көшіру" },
  "study.tutorCopied": { ru: "Скопировано", en: "Copied", kk: "Көшірілді" },
  "study.tutorRetry": { ru: "Повторить", en: "Retry", kk: "Қайталау" },
  "study.tutorStop": { ru: "Остановить", en: "Stop", kk: "Тоқтату" },
  /* Deliberately not "an error occurred": a student can act on this one. */
  "study.tutorFailed": {
    ru: "Не удалось получить ответ. Проверьте соединение и попробуйте ещё раз.",
    en: "Could not get an answer. Check your connection and try again.",
    kk: "Жауап алынбады. Байланысты тексеріп, қайталап көріңіз.",
  },
  "study.tutorNoKey": {
    ru: "Помощник пока недоступен: на сервере не настроен ключ доступа. Остальные функции работают как обычно.",
    en: "The assistant is unavailable: the server has no access key configured. Everything else works as usual.",
    kk: "Көмекші әзірге қолжетімсіз: серверде кілт бапталмаған. Қалған мүмкіндіктер әдеттегідей жұмыс істейді.",
  },
};
