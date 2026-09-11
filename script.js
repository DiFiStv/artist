let currentAudio = null;
let audioList = [];
const DEFAULT_VOLUME = 0.6;
let allData = null;
let storiesData = {};
let albumsArray = [];
let centerIndex = 0;

// Загружаем все данные параллельно
Promise.all([
    fetch('data.json').then(res => res.json()),
    fetch('me.json').then(res => res.json()),
    fetch('new.json').then(res => res.json()),
    fetch('stories.json').then(res => res.json())
]).then(([data, me, latest, stories]) => {
    allData = data;
    storiesData = stories;
    albumsArray = data.albums;

    initAbout(me);
    initLatestRelease(latest, data);
    initAlbumsCarousel();
}).catch(err => console.error("Ошибка загрузки данных:", err));

// 1. Переключение вкладок
document.querySelectorAll('.menu-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

// 2. Обо мне
function initAbout(meData) {
    document.getElementById('about-text').innerText = meData.text;
}

// 3. Крайний релиз
function initLatestRelease(latestData, data) {
    const container = document.getElementById('latest-track-container');
    let foundTrack = null;
    let foundAlbum = null;

    for (const album of data.albums) {
        const track = album.tracks.find(t => t.id === latestData.latestTrackId);
        if (track) {
            foundTrack = track;
            foundAlbum = album;
            break;
        }
    }

    if (foundTrack && foundAlbum) {
        container.innerHTML = `
            <p style="color:#aaa; margin-bottom:5px;">из альбома "${foundAlbum.title}"</p>
            <h3 style="margin:0 0 10px 0;">${foundTrack.title}</h3>
            <audio controls><source src="${foundTrack.src}" type="audio/mpeg"></audio>
        `;
        setupSingleAudio(container.querySelector('audio'));
    } else {
        container.innerHTML = "<p>Скоро...</p>";
    }
}

// 4. Карусель альбомов
function initAlbumsCarousel() {
    centerIndex = 0;
    renderCarousel();
}

function renderCarousel() {
    const carousel = document.getElementById('albums-carousel');
    carousel.innerHTML = '';

    const totalAlbums = albumsArray.length;

    for (let offset = -1; offset <= 1; offset++) {
        const albumIdx = (centerIndex + offset + totalAlbums) % totalAlbums;
        const album = albumsArray[albumIdx];

        const albumEl = document.createElement('div');
        albumEl.className = 'album';
        if (offset === 0) {
            albumEl.classList.add('active');
        } else {
            albumEl.classList.add('side');
        }

        albumEl.innerHTML = `
            <button class="info-btn" title="История альбома">i</button>
            <img src="${album.cover}" alt="${album.title}">
            <div class="album-title">${album.title}</div>
        `;

        albumEl.addEventListener('click', (e) => {
            if (e.target.classList.contains('info-btn')) return;

            if (offset === 0) {
                showTracks(album);
            } else if (offset === -1) {
                centerIndex = (centerIndex - 1 + totalAlbums) % totalAlbums;
                renderCarousel();
            } else if (offset === 1) {
                centerIndex = (centerIndex + 1) % totalAlbums;
                renderCarousel();
            }
        });

        albumEl.querySelector('.info-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openModal(album.title, storiesData[album.title] || "История создания этого альбома пока не добавлена.");
        });

        carousel.appendChild(albumEl);
    }

    showTracks(albumsArray[centerIndex]);
}

// 5. Показ треков (ЭТА ФУНКЦИЯ БЫЛА ПОТЕРЯНА!)
function showTracks(album) {
    const container = document.getElementById('tracks-container');

    let playingTrackSrc = null;
    let playingTrackTime = 0;
    if (currentAudio && !currentAudio.paused) {
        playingTrackSrc = currentAudio.src;
        playingTrackTime = currentAudio.currentTime;
    }

    container.innerHTML = `<h2>${album.title}</h2>` +
        album.tracks.map((track, i) => `
            <div class="track">
                <h3>${track.title}</h3>
                <audio data-index="${i}" data-src="${track.src}" controls>
                    <source src="${track.src}" type="audio/mpeg">
                </audio>
            </div>
        `).join('');

    setupAudioControls();

    if (playingTrackSrc) {
        const newAudioElements = Array.from(document.querySelectorAll('#tracks-container audio'));
        const restoredAudio = newAudioElements.find(a => {
            const audioSrc = a.src || a.querySelector('source')?.src;
            return audioSrc && playingTrackSrc &&
                   (audioSrc === playingTrackSrc ||
                    audioSrc.endsWith(playingTrackSrc.split('/').pop()));
        });

        if (restoredAudio) {
            restoredAudio.currentTime = playingTrackTime;
            restoredAudio.play().catch(() => {});
        }
    }
}

// 6. Управление аудио
function setupAudioControls() {
    audioList = Array.from(document.querySelectorAll('#tracks-container audio'));
    audioList.forEach((audio, index) => {
        audio.volume = DEFAULT_VOLUME;

        audio.addEventListener('play', () => {
            if (currentAudio && currentAudio !== audio) {
                currentAudio.pause();
            }
            currentAudio = audio;
        });

        audio.addEventListener('ended', () => {
            const nextAudio = audioList[index + 1];
            if (nextAudio) {
                nextAudio.volume = DEFAULT_VOLUME;
                nextAudio.play();
            }
        });
    });
}

function setupSingleAudio(audio) {
    audio.volume = DEFAULT_VOLUME;
    audio.addEventListener('play', () => {
        if (currentAudio && currentAudio !== audio) {
            currentAudio.pause();
        }
        currentAudio = audio;
    });
}

// 7. Модальное окно
const modal = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalText = document.getElementById('modal-text');

function openModal(title, text) {
    modalTitle.innerText = title;
    modalText.innerText = text;
    modal.classList.add('open');
}

document.querySelector('.close-modal').addEventListener('click', () => {
    modal.classList.remove('open');
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('open');
    }
});