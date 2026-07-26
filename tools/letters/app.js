(() => {
  "use strict";

  const ALPHABET = [..."АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ"];
  const VOWELS = new Set([..."АЕЁИОУЫЭЮЯ"]);
  const SPECIAL = new Set(["Ы", "Ъ", "Ь"]);
  const CONSONANTS = new Set(ALPHABET.filter((letter) => !VOWELS.has(letter) && !SPECIAL.has(letter)));

  const press = document.querySelector("#press");
  const display = document.querySelector("#letterDisplay");
  const ghost = document.querySelector("#letterGhost");
  const prompt = document.querySelector("#letterPrompt");
  const liveResult = document.querySelector("#liveResult");
  const generateButton = document.querySelector("#generateButton");
  const queueCount = document.querySelector("#queueCount");
  const poolLabel = document.querySelector("#poolLabel");
  const settingsButton = document.querySelector("#settingsButton");
  const settingsDialog = document.querySelector("#settingsDialog");
  const settingsClose = document.querySelector("#settingsClose");
  const hideSpecialInput = document.querySelector("#hideSpecial");
  const modeInputs = [...document.querySelectorAll('input[name="letterMode"]')];
  const modeCounts = [...document.querySelectorAll("[data-mode-count]")];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (
    !press ||
    !display ||
    !ghost ||
    !prompt ||
    !liveResult ||
    !generateButton ||
    !queueCount ||
    !poolLabel ||
    !settingsButton ||
    !settingsDialog ||
    !settingsClose ||
    !hideSpecialInput ||
    modeInputs.length !== 3
  ) {
    return;
  }

  let mode = "all";
  let hideSpecial = true;
  let deck = [];
  let lastLetter = null;
  let pendingActions = 0;
  let isProcessing = false;
  let audioContext = null;
  let focusBeforeDialog = settingsButton;

  function lettersFor(selectedMode = mode, shouldHideSpecial = hideSpecial) {
    let letters;

    if (selectedMode === "vowels") {
      letters = ALPHABET.filter((letter) => VOWELS.has(letter));
    } else if (selectedMode === "consonants") {
      letters = ALPHABET.filter((letter) => CONSONANTS.has(letter));
    } else {
      letters = [...ALPHABET];
    }

    return shouldHideSpecial ? letters.filter((letter) => !SPECIAL.has(letter)) : letters;
  }

  function shuffle(values) {
    const result = [...values];

    for (let index = result.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [result[index], result[target]] = [result[target], result[index]];
    }

    return result;
  }

  function buildDeck() {
    deck = shuffle(lettersFor());

    if (lastLetter && deck.length > 1 && deck[deck.length - 1] === lastLetter) {
      [deck[0], deck[deck.length - 1]] = [deck[deck.length - 1], deck[0]];
    }
  }

  function drawLetter() {
    if (deck.length === 0) {
      buildDeck();
    }

    const nextLetter = deck.pop();
    lastLetter = nextLetter;
    return nextLetter;
  }

  function updatePoolLabels() {
    const activeCount = lettersFor().length;
    const lastDigit = activeCount % 10;
    const lastTwoDigits = activeCount % 100;
    const noun = lastDigit === 1 && lastTwoDigits !== 11
      ? "литера"
      : lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)
        ? "литеры"
        : "литер";
    poolLabel.textContent = `${activeCount} ${noun}`;

    modeCounts.forEach((count) => {
      const countMode = count.dataset.modeCount;
      count.textContent = String(lettersFor(countMode, hideSpecial).length);
    });
  }

  function resetDeck() {
    deck = [];
    updatePoolLabels();
  }

  function setVisualLetter(letter) {
    prompt.hidden = true;
    display.textContent = letter;
    ghost.textContent = letter;
  }

  function updateQueueBadge() {
    queueCount.hidden = pendingActions === 0;
    queueCount.textContent = `+${pendingActions}`;
    settingsButton.disabled = isProcessing || pendingActions > 0;
  }

  function wait(duration) {
    return new Promise((resolve) => window.setTimeout(resolve, duration));
  }

  function getAudioContext() {
    if (audioContext) {
      return audioContext;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    try {
      audioContext = new AudioContextClass();
      return audioContext;
    } catch {
      return null;
    }
  }

  function prepareAudio() {
    const context = getAudioContext();
    if (context?.state === "suspended") {
      context.resume().catch(() => {});
    }
  }

  function playTypeStrike() {
    try {
      const context = getAudioContext();
      if (!context || context.state !== "running") {
        return;
      }

      const now = context.currentTime;
      const duration = 0.11;
      const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
      const samples = buffer.getChannelData(0);

      for (let index = 0; index < samples.length; index += 1) {
        const envelope = Math.pow(1 - index / samples.length, 3.5);
        samples[index] = (Math.random() * 2 - 1) * envelope;
      }

      const noise = context.createBufferSource();
      const noiseFilter = context.createBiquadFilter();
      const noiseGain = context.createGain();
      noise.buffer = buffer;
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(720, now);
      noiseFilter.Q.setValueAtTime(0.75, now);
      noiseGain.gain.setValueAtTime(0.12, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      noise.connect(noiseFilter).connect(noiseGain).connect(context.destination);

      const click = context.createOscillator();
      const clickGain = context.createGain();
      click.type = "triangle";
      click.frequency.setValueAtTime(1850, now);
      click.frequency.exponentialRampToValueAtTime(720, now + 0.055);
      clickGain.gain.setValueAtTime(0.045, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      click.connect(clickGain).connect(context.destination);

      noise.start(now);
      noise.stop(now + duration);
      click.start(now);
      click.stop(now + 0.075);
    } catch {
      // Звуковой отклик не должен мешать выдаче буквы.
    }
  }

  async function animateResult(letter) {
    const activeLetters = lettersFor();

    if (reduceMotion.matches) {
      press.dataset.state = "stamped";
      setVisualLetter(letter);
      playTypeStrike();
      liveResult.textContent = `Буква ${letter}`;
      await wait(150);
      press.dataset.state = "idle";
      return;
    }

    press.dataset.state = "cycling";
    prompt.hidden = true;

    for (let step = 0; step < 4; step += 1) {
      const preview = activeLetters[Math.floor(Math.random() * activeLetters.length)];
      setVisualLetter(preview);
      await wait(42 + step * 7);
    }

    press.dataset.state = "stamped";
    setVisualLetter(letter);
    playTypeStrike();
    liveResult.textContent = `Буква ${letter}`;
    await wait(310);
    press.dataset.state = "idle";
  }

  async function processQueue() {
    if (isProcessing || pendingActions === 0) {
      return;
    }

    isProcessing = true;
    pendingActions -= 1;
    updateQueueBadge();

    const letter = drawLetter();
    await animateResult(letter);

    isProcessing = false;
    updateQueueBadge();

    if (pendingActions > 0) {
      processQueue();
    }
  }

  function requestGeneration() {
    prepareAudio();
    pendingActions += 1;
    updateQueueBadge();
    processQueue();
  }

  function openSettings() {
    if (settingsButton.disabled) {
      return;
    }

    focusBeforeDialog = document.activeElement || settingsButton;

    if (typeof settingsDialog.showModal === "function") {
      settingsDialog.showModal();
    } else {
      settingsDialog.setAttribute("open", "");
    }

    settingsDialog.querySelector('input[name="letterMode"]:checked')?.focus();
  }

  function closeSettings() {
    if (typeof settingsDialog.close === "function" && settingsDialog.open) {
      settingsDialog.close();
    } else {
      settingsDialog.removeAttribute("open");
      focusBeforeDialog?.focus();
    }
  }

  modeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) {
        return;
      }

      mode = input.value;
      resetDeck();
    });
  });

  hideSpecialInput.addEventListener("change", () => {
    hideSpecial = hideSpecialInput.checked;
    resetDeck();
  });

  generateButton.addEventListener("click", requestGeneration);
  settingsButton.addEventListener("click", openSettings);
  settingsClose.addEventListener("click", closeSettings);

  settingsDialog.addEventListener("click", (event) => {
    if (event.target === settingsDialog) {
      closeSettings();
    }
  });

  settingsDialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSettings();
    }
  });

  settingsDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeSettings();
  });

  settingsDialog.addEventListener("close", () => {
    focusBeforeDialog?.focus();
  });

  document.addEventListener("keydown", (event) => {
    if (settingsDialog.open) {
      return;
    }

    if (event.code !== "Space" && event.key !== "Enter") {
      return;
    }

    const active = document.activeElement;
    if (active?.matches("button, a, input, select, textarea, [role='button']")) {
      return;
    }

    event.preventDefault();
    requestGeneration();
  });

  updatePoolLabels();
})();
