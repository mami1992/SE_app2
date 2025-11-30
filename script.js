/******************** 共通 ********************/
const MAX_SAVE_SIZE_MB = 5;
const volKey = (slot) => `se_${slot}_vol`; // 0.0〜1.0 を保存
function bytesToMB(bytes) {
  return bytes / (1024 * 1024);
}

/*************************************************
 * 🔊 SEボタン（1〜8）ローカル保存＋音量保存
*************************************************/
document.querySelectorAll(".se").forEach((se) => {
  const slot = se.dataset.slot;
  const playBtn = se.querySelector(".se-play");
  const setInput = se.querySelector('input[type="file"]');
  const resetBtn = se.querySelector(".reset-btn");
  const nameEl = se.querySelector(".se-name");

  const volSlider = se.querySelector(`.se-vol-slider[data-slot="${slot}"]`);
  const volValue = document.getElementById(`se-vol-value-${slot}`);

  let currentAudio = null;
  let isPlayingSE = false;

  // 🔊 保存済み音量の適用
  const savedVol = parseFloat(localStorage.getItem(volKey(slot)) ?? "1");
  if (volSlider) {
    volSlider.value = Math.round(savedVol * 100);
    if (volValue) volValue.textContent = `${Math.round(savedVol * 100)}%`;
  }

  const makeAudio = (src) => {
    const a = new Audio(src);
    a.volume = parseFloat(localStorage.getItem(volKey(slot)) ?? "1");
    return a;
  };

  // 🔊 保存済み音源の復元
  const savedData = localStorage.getItem(`se_${slot}_data`);
  const savedName = localStorage.getItem(`se_${slot}_name`);
  if (savedData) {
    currentAudio = makeAudio(savedData);
    nameEl.textContent = savedName ?? "保存音源";
  } else {
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

  // 🎵 セット
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
    e.target.value = "";
  });

  // 🔄 リセット
  resetBtn.addEventListener("click", () => {
    if (currentAudio && !currentAudio.paused) currentAudio.pause();
    localStorage.removeItem(`se_${slot}_data`);
    localStorage.removeItem(`se_${slot}_name`);
    currentAudio = null;
    nameEl.textContent = "未割当";
    playBtn.style.backgroundColor = "#ffcc66";
  });

  // 🔊 音量変更
  if (volSlider) {
    volSlider.addEventListener("input", () => {
      const vol = parseInt(volSlider.value, 10) / 100;
      localStorage.setItem(volKey(slot), String(vol));
      if (volValue) volValue.textContent = `${Math.round(vol * 100)}%`;
      if (currentAudio) currentAudio.volume = vol;
    });
  }
});

/*************************************************
 * 🎶 プレイリスト（複数曲・音量・削除・前後・シャッフル）
*************************************************/
const fileInput = document.getElementById('fileInput');
const listEl = document.getElementById('playlist');
const statusEl = document.getElementById('status');

const btnPrev = document.getElementById('prev');
const btnPlay = document.getElementById('play');
const btnPause = document.getElementById('pause');
const btnStop = document.getElementById('stop');
const btnNext = document.getElementById('next');
const btnShuffle = document.getElementById('shuffle');
const btnSongLoop = document.getElementById('songloop');
const btnLoop = document.getElementById('loop');
const btnClear = document.getElementById('clear');

let playlist = [];
let currentIndex = -1;

let isLoop = false;
let isShuffle = false;
let isSongLoop = false;

const player = new Audio();

/************************************
 * 🎵 曲追加（複数追加OK）
 ************************************/
fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files || []);

  files.forEach(f => {
    const url = URL.createObjectURL(f);
    playlist.push({
      name: f.name,
      url: url,
      volume: 1.0
    });
  });

  renderList();
  updateStatus();
  fileInput.value = "";
});

/************************************
 * ▶️ 再生ボタン（続きから再生対応）
 ************************************/
btnPlay.addEventListener('click', () => {
  if (playlist.length === 0) return;

  // 🔵 一時停止 → 再開
  if (player.src && currentIndex !== -1 && player.paused) {
    player.play();
    updateStatus(`再生中：${playlist[currentIndex].name}`);
    return;
  }

  // 🔵 初回または曲切り替え
  if (currentIndex === -1) currentIndex = 0;
  playCurrent();
});

/************************************
 * 一時停止
 ************************************/
btnPause.addEventListener('click', () => {
  player.pause();
  updateStatus('(一時停止)');
});

/************************************
 * 停止
 ************************************/
btnStop.addEventListener('click', stopPlayback);
function stopPlayback() {
  player.pause();
  player.currentTime = 0;
  updateStatus('(停止)');
  renderList();
}

/************************************
 * 次の曲
 ************************************/
btnNext.addEventListener('click', () => goNext(false));

function goNext(triggeredByEnded) {
  if (playlist.length === 0) return;

  if (isShuffle) {
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * playlist.length);
    } while (nextIndex === currentIndex && playlist.length > 1);
    currentIndex = nextIndex;
    playCurrent();
    return;
  }

  currentIndex++;
  if (currentIndex >= playlist.length) {
    if (isLoop) currentIndex = 0;
    else {
      if (triggeredByEnded) stopPlayback();
      currentIndex = playlist.length - 1;
      return;
    }
  }
  playCurrent();
}

/************************************
 * 前の曲
 ************************************/
btnPrev.addEventListener('click', () => goPrev());

function goPrev() {
  if (playlist.length === 0) return;

  if (isShuffle) {
    let prevIndex;
    do {
      prevIndex = Math.floor(Math.random() * playlist.length);
    } while (prevIndex === currentIndex && playlist.length > 1);
    currentIndex = prevIndex;
    playCurrent();
    return;
  }

  currentIndex--;
  if (currentIndex < 0) {
    if (isLoop) currentIndex = playlist.length - 1;
    else {
      currentIndex = 0;
      return;
    }
  }
  playCurrent();
}

/************************************
 * シャッフル
 ************************************/
btnShuffle.addEventListener('click', () => {
  isShuffle = !isShuffle;
  btnShuffle.textContent = isShuffle ? '🔀 シャッフルON' : '🔀 シャッフルOFF';
});

/************************************
 * 単曲ループ
 ************************************/
btnSongLoop.addEventListener('click', () => {
  isSongLoop = !isSongLoop;
  player.loop = isSongLoop;
  btnSongLoop.textContent = isSongLoop ? '🔂 単曲ループON' : '🔂 単曲ループOFF';
});

/************************************
 * プレイリストループ
 ************************************/
btnLoop.addEventListener('click', () => {
  isLoop = !isLoop;
  btnLoop.textContent = isLoop ? '🔁 プレイリストループON' : '🔁 プレイリストループOFF';
});

/************************************
 * 全削除
 ************************************/
btnClear.addEventListener('click', () => {
  stopPlayback();
  clearPlaylist();
  renderList();
  updateStatus();
  fileInput.value = '';
});

function clearPlaylist() {
  playlist.forEach(t => URL.revokeObjectURL(t.url));
  playlist = [];
  currentIndex = -1;
}

/************************************
 * 曲終了時
 ************************************/
player.addEventListener('ended', () => {
  if (isSongLoop) return;
  goNext(true);
});

/************************************
 * 曲を再生
 ************************************/
function playCurrent() {
  if (currentIndex < 0 || currentIndex >= playlist.length) return;

  const item = playlist[currentIndex];
  player.src = item.url;
  player.volume = item.volume ?? 1;
  player.play();

  renderList();
  updateStatus(`再生中：${item.name}`);
}

/************************************
 * プレイリスト描画（音量＋削除）
 ************************************/
function renderList() {
  listEl.innerHTML = '';

  playlist.forEach((track, i) => {
    const li = document.createElement('li');
    li.dataset.index = i;

    const nameSpan = document.createElement('span');
    nameSpan.textContent = track.name;

    const volSlider = document.createElement('input');
    volSlider.type = 'range';
    volSlider.min = 0;
    volSlider.max = 100;
    volSlider.value = Math.round((track.volume ?? 1) * 100);
    volSlider.style.width = '80px';

    volSlider.addEventListener('input', () => {
      track.volume = volSlider.value / 100;
      if (i === currentIndex) player.volume = track.volume;
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '削除';
    deleteBtn.addEventListener('click', () => {
      URL.revokeObjectURL(track.url);
      playlist.splice(i, 1);

      if (i === currentIndex) {
        stopPlayback();
        currentIndex = -1;
      } else if (i < currentIndex) {
        currentIndex--;
      }

      renderList();
      updateStatus();
    });

    if (i === currentIndex && !player.paused) li.classList.add('active');

    li.appendChild(nameSpan);
    li.appendChild(volSlider);
    li.appendChild(deleteBtn);

    listEl.appendChild(li);
  });
}

/************************************
 * 再生ステータス表示
 ************************************/
function updateStatus(extra = '') {
  if (playlist.length === 0) {
    statusEl.textContent = '再生リスト：なし';
    return;
  }
  const now = (currentIndex >= 0 && playlist[currentIndex])
    ? playlist[currentIndex].name : '未選択';
  statusEl.textContent = `再生リスト：${playlist.length}曲 / 現在：${now} ${extra}`;
}
