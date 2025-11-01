const MAX_SAVE_SIZE_MB = 5;

function bytesToMB(bytes) {
  return bytes / (1024 * 1024);
}

document.querySelectorAll(".se").forEach((se) => {
  const slot = se.dataset.slot;
  const playBtn = se.querySelector(".se-play");
  const setInput = se.querySelector('input[type="file"]');
  const resetBtn = se.querySelector(".reset-btn");
  const nameEl = se.querySelector(".se-name");

  let currentAudio = null;
  let isPlaying = false;

  // 保存データ読み込み
  const savedData = localStorage.getItem(`se_${slot}_data`);
  const savedName = localStorage.getItem(`se_${slot}_name`);

  if (savedData) {
    currentAudio = new Audio(savedData);
    nameEl.textContent = savedName;
  } else {
    nameEl.textContent = "未割当";
  }

  // ▶️ 再生・停止
  playBtn.addEventListener("click", () => {
    if (!currentAudio) {
      alert("このSEボタンにはまだ音がセットされていません。");
      return;
    }

    if (!isPlaying) {
      currentAudio.currentTime = 0;
      currentAudio.play();
      isPlaying = true;
      playBtn.style.backgroundColor = "#99ff99";
    } else {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      isPlaying = false;
      playBtn.style.backgroundColor = "#ffcc66";
    }

    currentAudio.onended = () => {
      isPlaying = false;
      playBtn.style.backgroundColor = "#ffcc66";
    };
  });

  // 🎵 セット
  setInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (bytesToMB(file.size) > MAX_SAVE_SIZE_MB) {
      alert("⚠️ ファイルが大きすぎます（5MB以下にしてください）");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      localStorage.setItem(`se_${slot}_data`, dataUrl);
      localStorage.setItem(`se_${slot}_name`, file.name);

      currentAudio = new Audio(dataUrl);
      nameEl.textContent = file.name;

      alert(`SE${slot} に「${file.name}」をセットしました！`);
    };
    reader.readAsDataURL(file);
  });

  // 🔄 リセット
  resetBtn.addEventListener("click", () => {
    localStorage.removeItem(`se_${slot}_data`);
    localStorage.removeItem(`se_${slot}_name`);
    currentAudio = null;
    nameEl.textContent = "未割当";
    playBtn.style.backgroundColor = "#ffcc66";
  });
});

/******************** 🎶 プレイリスト機能（途中停止対応） ********************/
let playlist = [];
let isPlaying = false;
let isLoop = false;
let currentAudio = null;
let currentIndex = 0;

const playlistEl = document.getElementById("playlist");
const statusEl = document.getElementById("status");

document.getElementById("fileInput").addEventListener("change", (e) => {
  const files = Array.from(e.target.files);
  for (const file of files) {
    playlist.push(file);
    const li = document.createElement("li");
    const nameSpan = document.createElement("span");
    nameSpan.textContent = file.name;
    const delBtn = document.createElement("button");
    delBtn.textContent = "❌ 削除";
    delBtn.onclick = () => {
      const idx = playlist.indexOf(file);
      if (idx === currentIndex && currentAudio) currentAudio.pause();
      playlist.splice(idx, 1);
      li.remove();
      updateStatus();
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
  if (isPlaying) return;
  if (playlist.length === 0) return alert("再生リストが空です");

  isPlaying = true;

  if (currentAudio && currentAudio.paused && currentAudio.currentTime > 0) {
    currentAudio.play();
    return;
  }

  for (let i = currentIndex; i < playlist.length; i++) {
    currentIndex = i;
    const file = playlist[i];
    const url = URL.createObjectURL(file);
    currentAudio = new Audio(url);
    await new Promise((resolve) => {
      currentAudio.play();
      currentAudio.onended = resolve;
    });
    if (!isPlaying) break;
  }

  while (isLoop && isPlaying) {
    currentIndex = 0;
    for (let i = 0; i < playlist.length; i++) {
      currentIndex = i;
      const file = playlist[i];
      const url = URL.createObjectURL(file);
      currentAudio = new Audio(url);
      await new Promise((resolve) => {
        currentAudio.play();
        currentAudio.onended = resolve;
      });
      if (!isPlaying) break;
    }
  }

  isPlaying = false;
});

// ⏸ 一時停止
document.getElementById("pause").addEventListener("click", () => {
  if (currentAudio && !currentAudio.paused) {
    currentAudio.pause();
    isPlaying = false;
  }
});

// ⏹ 停止
document.getElementById("stop").addEventListener("click", () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  currentIndex = 0;
  isPlaying = false;
});

// 🔁 ループON/OFF
document.getElementById("loop").addEventListener("click", (e) => {
  isLoop = !isLoop;
  e.target.textContent = isLoop ? "🔁 ループ中" : "🔁 ループOFF";
});

// 🗑 全削除
document.getElementById("clear").addEventListener("click", () => {
  playlist = [];
  playlistEl.innerHTML = "";
  currentIndex = 0;
  if (currentAudio) currentAudio.pause();
  updateStatus();
});

function updateStatus() {
  statusEl.textContent =
    playlist.length > 0
      ? `再生リスト：${playlist.length}曲`
      : "再生リスト：なし";
}