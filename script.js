let currentAudio = null;
let audioList = [];

const DEFAULT_VOLUME = 0.6;

fetch('data.json')
  .then(res => res.json())
  .then(data => init(data));

function init(data) {
  const albumsContainer = document.getElementById('albums');
  const tracksContainer = document.getElementById('tracks');

  data.albums.forEach((album, index) => {
    const albumEl = document.createElement('div');
    albumEl.className = 'album';

    albumEl.innerHTML = `
      <img src="${album.cover}" alt="${album.title}">
      <div class="album-title">${album.title}</div>
    `;

    albumEl.onclick = () => showTracks(album);
    albumsContainer.appendChild(albumEl);

    if (index === 0) showTracks(album);
  });

  function showTracks(album) {
    tracksContainer.innerHTML = `
      <h2>${album.title}</h2>
      ${album.tracks.map((track, i) => `
        <div class="track">
          <h3>${track.title}</h3>
          <audio data-index="${i}" controls>
            <source src="${track.src}" type="audio/mpeg">
          </audio>
        </div>
      `).join('')}
    `;

    setupAudioControls();
  }
}

function setupAudioControls() {
  audioList = Array.from(document.querySelectorAll('audio'));

  audioList.forEach((audio, index) => {
    // стартовая громкость
    audio.volume = DEFAULT_VOLUME;

    // при запуске — останавливаем остальные
    audio.addEventListener('play', () => {
      if (currentAudio && currentAudio !== audio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      currentAudio = audio;
    });

    // автопереход к следующему
    audio.addEventListener('ended', () => {
      const nextAudio = audioList[index + 1];
      if (nextAudio) {
        nextAudio.volume = DEFAULT_VOLUME;
        nextAudio.play();
      }
    });
  });
}
