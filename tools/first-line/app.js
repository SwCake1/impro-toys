(() => {
  const tones = window.FIRST_LINE_TONES;
  const allLines = window.FIRST_LINES;

  const line = document.querySelector("#line");
  const lineText = document.querySelector("#lineText");
  const lineTone = document.querySelector("#lineTone");
  const toneFilter = document.querySelector("#toneFilter");
  const progress = document.querySelector("#progress");
  const liveResult = document.querySelector("#liveResult");
  const newButton = document.querySelector("#newButton");
  const stage = document.querySelector(".fl-page");

  if (
    !Array.isArray(tones) ||
    tones.length === 0 ||
    !Array.isArray(allLines) ||
    allLines.length === 0 ||
    !line ||
    !lineText ||
    !lineTone ||
    !toneFilter ||
    !progress ||
    !liveResult ||
    !newButton ||
    !stage
  ) {
    if (newButton) {
      newButton.disabled = true;
      const label = newButton.querySelector(".fl-primary__text");
      if (label) {
        label.textContent = "Реплики не загрузились";
      }
    }
    return;
  }

  const LIT_MS = 460;
  const DIM_MS = 150;

  // Подписи тонов по id — для показа тон-тега и объявления результата.
  const toneLabels = new Map(tones.map((tone) => [tone.id, tone.label]));

  // Оттенок луча под каждый тон: тёплый по умолчанию, свой акцент на группу.
  const toneBeam = {
    byt: "rgba(255, 214, 140, 0.16)",
    conflict: "rgba(255, 120, 120, 0.2)",
    rabota: "rgba(150, 176, 255, 0.18)",
    absurd: "rgba(180, 255, 190, 0.18)",
    romantika: "rgba(255, 150, 190, 0.2)",
    iskusstvo: "rgba(206, 168, 255, 0.18)",
    extreme: "rgba(255, 138, 120, 0.18)",
    emotion: "rgba(255, 206, 140, 0.2)",
  };
  const DEFAULT_BEAM = "rgba(255, 214, 140, 0.16)";

  // Активный фильтр: "all" или конкретный id тона.
  let activeTone = "all";
  // Реплики активной колоды (полная подборка или группа выбранного тона).
  let activeLines = allLines;
  // Перемешанная колода ещё не показанных в текущем цикле реплик.
  let deck = [];
  // Текущая реплика — чтобы новый цикл не начался с немедленного повтора.
  let current = null;
  // Сколько реплик показано в текущем цикле активной колоды.
  let shown = 0;
  let litTimer = 0;
  let dimTimer = 0;

  // --- Звук ----------------------------------------------------------------
  // Мягкий «вздох софита»: тёплый тон с плавным нарастанием и затуханием.
  // Звук — необязательная обратная связь и никогда не мешает кнопкам.

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let audioContext = null;

  function getAudioContext() {
    if (!AudioContextClass) {
      return null;
    }
    if (!audioContext) {
      audioContext = new AudioContextClass();
    }
    if (audioContext.state === "suspended") {
      const resume = audioContext.resume();
      if (resume && typeof resume.catch === "function") {
        resume.catch(() => {});
      }
    }
    return audioContext;
  }

  function playSpotlight() {
    try {
      const context = getAudioContext();
      if (!context) {
        return;
      }
      const now = context.currentTime;

      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.09, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      gain.connect(context.destination);

      // Два близких тона дают мягкое тёплое биение — как включение лампы.
      [196, 294].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, now);
        oscillator.frequency.linearRampToValueAtTime(frequency * 1.02, now + 0.5);
        const voiceGain = context.createGain();
        voiceGain.gain.setValueAtTime(index === 0 ? 1 : 0.6, now);
        oscillator.connect(voiceGain);
        voiceGain.connect(gain);
        oscillator.start(now);
        oscillator.stop(now + 0.62);
      });
    } catch (error) {
      // Тишина при сбое звука — интерфейс продолжает работать.
    }
  }

  // --- Колода --------------------------------------------------------------

  function shuffle(items) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = result[i];
      result[i] = result[j];
      result[j] = tmp;
    }
    return result;
  }

  function refillDeck() {
    deck = shuffle(activeLines);

    // Новый цикл не должен открыться той же репликой, что закрыла предыдущий.
    if (current && activeLines.length > 1 && deck[deck.length - 1] === current) {
      const swapWith = Math.floor(Math.random() * (deck.length - 1));
      const tmp = deck[deck.length - 1];
      deck[deck.length - 1] = deck[swapWith];
      deck[swapWith] = tmp;
    }
  }

  function takeNext() {
    if (deck.length === 0) {
      // Колода исчерпана: новый цикл, прогресс обнуляется.
      refillDeck();
      shown = 0;
    }
    shown += 1;
    return deck.pop();
  }

  // --- Отрисовка -----------------------------------------------------------

  function renderProgress() {
    if (shown === 0) {
      progress.textContent = "";
      return;
    }
    progress.textContent = `Показано ${shown} из ${activeLines.length}`;
  }

  function render(entry) {
    const toneLabel = toneLabels.get(entry.tone) || "";

    line.dataset.state = "result";
    lineText.textContent = entry.text;
    lineTone.textContent = toneLabel;
    lineTone.hidden = false;

    // Оттенок луча под тон текущей реплики.
    stage.style.setProperty("--fl-beam-soft", toneBeam[entry.tone] || DEFAULT_BEAM);

    liveResult.textContent = toneLabel
      ? `${entry.text} Тон: ${toneLabel}.`
      : entry.text;

    renderProgress();

    // На миг приглушаем луч, затем реплика «выходит на свет». Классы снимаются
    // по таймерам, поэтому следующая генерация не ждёт окончания перехода.
    stage.dataset.dimmed = "true";
    clearTimeout(dimTimer);
    dimTimer = setTimeout(() => {
      stage.dataset.dimmed = "false";
    }, DIM_MS);

    line.classList.remove("is-lit");
    void line.offsetWidth;
    line.classList.add("is-lit");
    clearTimeout(litTimer);
    litTimer = setTimeout(() => {
      line.classList.remove("is-lit");
    }, LIT_MS);
  }

  function showNext() {
    const entry = takeNext();
    current = entry;
    playSpotlight();
    render(entry);
  }

  // --- Фильтр по тону ------------------------------------------------------

  function selectTone(toneId) {
    if (toneId === activeTone) {
      return;
    }
    activeTone = toneId;
    activeLines =
      toneId === "all"
        ? allLines
        : allLines.filter((entry) => entry.tone === toneId);

    // Смена фильтра начинает новую колоду заново, прогресс обнуляется.
    current = null;
    deck = [];
    shown = 0;
    renderProgress();

    // Отражаем выбор на кнопках фильтра.
    toneFilter.querySelectorAll(".fl-tone").forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        button.dataset.tone === activeTone ? "true" : "false"
      );
    });
  }

  function buildToneFilter() {
    const options = [{ id: "all", label: "Все тоны" }, ...tones];
    options.forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "fl-tone";
      button.dataset.tone = option.id;
      button.textContent = option.label;
      button.setAttribute("aria-pressed", option.id === activeTone ? "true" : "false");
      button.addEventListener("click", () => selectTone(option.id));
      toneFilter.appendChild(button);
    });
  }

  // --- Управление ----------------------------------------------------------

  buildToneFilter();
  renderProgress();

  newButton.addEventListener("click", showNext);

  document.addEventListener("keydown", (event) => {
    if (event.code !== "Space" && event.key !== "Enter") {
      return;
    }

    // Не перехватываем активацию кнопки/ссылки клавиатурой — иначе двойной запуск.
    const active = document.activeElement;
    if (active && (active.tagName === "BUTTON" || active.tagName === "A")) {
      return;
    }

    event.preventDefault();
    showNext();
  });
})();
