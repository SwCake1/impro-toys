(() => {
  const locations = window.LOCATIONS;
  const board = document.querySelector("#board");
  const counter = document.querySelector("#counter");
  const liveLocation = document.querySelector("#liveLocation");
  const nextButton = document.querySelector("#nextButton");

  if (
    !Array.isArray(locations) ||
    locations.length === 0 ||
    !board ||
    !counter ||
    !liveLocation ||
    !nextButton
  ) {
    if (nextButton) {
      nextButton.disabled = true;
      nextButton.querySelector(".board-button__text").textContent =
        "Локации не загрузились";
    }
    return;
  }

  // Алфавит перекрутки: кириллица (33 буквы), пробел и дефис. Ё считаем частью алфавита.
  const FLIP_ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ -".split("");
  const FLIP_STEPS = 12; // сколько символов «пролистывает» ячейка до цели
  const STEP_MS = 34; // длительность одного перелистывания
  const COLUMN_DELAY_MS = 26; // нарастающая задержка между колонками (волна слева направо)

  const reduceMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

  let order = [];
  let index = -1;

  function shuffle() {
    order = locations.slice();
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = order[i];
      order[i] = order[j];
      order[j] = tmp;
    }
  }

  function getNextLocation() {
    index += 1;
    if (index >= order.length) {
      shuffle();
      index = 0;
    }
    return order[index];
  }

  // Строим табло: слово = группа ячеек, слова переносятся целиком на узких экранах.
  function buildBoard(text) {
    board.replaceChildren();
    const cells = [];
    const words = text.split(" ");

    words.forEach((word) => {
      const wordEl = document.createElement("span");
      wordEl.className = "board__word";

      for (const char of word) {
        const cell = document.createElement("span");
        cell.className = "board__cell";
        const glyph = document.createElement("span");
        glyph.className = "board__glyph";
        glyph.textContent = char;
        cell.appendChild(glyph);
        wordEl.appendChild(cell);
        cells.push({ glyph, target: char });
      }

      // Пробелы между словами задаёт flex-gap контейнера, поэтому отдельные
      // ячейки-пробелы не рисуем — иначе они «повисают» в конце строки при переносе.
      board.appendChild(wordEl);
    });

    return cells;
  }

  const timers = [];

  function clearTimers() {
    while (timers.length) {
      clearTimeout(timers.pop());
    }
  }

  function randomGlyph() {
    return FLIP_ALPHABET[Math.floor(Math.random() * FLIP_ALPHABET.length)];
  }

  function animateCell(cell, columnIndex) {
    const { glyph, target } = cell;
    const upper = target.toUpperCase();
    const startDelay = columnIndex * COLUMN_DELAY_MS;

    for (let step = 0; step < FLIP_STEPS; step += 1) {
      const isLast = step === FLIP_STEPS - 1;
      const at = startDelay + step * STEP_MS;
      timers.push(
        setTimeout(() => {
          if (isLast) {
            glyph.textContent = target;
            glyph.parentElement.classList.remove("is-flipping");
          } else {
            // На последних шагах приближаемся к цели, но держим листание живым.
            glyph.textContent =
              step > FLIP_STEPS - 3 && upper !== " " ? upper : randomGlyph();
            glyph.parentElement.classList.add("is-flipping");
          }
        }, at)
      );
    }
  }

  function render(location) {
    clearTimers();
    const cells = buildBoard(location);

    if (reduceMotion.matches) {
      cells.forEach((cell) => {
        cell.glyph.textContent = cell.target;
      });
    } else {
      cells.forEach((cell, columnIndex) => animateCell(cell, columnIndex));
    }
  }

  function showNext() {
    const location = getNextLocation();
    render(location);
    counter.textContent = `${index + 1} из ${order.length}`;
    liveLocation.textContent = location;
  }

  nextButton.addEventListener("click", showNext);

  document.addEventListener("keydown", (event) => {
    if (
      event.code === "Space" ||
      event.code === "Enter" ||
      event.code === "ArrowRight" ||
      event.key === "Enter"
    ) {
      // Не перехватываем активацию кнопки/ссылки клавиатурой — иначе двойная генерация.
      const active = document.activeElement;
      if (
        (event.code === "Space" || event.key === "Enter") &&
        active &&
        (active.tagName === "BUTTON" || active.tagName === "A")
      ) {
        return;
      }
      event.preventDefault();
      showNext();
    }
  });

  showNext();
})();
