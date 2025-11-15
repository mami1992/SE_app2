const MAX_SAVE_SIZE_MB = 5;
const volKey = (slot) => `se_${slot}_vol`; // 0.0〜1.0 を保存

function bytesToMB(bytes) {
  return bytes / (1024 * 1024);
}

/******************** 🔊 SEボタン機能（個別音量対応） ********************/
document.querySelectorAll(".se").forEach((se) => {
  const slot = se.dataset.slot;
  const playBtn = se.querySelector(".se-play");
  const setInput = se.querySelector('input[type="file"]');
  const resetBtn = se.querySelector(".reset-btn");
  const nameEl = se.querySelector(".se-name");

  // 音量UI
  const volSlider = se.querySelector(`.se-vol-slider[data-slot="${slot}"]`);
  const volValue = document.getElementById(`se-vol-value-${slot}`);

  let currentAudio = null;
  let isPlayingSE = false;

  // 音量の初期値（保存が無ければ 1.0）
  const savedVol = parseFloat(localStorage.getItem(volKey(slot)) ?? "1");
  if (volSlider) {
    const percent = Math.round(savedVol * 100);
    volSlider.value = percent;
    if (volValue) volValue.textContent = `${percent}%`;
  }

  // Audio を作る時に、保存済みの音量を適用
  const makeAudio = (src) => {
    const a = new Audio(src);
    a.volume = parseFloat(localStorage.getItem(volKey(slot)) ?? "1");
    return a;
  };

  // 保存済みの音源があれば読み込む
  const savedData = localStorage.getItem(`se_${slot}_data`);
  const savedName = localStorage.getItem(`se_${slot}_name`);
  if (savedData) {
    currentAudio = makeAudio(savedData);
    nameEl.textContent = savedName || "保存音源";
  } else {
    currentAudio = null;
    nameEl.textContent = "未割当";
  }

  // ▶️ 再生トグル
  playBtn.addEventListener("click", () => {
    if (!currentAudio) {
      alert("このSEボタンにはまだ音がセットされていません。");
      return;
    }
    if (!isPlayingSE) {
      currentAudio.currentTime = 0;
      currentAudio.play();
      isPlayingSE = true;
      playBtn.style.backgroundColor = "#99ff99";
    } else {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      isPlayingSE = false;
      playBtn.style.backgroundColor = "#ffcc66";
    }
    currentAudio.onended = () => {
      isPlayingSE = false;
      playBtn.style.backgroundColor = "#ffcc66";
    };
  });

  // 🎵 セット（音変更）
  setInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (bytesToMB(file.size) > MAX_SAVE_SIZE_MB) {
      alert("⚠️ ファイルが大きすぎます（5MB以下にしてください）");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      localStorage.setItem(`se_${slot}_data`, dataUrl);
      localStorage.setItem(`se_${slot}_name`, file.name);

      if (currentAudio && !currentAudio.paused) currentAudio.pause();
      currentAudio = makeAudio(dataUrl);
      nameEl.textContent = file.name;

      alert(`SE${slot} に「${file.name}」をセットしました！`);
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // 同じファイルを続けて選べるようにクリア
  });

  // 🔄 リセット（音源のみ空にし、音量は保持）
  resetBtn.addEventListener("click", () => {
    if (currentAudio && !currentAudio.paused) currentAudio.pause();
    localStorage.removeItem(`se_${slot}_data`);
    localStorage.removeItem(`se_${slot}_name`);
    currentAudio = null;
    nameEl.textContent = "未割当";
    playBtn.style.backgroundColor = "#ffcc66";
    alert(`SE${slot} を未割当へリセットしました（音量設定は保持）。`);
  });

  // 🔊 音量変更（0〜100 → 0.0〜1.0）
  if (volSlider) {
    volSlider.addEventListener("input", () => {
      const vol = Math.max(0, Math.min(100, parseInt(volSlider.value, 10))) / 100;
      localStorage.setItem(volKey(slot), String(vol));
      if (volValue) volValue.textContent = `${Math.round(vol * 100)}%`;
      if (currentAudio) currentAudio.volume = vol; // 再生中にも即反映
    });
  }
});

/******************** 🎶 プレイリスト機能（途中停止対応） ********************/
let playlist = [];
let plIsPlaying = false;   // ← グローバルの名前衝突を避けるためリネーム
let plIsLoop = false;
let plCurrentAudio = null;
let plCurrentIndex = 0;

const playlistEl = document.getElementById("playlist");
const statusEl = document.getElementById("status");

document.getElementById("fileInput").addEventListener("change", (e) => {
  const files = Array.from(e.target.files || []);
  for (const file of files) {
    playlist.push(file);
    const li = document.createElement("li");
    const nameSpan = document.createElement("span");
    nameSpan.textContent = file.name;
    const delBtn = document.createElement("button");
    delBtn.textContent = "❌ 削除";
    delBtn.onclick = () => {
      const idx = playlist.indexOf(file);
      if (idx > -1) {
        if (idx === plCurrentIndex && plCurrentAudio) plCurrentAudio.pause();
        playlist.splice(idx, 1);
        li.remove();
        updateStatus();
      }
    };
    li.appendChild(nameSpan);
    li.appendChild(delBtn);
    playlistEl.appendChild(li);
  }
  updateStatus();
  e.target.value = "";
});

// ▶️ 再生・再開
document.getElementById("play").addEventListener("click", async () => {
  if (plIsPlaying) return;
  if (playlist.length === 0) return alert("再生リストが空です");

  plIsPlaying = true;

  // 再開（ポーズからの続き）
  if (plCurrentAudio && plCurrentAudio.paused && plCurrentAudio.currentTime > 0) {
    plCurrentAudio.play();
    return;
  }

  // 途中の曲から再生を継続
  for (let i = plCurrentIndex; i < playlist.length; i++) {
    plCurrentIndex = i;
    const file = playlist[i];
    const url = URL.createObjectURL(file);
    plCurrentAudio = new Audio(url);
    await new Promise((resolve) => {
      plCurrentAudio.play();
      plCurrentAudio.onended = resolve;
    });
    if (!plIsPlaying) break; // 一時停止/停止された
  }

  // ループ再生
  while (plIsLoop && plIsPlaying) {
    plCurrentIndex = 0;
    for (let i = 0; i < playlist.length; i++) {
      plCurrentIndex = i;
      const file = playlist[i];
      const url = URL.createObjectURL(file);
      plCurrentAudio = new Audio(url);
      await new Promise((resolve) => {
        plCurrentAudio.play();
        plCurrentAudio.onended = resolve;
      });
      if (!plIsPlaying) break;
    }
  }

  plIsPlaying = false;
});

// ⏸ 一時停止
document.getElementById("pause").addEventListener("click", () => {
  if (plCurrentAudio && !plCurrentAudio.paused) {
    plCurrentAudio.pause();
    plIsPlaying = false;
  }
});

// ⏹ 停止（完全停止）
document.getElementById("stop").addEventListener("click", () => {
  if (plCurrentAudio) {
    plCurrentAudio.pause();
    plCurrentAudio.currentTime = 0;
  }
  plCurrentIndex = 0;
  plIsPlaying = false;
});

// 🔁 ループON/OFF
document.getElementById("loop").addEventListener("click", (e) => {
  plIsLoop = !plIsLoop;
  e.target.textContent = plIsLoop ? "🔁 ループ中" : "🔁 ループOFF";
});

// 🗑 全削除
document.getElementById("clear").addEventListener("click", () => {
  playlist = [];
  playlistEl.innerHTML = "";
  plCurrentIndex = 0;
  if (plCurrentAudio) plCurrentAudio.pause();
  updateStatus();
});

function updateStatus() {
  statusEl.textContent =
    playlist.length > 0 ? `再生リスト：${playlist.length}曲` : "再生リスト：なし";
}