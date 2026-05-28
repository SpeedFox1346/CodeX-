function setGameScale() {
  const sideMargin = 32;
  const topMargin = 16;
  const availableWidth = Math.max(320, window.innerWidth - sideMargin);
  const availableHeight = Math.max(320, window.innerHeight - topMargin - sideMargin);
  const scale = Math.min(1, availableWidth / BASE_GAME_WIDTH, availableHeight / BASE_GAME_HEIGHT);
  document.documentElement.style.setProperty("--game-scale", scale.toFixed(4));
  document.documentElement.style.setProperty("--scaled-game-width", `${BASE_GAME_WIDTH * scale}px`);
  document.documentElement.style.setProperty("--scaled-game-height", `${BASE_GAME_HEIGHT * scale}px`);
}

function volumeCurve(value) {
  return Math.pow(clamp(value, 0, 100) / 100, 1.6);
}

function applyAudioSettings() {
  if (masterGain) masterGain.gain.value = volumeCurve(audioSettings.master);
  if (bgmGain) bgmGain.gain.value = 0.36 * volumeCurve(audioSettings.bgm);
  if (seGain) seGain.gain.value = 0.9 * volumeCurve(audioSettings.se);
  Object.entries(volumeInputs).forEach(([key, input]) => {
    if (!input) return;
    input.value = audioSettings[key];
    volumeValueLabels[key].textContent = String(audioSettings[key]);
  });
}

function setupAudio() {
  if (!AudioContextClass) return null;
  if (!audioContext) {
    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    bgmGain = audioContext.createGain();
    seGain = audioContext.createGain();
    bgmGain.connect(masterGain);
    seGain.connect(masterGain);
    masterGain.connect(audioContext.destination);
    applyAudioSettings();
  }
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

function playTone(frequency, startTime, duration, type, volume, destination = masterGain) {
  if (!audioContext || !destination) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(gain);
  gain.connect(destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

function playDecisionSound() {
  const context = setupAudio();
  if (!context) return;
  const now = context.currentTime;
  playTone(880, now, 0.055, "square", 0.18, seGain);
  playTone(1320, now + 0.035, 0.05, "square", 0.12, seGain);
  updateBgm();
}

function bgmNotesForTrack(track) {
  if (track === "boss") {
    return {
      tempo: 190,
      lead: [196, 246.94, 293.66, 392, 369.99, 293.66, 246.94, 220],
      bass: [98, 98, 116.54, 116.54, 130.81, 130.81, 116.54, 87.31],
      type: "sawtooth",
    };
  }
  if (track === "battle") {
    return {
      tempo: 165,
      lead: [220, 277.18, 329.63, 392, 329.63, 277.18, 246.94, 293.66],
      bass: [110, 110, 130.81, 130.81, 146.83, 146.83, 130.81, 98],
      type: "sawtooth",
    };
  }
  if (track === "town") {
    return {
      tempo: 96,
      lead: [329.63, 392, 440, 392, 349.23, 392, 329.63, 293.66],
      bass: [164.81, 164.81, 196, 196, 174.61, 174.61, 146.83, 146.83],
      type: "sine",
    };
  }
  return {
    tempo: 112,
    lead: [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23],
    bass: [130.81, 130.81, 146.83, 146.83, 164.81, 164.81, 146.83, 146.83],
    type: "triangle",
  };
}

function stopBgm() {
  if (bgmTimer) {
    clearInterval(bgmTimer);
    bgmTimer = null;
  }
  bgmTrack = null;
}

function scheduleBgmStep(track) {
  if (!audioContext || !bgmGain) return;
  const data = bgmNotesForTrack(track);
  const beat = 60 / data.tempo;
  const now = audioContext.currentTime;
  const index = bgmStep % data.lead.length;
  playTone(data.lead[index], now, beat * 0.42, data.type, track === "battle" ? 0.09 : 0.07, bgmGain);
  if (index % 2 === 0) {
    playTone(data.bass[index], now, beat * 0.85, "square", track === "battle" ? 0.055 : 0.04, bgmGain);
  }
  bgmStep += 1;
}

function startBgm(track) {
  if (!setupAudio() || bgmTrack === track) return;
  stopBgm();
  bgmTrack = track;
  bgmStep = 0;
  const interval = (60 / bgmNotesForTrack(track).tempo) * 500;
  scheduleBgmStep(track);
  bgmTimer = setInterval(() => scheduleBgmStep(track), interval);
}

function updateBgm() {
  if (!audioContext) return;
  if (sceneMode === "battle") {
    startBgm(battleKind === "boss" ? "boss" : "battle");
    return;
  }
  startBgm(sceneMode === "town" ? "town" : "field");
}
