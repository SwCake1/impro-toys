(() => {
  const topics = window.RAP_BATTLE_TOPICS;
  const leftSide = document.querySelector("#leftSide");
  const rightSide = document.querySelector("#rightSide");
  const liveTopic = document.querySelector("#liveTopic");
  const topicButton = document.querySelector("#topicButton");
  const matchup = document.querySelector(".matchup");
  const battleSound = new Audio("./scratch.mp3");

  let previousIndex = -1;
  battleSound.preload = "auto";

  function playBattleSound() {
    battleSound.pause();
    battleSound.currentTime = 0;

    const playback = battleSound.play();
    if (playback) {
      playback.catch(() => {});
    }
  }

  function getNextIndex() {
    if (previousIndex === -1) {
      return Math.floor(Math.random() * topics.length);
    }

    if (topics.length === 1) {
      return 0;
    }

    const candidate = Math.floor(Math.random() * (topics.length - 1));
    return candidate >= previousIndex ? candidate + 1 : candidate;
  }

  function showNextTopic() {
    const nextIndex = getNextIndex();
    const topic = topics[nextIndex];

    previousIndex = nextIndex;
    leftSide.textContent = topic.left;
    rightSide.textContent = topic.right;
    liveTopic.textContent = `${topic.left} против ${topic.right}`;
    matchup.dataset.topicIndex = String(nextIndex);

    matchup.classList.remove("is-changing");
    void matchup.offsetWidth;
    matchup.classList.add("is-changing");
    playBattleSound();
  }

  if (
    !Array.isArray(topics) ||
    topics.length === 0 ||
    !leftSide ||
    !rightSide ||
    !liveTopic ||
    !topicButton ||
    !matchup
  ) {
    if (topicButton) {
      topicButton.disabled = true;
      topicButton.textContent = "ТЕМЫ НЕ ЗАГРУЗИЛИСЬ";
    }
    return;
  }

  topicButton.addEventListener("click", showNextTopic);
})();
