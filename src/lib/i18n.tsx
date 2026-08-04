"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Lang, LocalizedText } from "@/data/types";

export const LANGS: { id: Lang; label: string }[] = [
  { id: "kk", label: "Қазақша" },
  { id: "ru", label: "Русский" },
  { id: "en", label: "English" },
];

type Dict = Record<string, { en: string; ru: string; kk: string }>;

const D: Dict = {
  "app.tagline": {
    en: "Everything you need for the SAT, in one place",
    ru: "Всё для подготовки к SAT в одном месте",
    kk: "SAT дайындығына керектің бәрі бір жерде",
  },
  "nav.home": { en: "Home", ru: "Главная", kk: "Басты бет" },
  "nav.practice": { en: "Practice", ru: "Практика", kk: "Жаттығу" },
  "nav.mock": { en: "Mock test", ru: "Пробный тест", kk: "Сынақ тест" },
  "nav.review": { en: "Review", ru: "Повторение", kk: "Қайталау" },
  "nav.progress": { en: "Progress", ru: "Прогресс", kk: "Үлгерім" },
  "nav.admin": { en: "Admin", ru: "Админ", kk: "Әкімші" },
  "nav.more": { en: "More", ru: "Ещё", kk: "Тағы" },
  /* Short labels for the mobile tab bar, where space is ~70px. */
  "nav.sHome": { en: "Home", ru: "Главная", kk: "Басты" },
  "nav.sPractice": { en: "Practice", ru: "Практика", kk: "Жаттығу" },
  "nav.sMock": { en: "Mock", ru: "Тест", kk: "Тест" },
  "nav.sReview": { en: "Review", ru: "Повтор", kk: "Қайталау" },
  "nav.tutorial": { en: "Tutorial", ru: "Обучение", kk: "Оқыту" },
  "nav.profile": { en: "Profile", ru: "Профиль", kk: "Профиль" },
  "nav.bank": { en: "Question Bank", ru: "Банк вопросов", kk: "Сұрақ банкі" },
  "nav.settings": { en: "Settings", ru: "Настройки", kk: "Параметрлер" },

  /* ---------------- sidebar groups ---------------- */
  "side.practice": { en: "Practice", ru: "Практика", kk: "Жаттығу" },
  "side.progress": { en: "Progress", ru: "Прогресс", kk: "Үлгерім" },
  "side.learn": { en: "Learn", ru: "Обучение", kk: "Оқу" },
  "side.manage": { en: "Manage", ru: "Управление", kk: "Басқару" },

  /* ---------------- dashboard: bank + analytics ---------------- */
  "bank.title": { en: "Question Bank", ru: "Банк вопросов", kk: "Сұрақ банкі" },
  "bank.solved": { en: "solved", ru: "решено", kk: "шешілді" },
  "bank.of": { en: "of", ru: "из", kk: "/" },
  "bank.open": { en: "Open", ru: "Открыть", kk: "Ашу" },
  "bank.allSubjects": { en: "All subjects", ru: "Все предметы", kk: "Барлық пән" },

  "an.title": { en: "Question Analytics", ru: "Аналитика вопросов", kk: "Сұрақ аналитикасы" },
  "an.viewAll": { en: "View all analytics", ru: "Вся аналитика", kk: "Барлық аналитика" },
  "an.attempted": { en: "Questions attempted", ru: "Отвечено вопросов", kk: "Жауап берілген сұрақ" },
  "an.accuracy": { en: "Current accuracy", ru: "Текущая точность", kk: "Ағымдағы дәлдік" },
  "an.queue": { en: "In review queue", ru: "В очереди повторения", kk: "Қайталау кезегінде" },
  "an.streak": { en: "Study streak", ru: "Серия дней", kk: "Оқу сериясы" },
  "an.trend": { en: "Activity trend", ru: "Динамика активности", kk: "Белсенділік динамикасы" },
  "an.openQueue": { en: "Open queue", ru: "Открыть очередь", kk: "Кезекті ашу" },
  "an.last14": { en: "last 14 days", ru: "последние 14 дней", kk: "соңғы 14 күн" },
  "an.noActivity": {
    en: "Nothing yet — your first session will show up here.",
    ru: "Пока пусто — первая сессия появится здесь.",
    kk: "Әзірге бос — алғашқы сессия осында шығады.",
  },

  /* ---------------- tutorial ---------------- */
  "tour.skip": { en: "Skip", ru: "Пропустить", kk: "Өткізу" },
  "tour.next": { en: "Next", ru: "Далее", kk: "Әрі қарай" },
  "tour.done": { en: "Got it", ru: "Понятно", kk: "Түсінікті" },
  "tour.step": { en: "Step", ru: "Шаг", kk: "Қадам" },
  "tour.t1": { en: "This is your home base", ru: "Это ваша главная", kk: "Бұл — басты бетіңіз" },
  "tour.d1": {
    en: "Your score against your target, your streak, and what to fix next — all in one place.",
    ru: "Ваш балл относительно цели, серия дней и что исправить дальше — всё в одном месте.",
    kk: "Мақсатқа қатысты балл, серия және келесі түзету — бір жерде.",
  },
  "tour.t2": { en: "Practise by subject", ru: "Практика по предметам", kk: "Пән бойынша жаттығу" },
  "tour.d2": {
    en: "Ten questions a session. We put the ones you got wrong first, and every answer comes with an explanation.",
    ru: "Десять вопросов за сессию. Сначала те, где вы ошиблись, и к каждому ответу — объяснение.",
    kk: "Сессияда он сұрақ. Алдымен қате жауаптар, әр жауапқа түсіндірме.",
  },
  "tour.t3": { en: "Sit a real mock", ru: "Пройдите настоящий пробник", kk: "Нақты сынақ тапсырыңыз" },
  "tour.d3": {
    en: "Official structure and timing: 98 questions in 2 h 14 min, across four adaptive modules.",
    ru: "Официальная структура и тайминг: 98 вопросов за 2 ч 14 мин в четырёх адаптивных модулях.",
    kk: "Ресми құрылым және хронометраж: төрт адаптивті модульде 2 сағ 14 минутта 98 сұрақ.",
  },
  "tour.t4": { en: "Stuck? Ask the tutor", ru: "Застряли? Спросите репетитора", kk: "Тұрып қалдыңыз ба? Тәлімгерден сұраңыз" },
  "tour.d4": {
    en: "The AI tutor explains any question step by step in your language — or gives just a hint if you'd rather work it out.",
    ru: "ИИ-репетитор объяснит любой вопрос пошагово на вашем языке — или даст лишь подсказку.",
    kk: "AI-тәлімгер кез келген сұрақты қадаммен түсіндіреді — немесе тек нұсқау береді.",
  },
  "tour.t5": { en: "Track what's improving", ru: "Следите за прогрессом", kk: "Үлгерімді қадағалаңыз" },
  "tour.d5": {
    en: "Accuracy per subject and topic, a review queue built from your mistakes, and your mock score trend.",
    ru: "Точность по предметам и темам, очередь повторения из ошибок и динамика баллов.",
    kk: "Пән мен тақырып бойынша дәлдік, қателерден жасалған кезек және балл динамикасы.",
  },
  "tour.replay": { en: "Replay the tour", ru: "Пройти тур снова", kk: "Турды қайта көру" },

  "tutorial.title": {
    en: "How 1Elevate works",
    ru: "Как работает 1Elevate",
    kk: "1Elevate қалай жұмыс істейді",
  },
  "tutorial.sub": {
    en: "Four minutes now saves you a lot of guessing later. Try the demo question at the bottom.",
    ru: "Четыре минуты сейчас избавят от догадок потом. Попробуйте демо-вопрос ниже.",
    kk: "Қазір төрт минут — кейін көп болжамнан құтқарады. Төмендегі демо-сұрақты көріңіз.",
  },
  "tutorial.demoTitle": { en: "Try it: a real practice question", ru: "Попробуйте: реальный вопрос практики", kk: "Көріңіз: нақты жаттығу сұрағы" },
  "tutorial.demoHint": {
    en: "Pick an answer, then check it. This is exactly what a practice session looks like.",
    ru: "Выберите ответ и проверьте. Именно так выглядит сессия практики.",
    kk: "Жауап таңдап, тексеріңіз. Жаттығу сессиясы дәл осылай көрінеді.",
  },
  "tutorial.startTour": { en: "Start the guided tour", ru: "Начать интерактивный тур", kk: "Интерактивті турды бастау" },
  "tutorial.formatTitle": { en: "The format we follow", ru: "Формат, которому мы следуем", kk: "Біз ұстанатын формат" },
  "tutorial.satFormat": {
    en: "SAT — 98 questions, 2 h 14 min. Reading & Writing (54) and Math (44), each in two modules, scored 400–1600.",
    ru: "SAT — 98 вопросов, 2 ч 14 мин. Reading & Writing (54) и Math (44), по два модуля, шкала 400–1600.",
    kk: "SAT — 98 сұрақ, 2 сағ 14 мин. Reading & Writing (54) және Math (44), әрқайсысы екі модуль, 400–1600 шкала.",
  },
  "tutorial.sourceNote": {
    en: "Questions are written by us to match the official blueprints — we don't reproduce copyrighted exam papers.",
    ru: "Вопросы написаны нами по официальным спецификациям — мы не воспроизводим защищённые авторским правом экзаменационные материалы.",
    kk: "Сұрақтар ресми сипаттамаларға сай өзіміз жазамыз — авторлық құқықпен қорғалған емтихан материалдарын көшірмейміз.",
  },

  "auth.signIn": { en: "Sign in", ru: "Войти", kk: "Кіру" },
  "auth.signOut": { en: "Sign out", ru: "Выйти", kk: "Шығу" },
  "auth.signUp": { en: "Create account", ru: "Создать аккаунт", kk: "Аккаунт құру" },
  "auth.name": { en: "Name", ru: "Имя", kk: "Аты" },
  "auth.pin": { en: "PIN (4+ characters)", ru: "PIN (4+ символов)", kk: "PIN (4+ таңба)" },
  "auth.haveAccount": { en: "I already have an account", ru: "У меня уже есть аккаунт", kk: "Менде аккаунт бар" },
  "auth.noAccount": { en: "I need an account", ru: "Мне нужен аккаунт", kk: "Маған аккаунт керек" },
  "auth.wrongPin": { en: "Wrong name or PIN.", ru: "Неверное имя или PIN.", kk: "Аты немесе PIN қате." },
  "auth.nameTaken": { en: "That name is already used.", ru: "Это имя уже занято.", kk: "Бұл ат бос емес." },
  "auth.pinShort": { en: "PIN must be at least 4 characters.", ru: "PIN должен содержать минимум 4 символа.", kk: "PIN кемінде 4 таңба болуы керек." },
  "auth.profilesHere": {
    en: "Profiles on this device",
    ru: "Профили на этом устройстве",
    kk: "Осы құрылғыдағы профильдер",
  },
  "auth.required": {
    en: "Sign in to track your progress.",
    ru: "Войдите, чтобы отслеживать прогресс.",
    kk: "Үлгерімді бақылау үшін кіріңіз.",
  },
  "auth.localNote": {
    en: "Accounts are stored in this browser only — this is a local build, not a secure server login.",
    ru: "Аккаунты хранятся только в этом браузере — это локальная сборка, а не защищённый вход на сервере.",
    kk: "Аккаунттар осы браузерде ғана сақталады — бұл жергілікті нұсқа, қауіпсіз сервер логині емес.",
  },
  "auth.firstAdmin": {
    en: "The first account created becomes the admin.",
    ru: "Первый созданный аккаунт становится админом.",
    kk: "Бірінші құрылған аккаунт әкімші болады.",
  },

  /* ---------------- landing ---------------- */
  "landing.badge": {
    en: "Built in Kazakhstan · by Mentoria Organization",
    ru: "Сделано в Казахстане · Mentoria Organization",
    kk: "Қазақстанда жасалған · Mentoria Organization",
  },
  "landing.titleA": { en: "Prep smarter for", ru: "Готовься умнее к", kk: "Ақылды дайындал:" },
  "landing.titleB": { en: "the SAT", ru: "SAT", kk: "SAT-қа" },
  "landing.sub": {
    en: "A trilingual question bank, timed mock exams that mirror the real format, analytics that find your weak topics — and an AI tutor that explains any task the moment you get stuck.",
    ru: "Трёхъязычный банк вопросов, пробные экзамены с реальным таймингом, аналитика слабых тем — и ИИ-репетитор, который объяснит любое задание, как только вы застряли.",
    kk: "Үш тілдегі сұрақ банкі, нақты форматтағы сынақ емтихандары, әлсіз тақырыптар аналитикасы — және кез келген тапсырманы түсіндіретін AI-тәлімгер.",
  },
  "landing.start": { en: "Start free", ru: "Начать бесплатно", kk: "Тегін бастау" },
  "landing.haveAccount": { en: "I have an account", ru: "У меня есть аккаунт", kk: "Аккаунтым бар" },
  "landing.noCard": {
    en: "No card, no email confirmation — 30 seconds and you're in.",
    ru: "Без карты и подтверждения почты — 30 секунд и вы внутри.",
    kk: "Картасыз, поштаны растаусыз — 30 секунд.",
  },
  "landing.markCaption": {
    en: "Tap the mark — 1600 is the perfect SAT score.",
    ru: "Нажмите на логотип — 1600 это максимальный балл SAT.",
    kk: "Логотипті басыңыз — 1600 SAT-тың ең жоғары балы.",
  },
  "landing.statQuestions": { en: "questions", ru: "вопросов", kk: "сұрақ" },
  "landing.statSubjects": { en: "subjects", ru: "предметов", kk: "пән" },
  "landing.statLangs": { en: "languages", ru: "языка", kk: "тіл" },
  "landing.statPrice": { en: "tenge to start", ru: "тенге на старт", kk: "теңге бастауға" },

  "landing.featuresEyebrow": { en: "Everything in one place", ru: "Всё в одном месте", kk: "Барлығы бір жерде" },
  "landing.featuresTitle": {
    en: "Four things that actually move your score",
    ru: "Четыре вещи, которые реально поднимают балл",
    kk: "Балды шынымен көтеретін төрт нәрсе",
  },
  "landing.f1Title": { en: "Adaptive question bank", ru: "Адаптивный банк вопросов", kk: "Адаптивті сұрақ банкі" },
  "landing.f1Text": {
    en: "Every session pulls the questions you missed and the ones you've never seen first. Full explanations on every answer.",
    ru: "Каждая сессия сначала берёт вопросы с ошибками и те, что вы ещё не видели. Подробное объяснение к каждому ответу.",
    kk: "Әр сессия алдымен қате жауап берген және көрмеген сұрақтарды алады. Әр жауапқа толық түсіндірме.",
  },
  "landing.f2Title": { en: "Timed mock exams", ru: "Пробные экзамены с таймером", kk: "Хронометражды сынақ емтихандар" },
  "landing.f2Text": {
    en: "Real SAT structure, module timers that auto-submit, and a 400–1600 score report.",
    ru: "Настоящая структура SAT, таймеры модулей с авто-сдачей и отчёт по шкале 400–1600.",
    kk: "Нақты SAT құрылымы, авто-тапсыратын модуль таймерлері және 400–1600 шкаласы бойынша есеп.",
  },
  "landing.f3Title": { en: "AI tutor on every task", ru: "ИИ-репетитор в каждом задании", kk: "Әр тапсырмада AI-тәлімгер" },
  "landing.f3Text": {
    en: "Stuck? It explains the step you're missing in your language, gives hints instead of answers, and takes follow-up questions.",
    ru: "Застряли? Он объяснит пропущенный шаг на вашем языке, даст подсказку вместо ответа и ответит на уточнения.",
    kk: "Тұрып қалдыңыз ба? Ол өз тіліңізде жетпеген қадамды түсіндіреді, жауап орнына нұсқау береді.",
  },
  "landing.f4Title": { en: "Analytics that name the gap", ru: "Аналитика, которая называет пробел", kk: "Бос орынды атайтын аналитика" },
  "landing.f4Text": {
    en: "Accuracy per subject and per topic, a review queue built from your mistakes, streaks and a score trend.",
    ru: "Точность по предметам и темам, очередь повторения из ваших ошибок, серии дней и динамика баллов.",
    kk: "Пән және тақырып бойынша дәлдік, қателерден жасалған қайталау кезегі, серия және балл динамикасы.",
  },

  "landing.howEyebrow": { en: "How it works", ru: "Как это работает", kk: "Қалай жұмыс істейді" },
  "landing.howTitle": { en: "Three steps to your first mock score", ru: "Три шага до первого балла", kk: "Алғашқы балға үш қадам" },
  "landing.s1Title": { en: "Create your profile", ru: "Создайте профиль", kk: "Профиль жасаңыз" },
  "landing.s1Text": {
    en: "Name, email and the score you're aiming for. Takes half a minute.",
    ru: "Имя, почта и балл, к которому вы идёте. Полминуты.",
    kk: "Аты, пошта және мақсатты балл. Жарты минут.",
  },
  "landing.s2Title": { en: "Practise with the tutor", ru: "Практикуйтесь с репетитором", kk: "Тәлімгермен жаттығыңыз" },
  "landing.s2Text": {
    en: "Ten questions per session, instant feedback, and an explanation whenever you want one.",
    ru: "Десять вопросов за сессию, мгновенная проверка и объяснение по первому запросу.",
    kk: "Сессияда он сұрақ, лезде тексеру және сұраған кезде түсіндірме.",
  },
  "landing.s3Title": { en: "Sit a full mock", ru: "Пройдите полный пробник", kk: "Толық сынақ тапсырыңыз" },
  "landing.s3Text": {
    en: "Same timing as the real thing, then a score report that shows exactly which section cost you points.",
    ru: "Тайминг как на реальном экзамене, затем отчёт: какой раздел стоил вам баллов.",
    kk: "Нақты емтихандай хронометраж, содан кейін қай бөлім балл жоғалтқанын көрсететін есеп.",
  },

  "landing.subjectsTitle": { en: "Subjects covered", ru: "Охваченные предметы", kk: "Қамтылған пәндер" },
  "landing.ctaTitle": {
    en: "1600 is closer than it looks",
    ru: "1600 ближе, чем кажется",
    kk: "1600 ойлағаннан жақын",
  },
  "landing.ctaText": {
    en: "Start with one practice session today. The analytics will tell you what to fix tomorrow.",
    ru: "Начните с одной сессии сегодня. Аналитика подскажет, что исправить завтра.",
    kk: "Бүгін бір сессиядан бастаңыз. Аналитика ертең не түзетуді айтады.",
  },

  /* ---------------- signup wizard ---------------- */
  "signup.title": { en: "Create your profile", ru: "Создание профиля", kk: "Профиль жасау" },
  "signup.step": { en: "Step", ru: "Шаг", kk: "Қадам" },
  "signup.of": { en: "of", ru: "из", kk: "/" },
  "signup.s1": { en: "About you", ru: "О вас", kk: "Сіз туралы" },
  "signup.s2": { en: "Your goal", ru: "Ваша цель", kk: "Мақсатыңыз" },
  "signup.s3": { en: "Security", ru: "Безопасность", kk: "Қауіпсіздік" },
  "signup.email": { en: "Email", ru: "Эл. почта", kk: "Электрондық пошта" },
  "signup.grade": { en: "Grade / year", ru: "Класс / курс", kk: "Сынып / курс" },
  "signup.targetScore": { en: "Target score", ru: "Целевой балл", kk: "Мақсатты балл" },
  "signup.scoreHint": {
    en: "You can change this any time in your profile.",
    ru: "Это можно изменить в профиле в любой момент.",
    kk: "Мұны профильде кез келген уақытта өзгертуге болады.",
  },
  "signup.confirmPin": { en: "Repeat PIN", ru: "Повторите PIN", kk: "PIN-ді қайталаңыз" },
  "signup.graduate": { en: "Graduate", ru: "Выпускник", kk: "Түлек" },
  "signup.next": { en: "Continue", ru: "Далее", kk: "Әрі қарай" },
  "signup.back": { en: "Back", ru: "Назад", kk: "Артқа" },
  "signup.finish": { en: "Create profile", ru: "Создать профиль", kk: "Профиль жасау" },
  "signup.errName": { en: "Enter a name of at least 2 characters.", ru: "Введите имя от 2 символов.", kk: "Кемінде 2 таңбалы ат енгізіңіз." },
  "signup.errEmail": { en: "Enter a valid email address.", ru: "Введите корректный email.", kk: "Жарамды email енгізіңіз." },
  "signup.errPinMatch": { en: "The PINs don't match.", ru: "PIN-коды не совпадают.", kk: "PIN-кодтар сәйкес емес." },
  "signup.strength": { en: "PIN strength", ru: "Надёжность PIN", kk: "PIN сенімділігі" },
  "signup.weak": { en: "weak", ru: "слабый", kk: "әлсіз" },
  "signup.ok": { en: "ok", ru: "нормальный", kk: "жақсы" },
  "signup.strong": { en: "strong", ru: "надёжный", kk: "сенімді" },
  "signup.welcome": {
    en: "Welcome to 1Elevate!",
    ru: "Добро пожаловать в 1Elevate!",
    kk: "1Elevate-ке қош келдіңіз!",
  },
  "signup.localNotice": {
    en: "This profile is stored in this browser only — it is not a cloud account, so anyone using this device can open it.",
    ru: "Профиль хранится только в этом браузере — это не облачный аккаунт, любой пользователь устройства сможет его открыть.",
    kk: "Профиль осы браузерде ғана сақталады — бұл бұлттық аккаунт емес, құрылғыны пайдаланған кез келген адам аша алады.",
  },
  "home.greeting": { en: "Welcome back", ru: "С возвращением", kk: "Қайта келдіңіз" },
  "home.targetScore": { en: "Target score", ru: "Целевой балл", kk: "Мақсатты балл" },
  "home.toGoal": { en: "to your goal", ru: "до цели", kk: "мақсатқа дейін" },
  "home.quickActions": { en: "Jump back in", ru: "Продолжить", kk: "Жалғастыру" },
  "dash.practiceHint": {
    en: "10 questions, instant feedback",
    ru: "10 вопросов, мгновенная проверка",
    kk: "10 сұрақ, лезде тексеру",
  },
  "dash.mockHint": {
    en: "Official structure and timing",
    ru: "Официальная структура и тайминг",
    kk: "Ресми құрылым және хронометраж",
  },
  "dash.reviewHint": {
    en: "Everything you got wrong",
    ru: "Всё, где вы ошиблись",
    kk: "Қате жауап бергендердің бәрі",
  },
  "dash.progressHint": {
    en: "Accuracy by subject and topic",
    ru: "Точность по предметам и темам",
    kk: "Пән және тақырып бойынша дәлдік",
  },
  "home.continue": { en: "Continue practising", ru: "Продолжить практику", kk: "Жаттығуды жалғастыру" },
  "home.startMock": { en: "Take a mock test", ru: "Пройти пробный тест", kk: "Сынақ тест тапсыру" },
  "home.weakest": { en: "Weakest topics", ru: "Слабые темы", kk: "Әлсіз тақырыптар" },
  "home.noWeak": {
    en: "Answer some questions and your weak topics will show up here.",
    ru: "Ответьте на вопросы — и слабые темы появятся здесь.",
    kk: "Сұрақтарға жауап берсеңіз, әлсіз тақырыптар осында шығады.",
  },

  "practice.title": { en: "Practice by subject", ru: "Практика по предметам", kk: "Пән бойынша жаттығу" },
  "practice.pickSubject": { en: "Pick a subject to start.", ru: "Выберите предмет, чтобы начать.", kk: "Бастау үшін пән таңдаңыз." },
  "practice.questions": { en: "questions", ru: "вопросов", kk: "сұрақ" },
  "practice.accuracy": { en: "accuracy", ru: "точность", kk: "дәлдік" },
  "practice.start": { en: "Start", ru: "Начать", kk: "Бастау" },
  "practice.empty": {
    en: "No questions in this subject yet. Add some in the admin editor.",
    ru: "В этом предмете пока нет вопросов. Добавьте их в редакторе админа.",
    kk: "Бұл пәнде әзірге сұрақ жоқ. Әкімші редакторында қосыңыз.",
  },

  "quiz.question": { en: "Question", ru: "Вопрос", kk: "Сұрақ" },
  "quiz.of": { en: "of", ru: "из", kk: "/" },
  "quiz.check": { en: "Check answer", ru: "Проверить", kk: "Тексеру" },
  "quiz.next": { en: "Next", ru: "Далее", kk: "Келесі" },
  "quiz.finish": { en: "Finish", ru: "Завершить", kk: "Аяқтау" },
  "quiz.correct": { en: "Correct", ru: "Верно", kk: "Дұрыс" },
  "quiz.incorrect": { en: "Incorrect", ru: "Неверно", kk: "Қате" },
  "quiz.explanation": { en: "Explanation", ru: "Объяснение", kk: "Түсіндірме" },
  "quiz.exit": { en: "Exit", ru: "Выйти", kk: "Шығу" },
  "quiz.result": { en: "Result", ru: "Результат", kk: "Нәтиже" },
  "quiz.again": { en: "Practise again", ru: "Ещё раз", kk: "Қайта жаттығу" },
  "quiz.difficulty": { en: "Difficulty", ru: "Сложность", kk: "Күрделілік" },
  "diff.1": { en: "Easy", ru: "Легко", kk: "Жеңіл" },
  "diff.2": { en: "Medium", ru: "Средне", kk: "Орташа" },
  "diff.3": { en: "Hard", ru: "Сложно", kk: "Қиын" },
  "diff.all": { en: "All levels", ru: "Все уровни", kk: "Барлық деңгей" },
  "diff.byLevel": { en: "By difficulty", ru: "По сложности", kk: "Күрделілік бойынша" },
  "diff.noneAtLevel": {
    en: "No questions at this level yet — pick another.",
    ru: "На этом уровне пока нет вопросов — выберите другой.",
    kk: "Бұл деңгейде әзірге сұрақ жоқ — басқасын таңдаңыз.",
  },
  "quiz.answered": { en: "answered", ru: "отвечено", kk: "жауап берілді" },

  "mock.title": { en: "Full timed mock test", ru: "Полный пробный тест с таймером", kk: "Толық хронометражды сынақ тест" },
  "mock.structure": { en: "Structure", ru: "Структура", kk: "Құрылымы" },
  "mock.begin": { en: "Begin test", ru: "Начать тест", kk: "Тестті бастау" },
  "mock.section": { en: "Section", ru: "Раздел", kk: "Бөлім" },
  "mock.module": { en: "Module", ru: "Модуль", kk: "Модуль" },
  "mock.timeLeft": { en: "Time left", ru: "Осталось", kk: "Қалды" },
  "mock.submitSection": { en: "Submit section", ru: "Сдать раздел", kk: "Бөлімді тапсыру" },
  "mock.timeUp": { en: "Time is up — moving on.", ru: "Время вышло — переходим далее.", kk: "Уақыт бітті — әрі қарай." },
  "mock.scoreReport": { en: "Score report", ru: "Отчёт о результате", kk: "Нәтиже есебі" },
  "mock.estimated": { en: "Estimated score", ru: "Оценочный балл", kk: "Болжамды балл" },
  "mock.perSection": { en: "By section", ru: "По разделам", kk: "Бөлімдер бойынша" },
  "mock.reviewMistakes": { en: "Review mistakes", ru: "Разобрать ошибки", kk: "Қателерді талдау" },
  "mock.notEnough": {
    en: "Not enough questions in the bank for a full test — the sections below were shortened.",
    ru: "В банке недостаточно вопросов для полного теста — разделы ниже сокращены.",
    kk: "Толық тестке сұрақ жетпейді — төмендегі бөлімдер қысқартылды.",
  },
  "mock.history": { en: "Past mock tests", ru: "Прошлые пробные тесты", kk: "Өткен сынақ тестер" },
  "mock.noHistory": { en: "No mock tests yet.", ru: "Пробных тестов ещё нет.", kk: "Әзірге сынақ тест жоқ." },

  "review.title": { en: "Review queue", ru: "Очередь повторения", kk: "Қайталау кезегі" },
  "review.desc": {
    en: "Questions you got wrong, hardest first. Answer one correctly twice in a row and it leaves the queue.",
    ru: "Вопросы с ошибками, сложные первыми. Ответьте верно два раза подряд — и вопрос покинет очередь.",
    kk: "Қате жауап берген сұрақтар, ең қиыны алдында. Екі рет қатарынан дұрыс жауап берсеңіз, кезектен шығады.",
  },
  "review.empty": {
    en: "Nothing to review. Well done.",
    ru: "Повторять нечего. Отлично.",
    kk: "Қайталайтын нәрсе жоқ. Тамаша.",
  },
  "review.start": { en: "Start review", ru: "Начать повторение", kk: "Қайталауды бастау" },

  "progress.title": { en: "Your progress", ru: "Ваш прогресс", kk: "Сіздің үлгеріміңіз" },
  "progress.totalAnswered": { en: "Questions answered", ru: "Отвечено вопросов", kk: "Жауап берілген сұрақ" },
  "progress.overallAccuracy": { en: "Overall accuracy", ru: "Общая точность", kk: "Жалпы дәлдік" },
  "progress.streak": { en: "Day streak", ru: "Дней подряд", kk: "Қатарынан күн" },
  "progress.mocksTaken": { en: "Mock tests taken", ru: "Пройдено тестов", kk: "Тапсырылған тест" },
  "progress.bySubject": { en: "By subject", ru: "По предметам", kk: "Пәндер бойынша" },
  "progress.byTopic": { en: "By topic", ru: "По темам", kk: "Тақырыптар бойынша" },
  "progress.scoreTrend": { en: "Mock score trend", ru: "Динамика баллов", kk: "Балл динамикасы" },
  "progress.last14": { en: "Activity, last 14 days", ru: "Активность за 14 дней", kk: "Соңғы 14 күндегі белсенділік" },
  "progress.noData": {
    en: "No data yet — answer a few questions first.",
    ru: "Данных пока нет — ответьте на несколько вопросов.",
    kk: "Әзірге дерек жоқ — бірнеше сұраққа жауап беріңіз.",
  },
  "progress.needMoreMocks": {
    en: "Take at least two mock tests to see a trend.",
    ru: "Пройдите минимум два теста, чтобы увидеть динамику.",
    kk: "Динамиканы көру үшін кемінде екі тест тапсырыңыз.",
  },

  "admin.title": { en: "Content editor", ru: "Редактор контента", kk: "Мазмұн редакторы" },
  "admin.onlyAdmin": {
    en: "Only the admin account can open this page.",
    ru: "Эта страница доступна только админу.",
    kk: "Бұл бетті тек әкімші аша алады.",
  },
  "admin.newQuestion": { en: "New question", ru: "Новый вопрос", kk: "Жаңа сұрақ" },
  "admin.editQuestion": { en: "Edit question", ru: "Редактировать вопрос", kk: "Сұрақты өңдеу" },
  "admin.exam": { en: "Exam", ru: "Экзамен", kk: "Емтихан" },
  "admin.subject": { en: "Subject", ru: "Предмет", kk: "Пән" },
  "admin.topic": { en: "Topic", ru: "Тема", kk: "Тақырып" },
  "admin.passage": { en: "Passage (optional)", ru: "Текст (необязательно)", kk: "Мәтін (қажет болса)" },
  "admin.prompt": { en: "Question", ru: "Вопрос", kk: "Сұрақ" },
  "admin.choices": { en: "Answer choices", ru: "Варианты ответа", kk: "Жауап нұсқалары" },
  "admin.markCorrect": { en: "Mark the correct choice", ru: "Отметьте верный вариант", kk: "Дұрыс нұсқаны белгілеңіз" },
  "admin.explanationLabel": { en: "Explanation", ru: "Объяснение", kk: "Түсіндірме" },
  "admin.save": { en: "Save question", ru: "Сохранить вопрос", kk: "Сұрақты сақтау" },
  "admin.cancel": { en: "Cancel", ru: "Отмена", kk: "Болдырмау" },
  "admin.delete": { en: "Delete", ru: "Удалить", kk: "Жою" },
  "admin.edit": { en: "Edit", ru: "Изменить", kk: "Өңдеу" },
  "admin.yourQuestions": { en: "Questions you added", ru: "Добавленные вами вопросы", kk: "Сіз қосқан сұрақтар" },
  "admin.builtIn": { en: "built-in", ru: "встроенные", kk: "ішкі" },
  "admin.custom": { en: "custom", ru: "свои", kk: "өзіңіздің" },
  "admin.needEn": {
    en: "English text is required (it is the fallback for missing translations).",
    ru: "Английский текст обязателен (он используется как запасной вариант).",
    kk: "Ағылшын мәтіні міндетті (аудармасы жоқта қолданылады).",
  },
  "admin.needTwoChoices": {
    en: "At least two answer choices are required.",
    ru: "Нужно минимум два варианта ответа.",
    kk: "Кемінде екі жауап нұсқасы қажет.",
  },
  "admin.saved": { en: "Saved.", ru: "Сохранено.", kk: "Сақталды." },
  "admin.export": { en: "Export JSON", ru: "Экспорт JSON", kk: "JSON экспорт" },
  "admin.import": { en: "Import JSON", ru: "Импорт JSON", kk: "JSON импорт" },
  "admin.importBad": { en: "That file could not be read as a question bank.", ru: "Не удалось прочитать файл как банк вопросов.", kk: "Файлды сұрақ банкі ретінде оқу мүмкін болмады." },
  "admin.importOk": { en: "Imported", ru: "Импортировано", kk: "Импортталды" },

  "tutor.name": { en: "Ai-tutor", ru: "ИИ-репетитор", kk: "AI-тәлімгер" },
  "tutor.open": {
    en: "I don't understand — explain it",
    ru: "Не понимаю — объясни",
    kk: "Түсінбедім — түсіндір",
  },
  "tutor.greeting": {
    en: "Stuck on this one? Pick a question below or type your own.",
    ru: "Застряли на этом вопросе? Выберите вариант ниже или напишите свой.",
    kk: "Осы сұрақта тұрып қалдыңыз ба? Төменнен таңдаңыз немесе өз сұрағыңызды жазыңыз.",
  },
  "tutor.explain": { en: "Explain this task", ru: "Объясни это задание", kk: "Осы тапсырманы түсіндір" },
  "tutor.hint": { en: "Just a hint", ru: "Только подсказку", kk: "Тек нұсқау бер" },
  "tutor.whyWrong": {
    en: "Why is my answer wrong?",
    ru: "Почему мой ответ неверный?",
    kk: "Менің жауабым неге қате?",
  },
  "tutor.simpler": {
    en: "Show a simpler example",
    ru: "Покажи пример попроще",
    kk: "Қарапайым мысал көрсет",
  },
  "tutor.placeholder": {
    en: "Ask the tutor…",
    ru: "Спросите репетитора…",
    kk: "Тәлімгерден сұраңыз…",
  },
  "tutor.send": { en: "Send", ru: "Отправить", kk: "Жіберу" },
  "tutor.thinking": { en: "Thinking…", ru: "Думаю…", kk: "Ойланып жатырмын…" },
  "tutor.close": { en: "Close", ru: "Закрыть", kk: "Жабу" },
  "tutor.noKey": {
    en: "The tutor needs an Anthropic API key. Add ANTHROPIC_API_KEY to .env.local and restart the dev server.",
    ru: "Репетитору нужен ключ Anthropic API. Добавьте ANTHROPIC_API_KEY в .env.local и перезапустите сервер.",
    kk: "Тәлімгерге Anthropic API кілті қажет. .env.local файлына ANTHROPIC_API_KEY қосып, серверді қайта іске қосыңыз.",
  },

  "common.subjects": { en: "Subjects", ru: "Предметы", kk: "Пәндер" },
  "common.minutes": { en: "min", ru: "мин", kk: "мин" },
  "common.total": { en: "Total", ru: "Всего", kk: "Барлығы" },
  "common.back": { en: "Back", ru: "Назад", kk: "Артқа" },
  "common.reset": { en: "Reset all local data", ru: "Сбросить все локальные данные", kk: "Барлық жергілікті деректі тазалау" },
  "common.resetConfirm": {
    en: "Delete all accounts, progress and custom questions from this browser?",
    ru: "Удалить все аккаунты, прогресс и свои вопросы из этого браузера?",
    kk: "Осы браузердегі барлық аккаунт, үлгерім және өз сұрақтарыңызды жою керек пе?",
  },
  "common.language": { en: "Language", ru: "Язык", kk: "Тіл" },
  "common.footer": {
    en: "Local build — everything is stored in this browser.",
    ru: "Локальная сборка — все данные хранятся в этом браузере.",
    kk: "Жергілікті нұсқа — барлық дерек осы браузерде сақталады.",
  },
};

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** UI string by key. */
  t: (key: string) => string;
  /** Content text with fallback to English. */
  tx: (text: LocalizedText | undefined) => string;
};

const I18nContext = createContext<Ctx | null>(null);
const LANG_KEY = "elevate.lang";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // localStorage and navigator.language only exist on the client, so the stored
  // language has to be adopted after mount — rendering it directly would break
  // hydration. setState here is deliberate.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const stored = window.localStorage.getItem(LANG_KEY) as Lang | null;
    if (stored && LANGS.some((l) => l.id === stored)) {
      setLangState(stored);
      return;
    }
    const nav = window.navigator.language.slice(0, 2);
    setLangState(nav === "kk" ? "kk" : nav === "ru" ? "ru" : "en");
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem(LANG_KEY, l);
  }, []);

  const t = useCallback((key: string) => D[key]?.[lang] ?? D[key]?.en ?? key, [lang]);
  const tx = useCallback(
    (text: LocalizedText | undefined) => (text ? text[lang] || text.en : ""),
    [lang],
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t, tx }}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
