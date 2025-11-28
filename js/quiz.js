"use strict";

// Короткі утиліти
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);


function shuffle(arr) {
  return arr.slice().sort(() => Math.random() - 0.5);
}

// localStorage
const LS_USER = "arraysQuizUser";
const LS_LAST = "arraysQuizLast";

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadJson(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

//  Базовий клас питання
class BaseQuestion {
  constructor(cfg) {
    this.id = cfg.id;
    this.level = cfg.level; 
    this.type = cfg.type;  
    this.text = cfg.text;
    this.points = cfg.points || 1;
  }

  createWrapper(index, typeLabel) {
    const root = document.createElement("article");
    root.className = "quiz-question";
    root.dataset.id = this.id;

    const header = document.createElement("div");
    header.className = "quiz-question-header";

    const title = document.createElement("div");
    title.className = "quiz-question-title";
    title.textContent = index + ". " + this.text;

    const kind = document.createElement("span");
    kind.className = "quiz-question-type";
    kind.textContent = typeLabel;

    const body = document.createElement("div");
    body.className = "quiz-question-body";

    header.appendChild(title);
    header.appendChild(kind);
    root.appendChild(header);
    root.appendChild(body);

    this.root = root;
    this.body = body;
    return root;
  }


  render(index) {
    return this.createWrapper(index, "Запитання");
  }

  getScore() {
    return 0;
  }

  reset() {}
}

// Конкретні типи питань 

// 1) radio
class RadioQuestion extends BaseQuestion {
  constructor(cfg) {
    super(cfg);
    this.options = cfg.options;
    this.correct = cfg.correct;
  }

  render(index) {
    const root = this.createWrapper(index, "Одна правильна відповідь (radio)");
    const name = "q_" + this.id;
    const list = document.createElement("div");
    list.className = "quiz-options";

    shuffle(this.options).forEach((opt) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = name;
      input.value = opt.value;
      label.appendChild(input);
      label.appendChild(document.createTextNode(" " + opt.label));
      list.appendChild(label);
    });

    this.body.appendChild(list);
    return root;
  }

  getScore() {
    const checked = this.root.querySelector("input[type=radio]:checked");
    if (!checked) return 0;
    return checked.value === this.correct ? this.points : 0;
  }

  reset() {
    this.root
      .querySelectorAll("input[type=radio]")
      .forEach((i) => (i.checked = false));
  }
}

// 2) checkbox
class CheckboxQuestion extends BaseQuestion {
  constructor(cfg) {
    super(cfg);
    this.options = cfg.options;
    this.correct = cfg.correct;
  }

  render(index) {
    const root = this.createWrapper(
      index,
      "Кілька правильних відповідей (checkbox)"
    );
    const list = document.createElement("div");
    list.className = "quiz-options";

    shuffle(this.options).forEach((opt) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = opt.value;
      label.appendChild(input);
      label.appendChild(document.createTextNode(" " + opt.label));
      list.appendChild(label);
    });

    this.body.appendChild(list);
    return root;
  }

  getScore() {
    const checked = Array.from(
      this.root.querySelectorAll("input[type=checkbox]:checked")
    ).map((el) => el.value);

    const norm = (a) => a.slice().sort().join("|");
    return norm(checked) === norm(this.correct) ? this.points : 0;
  }

  reset() {
    this.root
      .querySelectorAll("input[type=checkbox]")
      .forEach((i) => (i.checked = false));
  }
}

// 3) select
class SelectQuestion extends BaseQuestion {
  constructor(cfg) {
    super(cfg);
    this.options = cfg.options;
    this.correct = cfg.correct;
  }

  render(index) {
    const root = this.createWrapper(index, "Випадаючий список (select)");
    const select = document.createElement("select");
    select.name = "q_" + this.id;

    const opt0 = document.createElement("option");
    opt0.textContent = "Оберіть відповідь";
    opt0.value = "";
    opt0.disabled = true;
    opt0.selected = true;
    select.appendChild(opt0);

    shuffle(this.options).forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt.value;
      o.textContent = opt.label;
      select.appendChild(o);
    });

    this.body.appendChild(select);
    this.select = select;
    return root;
  }

  getScore() {
    return this.select.value === this.correct ? this.points : 0;
  }

  reset() {
    this.select.selectedIndex = 0;
  }
}

// 4) textarea з динамічною перевіркою 
class CodeQuestion extends BaseQuestion {
  constructor(cfg) {
    super(cfg);
    this.hints = cfg.hints; 
  }

  render(index) {
    const root = this.createWrapper(
      index,
      "Написання коду (textarea)"
    );
    const textarea = document.createElement("textarea");
    textarea.rows = 4;
    textarea.placeholder = "Напишіть фрагмент коду роботи з масивом...";
    const info = document.createElement("p");
    info.className = "quiz-user-status";
    info.textContent = "Код ще не перевірено.";

    textarea.addEventListener("input", () => {
      const val = textarea.value.toLowerCase();
      const ok = this.hints.every((piece) => val.includes(piece));
      textarea.classList.remove("quiz-input-correct", "quiz-input-wrong");
      if (!val.trim()) {
        info.textContent = "Код ще не перевірено.";
      } else if (ok) {
        info.textContent = "Код виглядає коректним.";
        textarea.classList.add("quiz-input-correct");
      } else {
        info.textContent = "Код містить помилки або неповний.";
        textarea.classList.add("quiz-input-wrong");
      }
    });

    this.body.appendChild(textarea);
    this.body.appendChild(info);
    this.textarea = textarea;
    return root;
  }

  getScore() {
    const val = this.textarea.value.toLowerCase();
    if (!val.trim()) return 0;
    return this.hints.every((piece) => val.includes(piece)) ? this.points : 0;
  }

  reset() {
    this.textarea.value = "";
    this.textarea.classList.remove("quiz-input-correct", "quiz-input-wrong");
  }
}

// 5) fill-in-the-blank
class FillQuestion extends BaseQuestion {
  constructor(cfg) {
    super(cfg);
    this.parts = cfg.parts;
    this.correctValues = cfg.correctValues;
  }

  render(index) {
    const root = this.createWrapper(index, "Заповнення пропусків (fill)");
    const box = document.createElement("div");
    box.className = "quiz-code";
    this.inputs = [];

    this.parts.forEach((part, i) => {
      box.appendChild(document.createTextNode(part));
      if (i < this.correctValues.length) {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "quiz-inline-input";
        box.appendChild(input);
        this.inputs.push(input);
      }
    });

    this.body.appendChild(box);
    return root;
  }

  getScore() {
    const values = this.inputs.map((i) => i.value.trim());
    const allGood = values.every((v, i) => v === this.correctValues[i]);
    return allGood ? this.points : 0;
  }

  reset() {
    this.inputs.forEach((i) => (i.value = ""));
  }
}

// 6) Drag & Drop
class DragQuestion extends BaseQuestion {
  constructor(cfg) {
    super(cfg);
    this.pairs = cfg.pairs; 
  }

  render(index) {
    const root = this.createWrapper(
      index,
      "Встановлення відповідності (Drag & Drop)"
    );
    const wrap = document.createElement("div");
    wrap.className = "quiz-dnd-wrap";

    const leftCol = document.createElement("div");
    leftCol.className = "quiz-dnd-column";
    leftCol.innerHTML = "<h4>Метод</h4>";

    const rightCol = document.createElement("div");
    rightCol.className = "quiz-dnd-column";
    rightCol.innerHTML = "<h4>Опис</h4>";

    const source = document.createElement("div");
    source.className = "quiz-dnd-source";

    const target = document.createElement("div");
    target.className = "quiz-dnd-target";

    shuffle(this.pairs).forEach((p) => {
      const item = document.createElement("div");
      item.className = "quiz-dnd-item";
      item.textContent = p.right;
      item.draggable = true;
      item.dataset.id = p.id;
      source.appendChild(item);
    });

    this.pairs.forEach((p) => {
      const slot = document.createElement("div");
      slot.className = "quiz-dnd-target-slot";
      slot.dataset.id = p.id;
      slot.textContent = p.left;
      target.appendChild(slot);
    });

    leftCol.appendChild(source);
    rightCol.appendChild(target);
    wrap.appendChild(leftCol);
    wrap.appendChild(rightCol);
    this.body.appendChild(wrap);
    this.wrap = wrap;

    this.initDnd();
    return root;
  }

  initDnd() {
    this.wrap.addEventListener("dragstart", (e) => {
      const el = e.target;
      if (el.classList.contains("quiz-dnd-item")) {
        e.dataTransfer.setData("text/plain", el.dataset.id || "");
      }
    });

    this.wrap.addEventListener("dragover", (e) => {
      const el = e.target;
      if (el.classList.contains("quiz-dnd-target-slot")) {
        e.preventDefault();
        el.classList.add("over");
      }
    });

    this.wrap.addEventListener("dragleave", (e) => {
      const el = e.target;
      if (el.classList.contains("quiz-dnd-target-slot")) {
        el.classList.remove("over");
      }
    });

    this.wrap.addEventListener("drop", (e) => {
      const el = e.target;
      if (el.classList.contains("quiz-dnd-target-slot")) {
        e.preventDefault();
        el.classList.remove("over");
        const id = e.dataTransfer.getData("text/plain");
        const item = this.wrap.querySelector(
          '.quiz-dnd-item[data-id="' + id + '"]'
        );
        if (item) {
          el.innerHTML = "";
          el.appendChild(item);
        }
      }
    });
  }

  getScore() {
    const slots = this.wrap.querySelectorAll(".quiz-dnd-target-slot");
    let ok = 0;
    slots.forEach((slot) => {
      const item = slot.querySelector(".quiz-dnd-item");
      if (item && item.dataset.id === slot.dataset.id) ok++;
    });
    return ok === this.pairs.length ? this.points : 0;
  }

  reset() {
    
  }
}

// 7) Debugging
class DebugQuestion extends BaseQuestion {
  constructor(cfg) {
    super(cfg);
    this.broken = cfg.broken;
    this.mustContain = cfg.mustContain;
  }

  render(index) {
    const root = this.createWrapper(
      index,
      "Виправлення помилки (debugging)"
    );
    const code = document.createElement("div");
    code.className = "quiz-code";
    code.textContent = this.broken;
    const textarea = document.createElement("textarea");
    textarea.rows = 3;
    textarea.placeholder = "Виправлений код...";

    this.body.appendChild(code);
    this.body.appendChild(textarea);
    this.textarea = textarea;
    return root;
  }

  getScore() {
    const val = this.textarea.value.toLowerCase();
    if (!val.trim()) return 0;
    return val.includes(this.mustContain.toLowerCase()) ? this.points : 0;
  }

  reset() {
    this.textarea.value = "";
  }
}

// Фабрика питань 
function createQuestion(cfg) {
  switch (cfg.type) {
    case "radio": return new RadioQuestion(cfg);
    case "checkbox": return new CheckboxQuestion(cfg);
    case "select": return new SelectQuestion(cfg);
    case "code": return new CodeQuestion(cfg);
    case "fill": return new FillQuestion(cfg);
    case "drag": return new DragQuestion(cfg);
    case "debug": return new DebugQuestion(cfg);
    default: return new BaseQuestion(cfg);
  }
}

//  Банк запитань (масиви)

// easy
const easyBase = [
  {
    id: "e1",
    level: "easy",
    type: "radio",
    text: "Який синтаксис створення порожнього масиву є коректним?",
    options: [
      { value: "square", label: "const arr = [];" },
      { value: "object", label: "const arr = {};" },
      { value: "number", label: "const arr = 0;" },
      { value: "string", label: "const arr = '';" },
    ],
    correct: "square",
    points: 1,
  },
  {
    id: "e2",
    level: "easy",
    type: "radio",
    text: "Який індекс має перший елемент масиву arr?",
    options: [
      { value: "0", label: "0" },
      { value: "1", label: "1" },
      { value: "-1", label: "-1" },
      { value: "len", label: "arr.length" },
    ],
    correct: "0",
    points: 1,
  },
  {
    id: "e3",
    level: "easy",
    type: "checkbox",
    text: "Оберіть усі методи, які ДОДАЮТЬ елементи до масиву.",
    options: [
      { value: "push", label: "push" },
      { value: "pop", label: "pop" },
      { value: "unshift", label: "unshift" },
      { value: "slice", label: "slice" },
    ],
    correct: ["push", "unshift"],
    points: 2,
  },
  {
    id: "e4",
    level: "easy",
    type: "select",
    text: "Який вираз повертає довжину масиву numbers?",
    options: [
      { value: "length", label: "numbers.length" },
      { value: "size", label: "size(numbers)" },
      { value: "len", label: "len(numbers)" },
      { value: "count", label: "count(numbers)" },
    ],
    correct: "length",
    points: 1,
  },
  {
    id: "e5",
    level: "easy",
    type: "fill",
    text: "Заповніть пропуски: цикл for проходить по масиву з 5 елементів.",
    parts: ["for (", " i = 0; i <", "; ", ") { console.log(arr[i]); }"],
    correctValues: ["let", "5", "i++"],
    points: 2,
  },
];

// medium
const mediumBase = [
  {
    id: "m1",
    level: "medium",
    type: "radio",
    text: "Який метод масиву створює НОВИЙ масив із результатів виклику функції для кожного елемента?",
    options: [
      { value: "map", label: "map" },
      { value: "forEach", label: "forEach" },
      { value: "push", label: "push" },
      { value: "reduce", label: "reduce" },
    ],
    correct: "map",
    points: 1,
  },
  {
    id: "m2",
    level: "medium",
    type: "checkbox",
    text: "Оберіть методи, які повертають НОВИЙ масив, не змінюючи початковий.",
    options: [
      { value: "filter", label: "filter" },
      { value: "sort", label: "sort" },
      { value: "slice", label: "slice" },
      { value: "forEach", label: "forEach" },
    ],
    correct: ["filter", "slice"],
    points: 2,
  },
  {
    id: "m3",
    level: "medium",
    type: "select",
    text: "Який метод краще використати, щоб знайти ПЕРШИЙ елемент, що задовольняє умову?",
    options: [
      { value: "find", label: "find" },
      { value: "filter", label: "filter" },
      { value: "map", label: "map" },
      { value: "includes", label: "includes" },
    ],
    correct: "find",
    points: 1,
  },
  {
    id: "m4",
    level: "medium",
    type: "code",
    text: "Напишіть функцію, яка повертає суму елементів масиву numbers за допомогою reduce.",
    hints: ["numbers", "reduce", "acc", "=>"],
    points: 3,
  },
  {
    id: "m5",
    level: "medium",
    type: "drag",
    text: "Встановіть відповідність між методами масивів та їх дією.",
    pairs: [
      {
        id: "p1",
        left: "forEach",
        right: "Викликає функцію для кожного елемента, нічого не повертає",
      },
      {
        id: "p2",
        left: "filter",
        right: "Повертає новий масив, що містить елементи, які пройшли перевірку",
      },
      {
        id: "p3",
        left: "sort",
        right: "Сортує масив на місці",
      },
    ],
    points: 3,
  },
];

// hard
const hardBase = [
  {
    id: "h1",
    level: "hard",
    type: "radio",
    text: "Який запис найкраще описує використання reduce для обчислення добутку елементів масиву arr?",
    options: [
      { value: "sum", label: "arr.reduce((acc, x) => acc + x, 1)" },
      { value: "prod", label: "arr.reduce((acc, x) => acc * x, 1)" },
      { value: "map", label: "arr.map(x => x * 2)" },
      { value: "forEach", label: "arr.forEach(x => acc *= x)" },
    ],
    correct: "prod",
    points: 1,
  },
  {
    id: "h2",
    level: "hard",
    type: "checkbox",
    text: "Які твердження про метод find є правильними?",
    options: [
      { value: "first", label: "Повертає перший елемент, що задовольняє умову" },
      { value: "array", label: "Повертає завжди новий масив" },
      { value: "undefined", label: "Повертає undefined, якщо елемент не знайдено" },
      { value: "index", label: "Повертає індекс знайденого елемента" },
    ],
    correct: ["first", "undefined"],
    points: 2,
  },
  {
    id: "h3",
    level: "hard",
    type: "fill",
    text: "Заповніть пропуски: створити відсортовану копію масиву numbers за зростанням.",
    parts: ["const sorted = numbers.", "((a, b) => ", ");"],
    correctValues: ["slice().sort", "a - b"],
    points: 3,
  },
  {
    id: "h4",
    level: "hard",
    type: "debug",
    text: "У наведеному коді є помилка. Виправте функцію, що фільтрує парні числа.",
    broken: "const evens = numbers.filter(num => num % 2 = 0);",
    mustContain: "num % 2 === 0",
    points: 3,
  },
  {
    id: "h5",
    level: "hard",
    type: "code",
    text: "Напишіть фрагмент коду, який знаходить перше від'ємне число в масиві з допомогою find.",
    hints: ["find", "x => x", "< 0"],
    points: 3,
  },
];

// розширюємо до 15 питань на рівень 
function expandTo15(base, level) {
  const result = base.slice();
  let i = 0;
  while (result.length < 15) {
    const src = base[i % base.length];
    const copy = Object.assign({}, src, {
      id: src.id + "_x" + result.length,
      level,
    });
    result.push(copy);
    i++;
  }
  return result;
}

// створюємо екземпляри питань
const easyQuestions = expandTo15(easyBase, "easy").map(createQuestion);
const mediumQuestions = expandTo15(mediumBase, "medium").map(createQuestion);
const hardQuestions = expandTo15(hardBase, "hard").map(createQuestion);

// Клас Quiz
class Quiz {
  constructor() {
    this.level = null;
    this.questions = [];
    this.maxQuestions = 10;

    this.userForm = $("#user-form");
    this.userStatus = $("#user-status");
    this.levelButtons = $$("#level-buttons button");
    this.questionsBox = $("#quiz-questions");
    this.quizForm = $("#quiz-form");
    this.resultSummary = $("#result-summary");
    this.resultDetails = $("#result-details");
    this.resultStorage = $("#result-storage");
    this.lastResultText = $("#last-result-text");
    this.headerStudent = $("#header-student");
    this.resetBtn = $("#btn-reset-quiz");

    this.init();
  }

  init() {
    this.restoreUser();
    this.restoreLastResult();
    this.bindUserForm();
    this.bindLevels();
    this.bindQuizForm();
  }

  bindUserForm() {
    this.userForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!this.userForm.checkValidity()) {
        this.userStatus.textContent = "Будь ласка, заповніть дані коректно.";
        this.userStatus.classList.add("error");
        this.userForm.reportValidity();
        return;
      }
      const formData = new FormData(this.userForm);
      const data = Object.fromEntries(formData.entries());
      this.user = {
        name: data.studentName.trim(),
        group: data.studentGroup.trim(),
      };
      saveJson(LS_USER, this.user);
      this.userStatus.textContent =
        `Дані збережено: ${this.user.group} — ${this.user.name}`;
      this.userStatus.classList.remove("error");
      this.userStatus.classList.add("ok");
      this.updateHeader();
      this.enableLevels();
    });

    this.userForm.addEventListener("reset", () => {
      this.userStatus.textContent = "Дані ще не підтверджено.";
      this.userStatus.classList.remove("ok", "error");
    });
  }

  bindLevels() {
    this.levelButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        this.levelButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.level = btn.dataset.level;
        this.buildQuestions();
      });
    });
  }

  bindQuizForm() {
    this.quizForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.finish();
    });

    this.resetBtn.addEventListener("click", () => {
      this.questions.forEach((q) => q.reset());
    });
  }

  restoreUser() {
    const saved = loadJson(LS_USER);
    if (!saved) return;
    this.user = saved;
    $("#studentName").value = saved.name;
    $("#studentGroup").value = saved.group;
    this.userStatus.textContent =
      `Дані збережено: ${saved.group} — ${saved.name}`;
    this.userStatus.classList.add("ok");
    this.enableLevels();
    this.updateHeader();
  }

  restoreLastResult() {
    const last = loadJson(LS_LAST);
    if (!last) return;
    this.lastResultText.textContent =
      `${last.name} (${last.group}), рівень: ${last.level}. ` +
      `Результат: ${last.score}/${last.maxScore} (${last.percent}%). Дата: ${last.date}.`;
  }

  updateHeader() {
    if (!this.headerStudent || !this.user) return;
    const base =
      "ГРУПА ТР-43 · КОЛЕСОВА ЄВА · ТЕМА: РОБОТА З МАСИВАМИ: МЕТОДИ ТА ІТЕРАЦІЇ (ВАРІАНТ 4)";
    this.headerStudent.textContent =
      base + ` · КОРИСТУВАЧ: ${this.user.group} — ${this.user.name}`;
  }

  enableLevels() {
    this.levelButtons.forEach((btn) => (btn.disabled = false));
  }

  buildQuestions() {
    let bank;
    if (this.level === "easy") bank = easyQuestions;
    else if (this.level === "medium") bank = mediumQuestions;
    else bank = hardQuestions;

    const bankCopy = bank.slice();
    bankCopy.sort(() => Math.random() - 0.5);
    this.questions = bankCopy.slice(0, this.maxQuestions);

    const hasDebug = this.questions.find((q) => q instanceof DebugQuestion);
    if (!hasDebug) {
      const dbg = bank.find((q) => q instanceof DebugQuestion);
      if (dbg) this.questions[0] = dbg;
    }

    this.renderQuestions();
  }

  renderQuestions() {
    this.questionsBox.innerHTML = "";
    this.questions.forEach((q, i) => {
      this.questionsBox.appendChild(q.render(i + 1));
    });
  }

  finish() {
    if (!this.questions.length) {
      this.resultSummary.textContent =
        "Спочатку оберіть рівень та питання.";
      return;
    }

    const total = this.questions.reduce(
      (acc, q) => {
        acc.score += q.getScore();
        acc.maxScore += q.points;
        return acc;
      },
      { score: 0, maxScore: 0 }
    );

    const correctCount = this.questions.filter(
      (q) => q.getScore() > 0
    ).length;
    const percent = total.maxScore
      ? Math.round((total.score / total.maxScore) * 100)
      : 0;

    const levelText =
      this.level === "easy"
        ? "Початковий"
        : this.level === "medium"
        ? "Середній"
        : "Складний";

    const name = this.user ? this.user.name : "Невідомий";
    const group = this.user ? this.user.group : "—";

    this.resultSummary.innerHTML =
      `<strong>${name}</strong> (${group}), рівень: <strong>${levelText}</strong>. ` +
      `Отримано <strong>${total.score}</strong> з <strong>${total.maxScore}</strong> балів (${percent}%).`;

    this.resultDetails.textContent =
      `Правильних відповідей: ${correctCount} з ${this.questions.length}.`;

    const toSave = {
      name,
      group,
      level: levelText,
      score: total.score,
      maxScore: total.maxScore,
      percent,
      date: new Date().toLocaleString(),
    };

    saveJson(LS_LAST, toSave);
    this.resultStorage.textContent = "Результат збережено в localStorage.";
    this.restoreLastResult();
  }
}

// ініціалізація
document.addEventListener("DOMContentLoaded", () => {
  window.arraysQuiz = new Quiz();
});
