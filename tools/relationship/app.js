(() => {
  const relationships = window.RELATIONSHIPS;
  const card = document.querySelector("#card");
  const bondLabel = document.querySelector("#bondLabel");
  const liveResult = document.querySelector("#liveResult");
  const newButton = document.querySelector("#newButton");
  const backButton = document.querySelector("#backButton");

  if (
    !Array.isArray(relationships) ||
    relationships.length === 0 ||
    !card ||
    !bondLabel ||
    !liveResult ||
    !newButton ||
    !backButton
  ) {
    if (newButton) {
      newButton.disabled = true;
      newButton.querySelector(".rel-primary__text").textContent =
        "Отношения не загрузились";
    }
    return;
  }

  const REBUILD_MS = 440;

  // Колода ещё не показанных в текущем цикле отношений.
  let deck = [];
  // Последний показанный результат — нужен, чтобы новый цикл не начался с повтора.
  let current = null;
  // Ровно один шаг назад: предыдущий результат и колода на момент его показа.
  let previous = null;
  let rebuildTimer = 0;

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
    deck = shuffle(relationships);

    // Новый цикл не должен открыться тем же отношением, что закрыло предыдущий.
    if (current && relationships.length > 1 && deck[deck.length - 1] === current) {
      const swapWith = Math.floor(Math.random() * (deck.length - 1));
      const tmp = deck[deck.length - 1];
      deck[deck.length - 1] = deck[swapWith];
      deck[swapWith] = tmp;
    }
  }

  function takeNext() {
    if (deck.length === 0) {
      refillDeck();
    }
    return deck.pop();
  }

  function render(relationship) {
    card.dataset.state = "result";
    bondLabel.textContent = relationship.label;

    // На экране остаётся только формулировка связи; роли по-прежнему
    // проговариваются вспомогательным технологиям.
    if (relationship.both) {
      liveResult.textContent = `${relationship.label}. Оба игрока — ${relationship.both}.`;
    } else {
      liveResult.textContent =
        `${relationship.label}. Игрок 1 — ${relationship.a}, игрок 2 — ${relationship.b}.`;
    }

    // Перезапуск анимации проявления карточки: класс снимается по таймеру,
    // поэтому следующая генерация не ждёт окончания перехода.
    card.classList.remove("is-swapping");
    void card.offsetWidth;
    card.classList.add("is-swapping");

    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => {
      card.classList.remove("is-swapping");
    }, REBUILD_MS);
  }

  function showNext() {
    const relationship = takeNext();

    // Возврат отдаёт предыдущий результат вместе с колодой того момента, чтобы
    // показанные записи не вернулись в текущий цикл.
    previous = current ? { relationship: current, deck: deck.slice() } : null;
    current = relationship;

    render(relationship);
    backButton.disabled = previous === null;
  }

  function showPrevious() {
    if (!previous) {
      return;
    }

    current = previous.relationship;
    deck = previous.deck;
    previous = null;

    render(current);
    backButton.disabled = true;
  }

  newButton.addEventListener("click", showNext);
  backButton.addEventListener("click", showPrevious);

  document.addEventListener("keydown", (event) => {
    if (event.code !== "Space" && event.key !== "Enter") {
      return;
    }

    // Не перехватываем активацию кнопки/ссылки клавиатурой — иначе двойная генерация.
    const active = document.activeElement;
    if (active && (active.tagName === "BUTTON" || active.tagName === "A")) {
      return;
    }

    event.preventDefault();
    showNext();
  });
})();
