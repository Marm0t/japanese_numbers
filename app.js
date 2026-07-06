const DIGITS = {
  1: { kanji: "一", kana: "いち", romaji: "ichi" },
  2: { kanji: "二", kana: "に", romaji: "ni" },
  3: { kanji: "三", kana: "さん", romaji: "san" },
  4: { kanji: "四", kana: "よん", romaji: "yon", alternates: ["し", "shi"] },
  5: { kanji: "五", kana: "ご", romaji: "go" },
  6: { kanji: "六", kana: "ろく", romaji: "roku" },
  7: { kanji: "七", kana: "なな", romaji: "nana", alternates: ["しち", "shichi"] },
  8: { kanji: "八", kana: "はち", romaji: "hachi" },
  9: { kanji: "九", kana: "きゅう", romaji: "kyuu", alternates: ["きゅー", "kyu", "く", "ku"] }
};

const HUNDREDS = {
  1: ["百", "ひゃく", "hyaku"], 2: ["二百", "にひゃく", "nihyaku"],
  3: ["三百", "さんびゃく", "sanbyaku"], 4: ["四百", "よんひゃく", "yonhyaku"],
  5: ["五百", "ごひゃく", "gohyaku"], 6: ["六百", "ろっぴゃく", "roppyaku"],
  7: ["七百", "ななひゃく", "nanahyaku"], 8: ["八百", "はっぴゃく", "happyaku"],
  9: ["九百", "きゅうひゃく", "kyuuhyaku"]
};

const THOUSANDS = {
  1: ["千", "せん", "sen"], 2: ["二千", "にせん", "nisen"],
  3: ["三千", "さんぜん", "sanzen"], 4: ["四千", "よんせん", "yonsen"],
  5: ["五千", "ごせん", "gosen"], 6: ["六千", "ろくせん", "rokusen"],
  7: ["七千", "ななせん", "nanasen"], 8: ["八千", "はっせん", "hassen"],
  9: ["九千", "きゅうせん", "kyuusen"]
};

function underTenThousand(value) {
  const parts = underTenThousandParts(value);
  return [0, 1, 2].map((column) => parts.map((part) => part[column]).join(""));
}

function underTenThousandParts(value) {
  const parts = [];
  const thousands = Math.floor(value / 1000);
  const hundreds = Math.floor(value % 1000 / 100);
  const tens = Math.floor(value % 100 / 10);
  const ones = value % 10;
  if (thousands) parts.push(THOUSANDS[thousands]);
  if (hundreds) parts.push(HUNDREDS[hundreds]);
  if (tens) parts.push([`${tens === 1 ? "" : DIGITS[tens].kanji}十`, `${tens === 1 ? "" : DIGITS[tens].kana}じゅう`, `${tens === 1 ? "" : DIGITS[tens].romaji}juu`]);
  if (ones) parts.push([DIGITS[ones].kanji, DIGITS[ones].kana, DIGITS[ones].romaji]);
  return parts;
}

function makeNumber(value) {
  if (value === 0) return { value: 0, kanji: "零", kana: "れい", kanaParts: ["れい"], romaji: "rei", answers: ["れい", "rei", "ゼロ", "zero"] };
  const man = Math.floor(value / 10000);
  const remainder = value % 10000;
  const high = man ? underTenThousand(man) : ["", "", ""];
  const low = remainder ? underTenThousand(remainder) : ["", "", ""];
  const kanji = `${high[0]}${man ? "万" : ""}${low[0]}`;
  const kana = `${high[1]}${man ? "まん" : ""}${low[1]}`;
  const romaji = `${high[2]}${man ? "man" : ""}${low[2]}`;
  const kanaParts = [];
  if (man) {
    kanaParts.push(...underTenThousandParts(man).map((part) => part[1]), "まん");
  }
  if (remainder) kanaParts.push(...underTenThousandParts(remainder).map((part) => part[1]));
  const answers = [kana, romaji];
  if (value < 10) answers.push(...(DIGITS[value].alternates || []));
  return { value, kanji, kana, kanaParts, romaji, answers };
}

const ALLOWED_RANGES = [10, 100, 1000, 1000000];
const EXAM_LENGTH = 10;
const RECENT_COOLDOWN = 7;
const STORAGE_KEY = "kazu:v1";
const FONT_STYLE_VERSION_KEY = "kazu:font-style:v2";
const EMPTY_STATE = {
  name: "", mode: "learning", selectedRange: null, total: 0, correct: 0, currentStreak: 0, bestStreak: 0,
  questionDirection: "number-to-text", showSpaces: false, writingFont: "handwritten",
  totalResponseMs: 0, timedAnswers: 0, daily: {}, perNumber: {}, exams: []
};

const qs = (selector) => document.querySelector(selector);
const elements = {
  form: qs("#answerForm"), input: qs("#answerInput"), button: qs("#checkButton"), feedback: qs("#feedback"),
  showAnswer: qs("#showAnswer"), number: qs("#questionNumber"), kanji: qs("#kanjiHint"), round: qs("#roundCount"),
  timer: qs("#questionTimer"), modeLabel: qs("#modeLabel"), learningMode: qs("#learningMode"), examMode: qs("#examMode"),
  practiceContent: qs("#practiceContent"), examResult: qs("#examResult"), examScore: qs("#examScore"),
  examSummary: qs("#examSummary"), restartExam: qs("#restartExam"), returnLearning: qs("#returnLearning"),
  correct: qs("#correctStat"), accuracy: qs("#accuracyStat"), streak: qs("#streakStat"),
  averageTime: qs("#averageTimeStat"), allTime: qs("#allTimeStat"), mastery: qs("#masteryStat"),
  masteryBar: qs("#masteryBar"), masteredCount: qs("#masteredCount"), reset: qs("#resetStats"),
  difficultyScreen: qs("#difficultyScreen"), trainerScreen: qs("#trainerScreen"), difficultyButtons: document.querySelectorAll(".difficulty-card"),
  menu: qs("#menuDialog"), openMenu: qs("#openMenu"), closeMenu: qs("#closeMenu"), nameForm: qs("#nameForm"),
  nameInput: qs("#nameInput"), editName: qs("#editName"), profileName: qs("#profileName"), avatar: qs("#avatarLetter"),
  menuAvatar: qs("#menuAvatar"), currentRange: qs("#currentRange"), rangeButtons: document.querySelectorAll("#rangeOptions button"),
  directionButtons: document.querySelectorAll("#directionOptions button"), spacesToggle: qs("#spacesToggle"),
  fontButtons: document.querySelectorAll("#fontOptions button"),
  answerLabel: qs("label[for='answerInput']")
};

let state = loadState();
if (!localStorage.getItem(FONT_STYLE_VERSION_KEY)) {
  // In the first font-toggle implementation the old handwritten face was
  // accidentally labeled as Print. Migrate that short-lived setting once.
  state.writingFont = "handwritten";
  localStorage.setItem(FONT_STYLE_VERSION_KEY, "2");
  saveState();
}
const FUNNY_NAMES = ["Sleepy Tanuki", "Mochi Ninja", "Capybara Sensei", "Rice Samurai", "Udon Fox", "Serious Penguin"];
if (!state.name || /[\u0400-\u04ff]/i.test(state.name)) {
  state.name = FUNNY_NAMES[Math.floor(Math.random() * FUNNY_NAMES.length)];
  saveState();
}
let mode = state.mode === "exam" ? "exam" : "learning";
let questionDirection = state.questionDirection === "text-to-number" ? "text-to-number" : "number-to-text";
state.questionDirection = questionDirection;
state.showSpaces = Boolean(state.showSpaces);
state.writingFont = state.writingFont === "print" ? "print" : "handwritten";
let maxNumber = ALLOWED_RANGES.includes(Number(state.selectedRange)) ? Number(state.selectedRange) : null;
let current = null;
let previousValue = null;
let recentValues = [];
let answered = false;
let round = 0;
let questionStartedAt = Date.now();
let examSession = null;

function localDateKey() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now - offset).toISOString().slice(0, 10);
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...EMPTY_STATE, ...saved, daily: saved?.daily || {}, perNumber: saved?.perNumber || {}, exams: saved?.exams || [] };
  } catch { return { ...EMPTY_STATE, daily: {}, perNumber: {}, exams: [] }; }
}

function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function todayStats() { return state.daily[localDateKey()] || { total: 0, correct: 0, totalResponseMs: 0, timedAnswers: 0 }; }

function numberMastery(value) {
  const stat = state.perNumber[value];
  if (!stat?.attempts) return 0;
  const accuracy = stat.correct / stat.attempts;
  const practice = Math.min(stat.attempts / 5, 1);
  const stability = Math.min((stat.streak || 0) / 3, 1);
  return accuracy * practice * (0.7 + stability * 0.3);
}

function selectionWeight(item) {
  const stat = state.perNumber[item.value];
  if (!stat?.attempts) return 5;
  const errorRate = 1 - stat.correct / stat.attempts;
  const recentError = stat.lastCorrect === false ? 3 : 0;
  return Math.max(0.45, 1 + errorRate * 7 + recentError - numberMastery(item.value) * 0.8);
}

function weightedFrom(items) {
  const totalWeight = items.reduce((sum, item) => sum + selectionWeight(item), 0);
  let cursor = Math.random() * totalWeight;
  for (const item of items) {
    cursor -= selectionWeight(item);
    if (cursor <= 0) return item;
  }
  return items[items.length - 1];
}

function isOffCooldown(value) {
  const lastIndex = recentValues.lastIndexOf(value);
  if (lastIndex === -1) return true;
  const stat = state.perNumber[value];
  const stillProblematic = stat && stat.correct < stat.attempts && (stat.streak || 0) < 3;
  const requiredGap = stillProblematic ? 3 : RECENT_COOLDOWN;
  const questionsSince = recentValues.length - 1 - lastIndex;
  return questionsSince >= requiredGap;
}

function learningQuestion() {
  const recent = new Set(recentValues);
  const problemItems = Object.keys(state.perNumber)
    .map(Number)
    .filter((value) => value >= 0 && value <= maxNumber && isOffCooldown(value) && numberMastery(value) < 0.8)
    .map(makeNumber);
  if (problemItems.length && Math.random() < 0.65) return weightedFrom(problemItems);
  let item;
  do { item = makeNumber(Math.floor(Math.random() * (maxNumber + 1))); } while (recent.has(item.value));
  return item;
}

function examQuestion() {
  let item;
  do { item = makeNumber(Math.floor(Math.random() * (maxNumber + 1))); } while (examSession.used.has(item.value));
  examSession.used.add(item.value);
  return item;
}

function chooseQuestion() {
  if (mode === "exam" && examSession?.answers >= EXAM_LENGTH) return showExamResult();
  current = mode === "exam" ? examQuestion() : learningQuestion();
  previousValue = current.value;
  if (mode === "learning") {
    recentValues.push(current.value);
    if (recentValues.length > RECENT_COOLDOWN) recentValues.shift();
  }
  round += 1;
  answered = false;
  questionStartedAt = Date.now();
  elements.practiceContent.hidden = false;
  elements.examResult.hidden = true;
  renderQuestionPrompt();
  elements.kanji.textContent = questionDirection === "text-to-number" ? current.kanji : "";
  elements.round.textContent = mode === "exam" ? `${round} / ${EXAM_LENGTH}` : `Question ${round}`;
  elements.input.value = "";
  if (questionDirection === "text-to-number") {
    elements.input.placeholder = maxNumber <= 10 ? "for example, 7" : maxNumber <= 100 ? "for example, 40" : maxNumber <= 1000 ? "for example, 300" : "for example, 10000";
    elements.input.inputMode = "numeric";
    elements.answerLabel.textContent = "Answer with Arabic numerals";
  } else {
    elements.input.placeholder = maxNumber <= 10 ? "for example, nana" : maxNumber <= 100 ? "for example, yonjuu" : maxNumber <= 1000 ? "for example, sanbyaku" : "for example, ichiman";
    elements.input.inputMode = "text";
    elements.answerLabel.textContent = "Answer in Japanese";
  }
  elements.input.className = "";
  elements.input.readOnly = false;
  elements.button.textContent = "Check";
  elements.showAnswer.hidden = mode === "exam";
  elements.showAnswer.disabled = false;
  elements.feedback.className = "feedback";
  elements.feedback.textContent = mode === "exam" ? "One attempt · no hints" : questionDirection === "text-to-number" ? "Answer with Arabic numerals" : "Answer in hiragana or romaji";
  updateTimer();
  elements.input.focus({ preventScroll: true });
}

function renderQuestionPrompt() {
  const isTextPrompt = questionDirection === "text-to-number";
  elements.number.classList.toggle("text-question", isTextPrompt);
  elements.number.classList.toggle("two-line-question", isTextPrompt && maxNumber === 1000000);
  elements.number.style.fontSize = "";
  elements.number.style.whiteSpace = "";
  elements.number.textContent = isTextPrompt
    ? (state.showSpaces ? current.kanaParts.join(" ") : current.kana)
    : current.value.toLocaleString("en-US", { useGrouping: false });
  if (isTextPrompt) requestAnimationFrame(fitQuestionText);
}

function fitQuestionText() {
  if (questionDirection !== "text-to-number" || !current) return;
  const prompt = elements.number;
  const wrap = prompt.parentElement;
  const allowedLines = maxNumber === 1000000 ? 2 : 1;
  prompt.style.whiteSpace = "nowrap";
  prompt.style.fontSize = "";
  const naturalSize = parseFloat(getComputedStyle(prompt).fontSize);
  const availableWidth = Math.max(1, wrap.clientWidth - 8);
  const naturalWidth = prompt.scrollWidth;
  const targetWidth = availableWidth * (allowedLines === 2 ? 1.82 : 1);
  const fittedSize = Math.max(14, Math.min(naturalSize, naturalSize * targetWidth / naturalWidth));
  prompt.style.fontSize = `${fittedSize}px`;
  prompt.style.whiteSpace = allowedLines === 2 ? "normal" : "nowrap";
}

function normalize(value) {
  return value.trim().toLowerCase().replace(/[\s\-–—_.']/g, "").replace(/ō/g, "ou").replace(/ū/g, "uu");
}

function normalizeNumericAnswer(value) {
  const normalized = value.trim()
    .replace(/[０-９]/g, (digit) => String(digit.charCodeAt(0) - 0xFF10))
    .replace(/[\s,._']/g, "");
  return /^\d+$/.test(normalized) ? Number(normalized) : null;
}

function showReverseAnswer(prefix, className) {
  const number = document.createElement("strong");
  number.textContent = current.value.toLocaleString("en-US");
  elements.feedback.replaceChildren(document.createTextNode(`${prefix}\n${current.romaji} · `), number);
  elements.feedback.className = className;
}

function elapsedMs() { return Math.max(0, Date.now() - questionStartedAt); }
function formatSeconds(ms) { return `${(ms / 1000).toFixed(1)} s`; }

function updateTimer() {
  if (!answered && !elements.practiceContent.hidden) elements.timer.textContent = formatSeconds(elapsedMs());
}

function submitAnswer(event) {
  event.preventDefault();
  if (answered) return chooseQuestion();
  const rawAnswer = elements.input.value;
  const answer = questionDirection === "text-to-number" ? normalizeNumericAnswer(rawAnswer) : normalize(rawAnswer);
  if (answer === "" || answer === null) {
    elements.feedback.textContent = "Enter an answer first";
    elements.feedback.className = "feedback wrong";
    elements.input.focus();
    return;
  }

  const responseMs = elapsedMs();
  const isCorrect = questionDirection === "text-to-number"
    ? answer === current.value
    : current.answers.some((valid) => normalize(valid) === answer);
  elements.input.classList.remove("is-correct", "is-wrong");
  recordAttempt(isCorrect, responseMs);

  if (isCorrect) {
    elements.feedback.textContent = questionDirection === "text-to-number"
      ? `Correct in ${formatSeconds(responseMs)}!`
      : `Correct in ${formatSeconds(responseMs)}!\n${current.kanji} | ${current.kana} | ${current.romaji}`;
    elements.kanji.textContent = current.kanji;
    elements.feedback.className = "feedback correct";
    elements.input.classList.add("is-correct");
    finishQuestion();
  } else if (mode === "learning") {
    elements.feedback.textContent = "Not quite. Fix your answer and try again";
    elements.feedback.className = "feedback wrong";
    elements.input.classList.add("is-wrong");
    elements.input.select();
    questionStartedAt = Date.now();
  } else {
    if (questionDirection === "text-to-number") showReverseAnswer("Incorrect.", "feedback wrong");
    else elements.feedback.textContent = `Incorrect. ${current.kanji} | ${current.kana} | ${current.romaji}`;
    elements.kanji.textContent = current.kanji;
    if (questionDirection !== "text-to-number") elements.feedback.className = "feedback wrong";
    elements.input.classList.add("is-wrong");
    finishQuestion();
  }

  if (mode === "exam") {
    examSession.answers += 1;
    examSession.correct += isCorrect ? 1 : 0;
    examSession.totalMs += responseMs;
    if (examSession.answers === EXAM_LENGTH) elements.button.textContent = "Results";
  }
  saveState();
  renderStats();
}

function recordAttempt(isCorrect, responseMs) {
  const key = localDateKey();
  state.daily[key] ||= { total: 0, correct: 0, totalResponseMs: 0, timedAnswers: 0 };
  state.daily[key].totalResponseMs ||= 0;
  state.daily[key].timedAnswers ||= 0;
  state.perNumber[current.value] ||= { attempts: 0, correct: 0, streak: 0, lastCorrect: null, totalResponseMs: 0 };
  const itemStat = state.perNumber[current.value];
  state.total += 1;
  state.totalResponseMs += responseMs;
  state.timedAnswers += 1;
  state.daily[key].total += 1;
  state.daily[key].totalResponseMs += responseMs;
  state.daily[key].timedAnswers += 1;
  itemStat.attempts += 1;
  itemStat.totalResponseMs = (itemStat.totalResponseMs || 0) + responseMs;
  itemStat.lastCorrect = isCorrect;

  if (isCorrect) {
    state.correct += 1;
    state.daily[key].correct += 1;
    state.currentStreak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.currentStreak);
    itemStat.correct += 1;
    itemStat.streak += 1;
  } else {
    state.currentStreak = 0;
    itemStat.streak = 0;
  }
}

function finishQuestion() {
  answered = true;
  elements.button.textContent = "Next";
  elements.showAnswer.disabled = true;
  elements.input.focus({ preventScroll: true });
}

function keepAnswerFormVisible() {
  if (document.activeElement !== elements.input) return;
  setTimeout(() => elements.form.scrollIntoView({ block: "center", behavior: "smooth" }), 180);
}

function revealAnswer() {
  if (answered || mode === "exam") return;
  const responseMs = elapsedMs();
  recordAttempt(false, responseMs);
  elements.input.classList.remove("is-wrong");
  elements.kanji.textContent = current.kanji;
  if (questionDirection === "text-to-number") showReverseAnswer("Answer:", "feedback correct");
  else {
    elements.feedback.textContent = `Answer:\n${current.kanji} | ${current.kana} | ${current.romaji}`;
    elements.feedback.className = "feedback correct";
  }
  finishQuestion();
  saveState();
  renderStats();
}

function setMode(nextMode) {
  mode = nextMode;
  state.mode = mode;
  round = 0;
  previousValue = null;
  recentValues = [];
  examSession = mode === "exam" ? { answers: 0, correct: 0, totalMs: 0, used: new Set(), completed: false } : null;
  elements.learningMode.classList.toggle("active", mode === "learning");
  elements.examMode.classList.toggle("active", mode === "exam");
  elements.learningMode.setAttribute("aria-pressed", String(mode === "learning"));
  elements.examMode.setAttribute("aria-pressed", String(mode === "exam"));
  elements.modeLabel.textContent = mode === "exam" ? "Exam" : "Learn";
  elements.timer.hidden = mode !== "exam";
  saveState();
  chooseQuestion();
}

function setQuestionDirection(direction) {
  if (!["number-to-text", "text-to-number"].includes(direction) || direction === questionDirection) return;
  questionDirection = direction;
  state.questionDirection = direction;
  saveState();
  renderSettings();
  if (maxNumber !== null) setMode(mode);
}

function renderSettings() {
  elements.directionButtons.forEach((button) => {
    const active = button.dataset.direction === questionDirection;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  elements.spacesToggle.checked = state.showSpaces;
  elements.number.classList.toggle("handwritten", state.writingFont === "handwritten");
  elements.kanji.classList.toggle("handwritten", state.writingFont === "handwritten");
  elements.fontButtons.forEach((button) => {
    const active = button.dataset.font === state.writingFont;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function showExamResult() {
  if (!examSession.completed) {
    state.exams.push({ date: new Date().toISOString(), correct: examSession.correct, total: EXAM_LENGTH, totalMs: examSession.totalMs });
    state.exams = state.exams.slice(-20);
    examSession.completed = true;
    saveState();
  }
  answered = true;
  elements.practiceContent.hidden = true;
  elements.examResult.hidden = false;
  elements.round.textContent = "Done";
  elements.timer.textContent = formatSeconds(examSession.totalMs);
  elements.examScore.textContent = `${examSession.correct}/${EXAM_LENGTH}`;
  elements.examSummary.textContent = `Average time: ${formatSeconds(examSession.totalMs / EXAM_LENGTH)}`;
  elements.restartExam.focus({ preventScroll: true });
}

function renderStats() {
  const today = todayStats();
  const practicedValues = maxNumber === null ? [] : Object.keys(state.perNumber).map(Number).filter((value) => value >= 0 && value <= maxNumber);
  const mastered = practicedValues.filter((value) => numberMastery(value) >= 0.8).length;
  const rangeSize = maxNumber === null ? 0 : maxNumber + 1;
  const mastery = rangeSize ? mastered / rangeSize * 100 : 0;
  const masteryLabel = mastery > 0 && mastery < 1 ? mastery.toFixed(2) : Math.round(mastery).toString();
  elements.correct.textContent = today.correct;
  elements.accuracy.textContent = today.total ? `${Math.round(today.correct / today.total * 100)}%` : "—";
  elements.streak.textContent = state.currentStreak;
  elements.averageTime.textContent = today.timedAnswers ? formatSeconds(today.totalResponseMs / today.timedAnswers) : "—";
  elements.mastery.textContent = `${masteryLabel}%`;
  elements.masteryBar.style.width = `${mastery}%`;
  elements.masteryBar.parentElement.setAttribute("aria-valuenow", mastery.toFixed(2));
  elements.masteredCount.textContent = `${mastered} of ${rangeSize.toLocaleString("en-US")} numbers confidently mastered`;
  elements.allTime.textContent = `Total attempts: ${state.total} · best streak: ${state.bestStreak} · exams: ${state.exams.length}`;
  elements.profileName.textContent = state.name;
  const initial = state.name.trim().charAt(0).toLocaleUpperCase("en-US");
  elements.avatar.textContent = initial;
  elements.menuAvatar.textContent = initial;
  if (maxNumber !== null) {
    elements.currentRange.textContent = `0–${maxNumber.toLocaleString("en-US")}`;
    elements.rangeButtons.forEach((button) => button.classList.toggle("active", Number(button.dataset.range) === maxNumber));
  } else {
    elements.currentRange.textContent = "Not selected";
  }
  renderSettings();
}

function selectRange(value) {
  const range = Number(value);
  if (!ALLOWED_RANGES.includes(range)) return;
  maxNumber = range;
  state.selectedRange = range;
  state.currentStreak = 0;
  elements.difficultyScreen.hidden = true;
  elements.trainerScreen.hidden = false;
  renderStats();
  setMode("learning");
}

elements.form.addEventListener("submit", submitAnswer);
elements.input.addEventListener("focus", keepAnswerFormVisible);
if (window.visualViewport) window.visualViewport.addEventListener("resize", keepAnswerFormVisible);
elements.showAnswer.addEventListener("click", revealAnswer);
elements.form.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || !answered) return;
  event.preventDefault();
  chooseQuestion();
});
elements.learningMode.addEventListener("click", () => setMode("learning"));
elements.examMode.addEventListener("click", () => setMode("exam"));
elements.restartExam.addEventListener("click", () => setMode("exam"));
elements.returnLearning.addEventListener("click", () => setMode("learning"));
elements.difficultyButtons.forEach((button) => button.addEventListener("click", () => selectRange(button.dataset.range)));
elements.rangeButtons.forEach((button) => button.addEventListener("click", () => selectRange(button.dataset.range)));
elements.directionButtons.forEach((button) => button.addEventListener("click", () => setQuestionDirection(button.dataset.direction)));
elements.spacesToggle.addEventListener("change", () => {
  state.showSpaces = elements.spacesToggle.checked;
  saveState();
  if (current && questionDirection === "text-to-number" && !answered) renderQuestionPrompt();
});
elements.fontButtons.forEach((button) => button.addEventListener("click", () => {
  state.writingFont = button.dataset.font === "handwritten" ? "handwritten" : "print";
  saveState(); renderSettings();
}));
elements.openMenu.addEventListener("click", () => {
  renderStats();
  elements.nameForm.hidden = true;
  elements.menu.showModal();
});
elements.closeMenu.addEventListener("click", () => elements.menu.close());
elements.menu.addEventListener("click", (event) => {
  if (event.target === elements.menu) elements.menu.close();
});
elements.editName.addEventListener("click", () => {
  elements.nameInput.value = state.name;
  elements.nameForm.hidden = false;
  elements.nameInput.focus();
});
elements.nameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.name = elements.nameInput.value.trim() || FUNNY_NAMES[Math.floor(Math.random() * FUNNY_NAMES.length)];
  saveState();
  renderStats();
  elements.nameForm.hidden = true;
});
elements.reset.addEventListener("click", () => {
  if (!confirm("Reset all statistics? Your name and settings will be kept.")) return;
  state = { ...EMPTY_STATE, name: state.name, mode, selectedRange: maxNumber, questionDirection, showSpaces: state.showSpaces, writingFont: state.writingFont, daily: {}, perNumber: {}, exams: [] };
  saveState();
  renderStats();
});

renderStats();
if (maxNumber === null) {
  elements.difficultyScreen.hidden = false;
  elements.trainerScreen.hidden = true;
} else {
  elements.difficultyScreen.hidden = true;
  elements.trainerScreen.hidden = false;
  setMode(mode);
}
setInterval(updateTimer, 200);
window.addEventListener("resize", () => {
  if (questionDirection === "text-to-number" && current) requestAnimationFrame(fitQuestionText);
});
