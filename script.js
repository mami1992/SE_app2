const seButtons = document.querySelectorAll(".se");
const MAX_SAVE_SIZE_MB = 5;

function bytesToMB(bytes) {
  return bytes / (1024 * 1024);
}

seButtons.forEach((se) => {
  const slot = se.dataset.slot;
  const defaultSrc = se.dataset.default;
  const playBtn = se.querySelector(".se-play");
  const setInput = se.querySelector('input[type="file"]');
  const resetBtn = se.querySelector(".reset-btn");
  const nameEl = se.querySelector(".se-name");

  // 保存済み音源をチェック
  const saved = localStorage.getItem(`se_${slot}_data`);
  const savedName = localStorage.getItem(`se_${slot}_name`);
  let audio = new Audio(saved ? saved : defaultSrc);
  let playing = false;
  nameEl.textContent = savedName || defaultSrc.split("/").pop();

  // 再生・停止
  playBtn.addEventListener("click", () => {
    if (!audio) return;
    if (!playing) {
      audio.currentTime = 0;
      audio.play();
      playing = true;
      playBtn.style.backgroundColor = "#99ff99";
    } else {
      audio.pause();
      audio.currentTime = 0;
      playing = false;
      playBtn.style.backgroundColor = "#ffcc66";
    }
    audio.onended = () => {
      playing = false;
      playBtn.style.backgroundColor = "#ffcc66";
    };
  });

  // セット（音変更）
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
      audio = new Audio(dataUrl);
      nameEl.textContent = file.name;
      alert(`SE${slot} に「${file.name}」をセットしました！`);
    };
    reader.readAsDataURL(file);
  });

  // リセット（初期音に戻す）
  resetBtn.addEventListener("click", () => {
    localStorage.removeItem(`se_${slot}_data`);
    localStorage.removeItem(`se_${slot}_name`);
    audio = new Audio(defaultSrc);
    nameEl.textContent = defaultSrc.split("/").pop();
    alert(`SE${slot} を初期音に戻しました。`);
  });
});

/******************** 🎶 プレイリスト機能 ********************/
let playlist = [];
let isPlaying = false;
let isLoop = false;
let currentAudio = null;

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
      playlist = playlist.filter((f) => f !== file);
      li.remove();
      updateStatus();
    };
    li.appendChild(nameSpan);
    li.appendChild(delBtn);
    playlistEl.appendChild(li);
  }
  updateStatus();
});

document.getElementById("play").addEventListener("click", async () => {
  if (isPlaying || playlist.length === 0) return;
  isPlaying = true;
  do {
    for (const f of playlist) {
      const url = URL.createObjectURL(f);
      currentAudio = new Audio(url);
      await new Promise((resolve) => {
        currentAudio.play();
        currentAudio.onended = resolve;
      });
      if (!isPlaying) break;
    }
  } while (isLoop && isPlaying);
  isPlaying = false;
});

document.getElementById("stop").addEventListener("click", () => {
  isPlaying = false;
  if (currentAudio) currentAudio.pause();
});

document.getElementById("loop").addEventListener("click", (e) => {
  isLoop = !isLoop;
  e.target.textContent = isLoop ? "🔁 ループ中" : "🔁 ループOFF";
});

document.getElementById("clear").addEventListener("click", () => {
  playlist = [];
  playlistEl.innerHTML = "";
  updateStatus();
});

function updateStatus() {
  statusEl.textContent =
    playlist.length > 0
      ? `再生リスト：${playlist.length}曲`
      : "再生リスト：なし";
}
