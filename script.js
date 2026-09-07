let currentAudio = null;
let audioList = [];
const DEFAULT_VOLUME = 0.6;
let allData = null;
let storiesData = {};
let albumsArray = [];
let activeAlbumIndex = 0;
let currentPlayingTrackInfo = null;

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
    initAlbumsCarousel(data);
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
function initAlbumsCarousel(data) {
    const carousel = document.getElementById('albums-carousel');
    
    data.albums.forEach((album, index) => {
        const albumEl = document.createElement('div');
        albumEl.className = 'album';
        albumEl.dataset.index = index;
        albumEl.innerHTML = `
            <button class="info-btn" title="История альбома">i</button>
            <img src="${album.cover}" alt="${album.title}">
            <div class="album-title">${album.title}</div>
        `;
        
        albumEl.addEventListener('click', (e) => {
            if (e.target.classList.contains('info-btn')) return;
            
            const clickedIndex = parseInt(albumEl.dataset.index);
            setActiveAlbum(clickedIndex);
        });

        albumEl.querySelector('.info-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openModal(album.title, storiesData[album.title] || "История создания этого альбома пока не добавлена.");
        });

        carousel.appendChild(albumEl);
    });
    
    setActiveAlbum(0);
}

function setActiveAlbum(index) {
    // Сохраняем информацию о текущем играющем треке
    if (currentAudio && !currentAudio.paused) {
        const currentSrc = currentAudio.src || currentAudio.querySelector('source')?.src;
        currentPlayingTrackInfo = {
            src: currentSrc,
            currentTime: currentAudio.currentTime,
            wasPlaying: true
        };
    } else {
        currentPlayingTrackInfo = null;
    }
    
    activeAlbumIndex = index;
    const albums = document.querySelectorAll('.album');
    const totalAlbums = albums.length;
    
    albums.forEach((album, i) => {
        album.classList.remove('active', 'prev', 'next');
        
        const prevIndex = (index - 1 + totalAlbums) % totalAlbums;
        const nextIndex = (index + 1) % totalAlbums;
        
        if (i === index) {
            album.classList.add('active');
        } else if (i === prevIndex) {
            album.classList.add('prev');
        } else if (i === nextIndex) {
            album.classList.add('next');
        }
    });
    
    // Проверяем, нужно ли обновлять треки
    const tracksContainer = document.getElementById('tracks-container');
    const currentAlbumTitle = tracksContainer.querySelector('h2')?.textContent;
    
    if (currentAlbumTitle !== albumsArray[index].title) {
        showTracks(albumsArray[index]);
    }
}

function showTracks(album) {
    const container = document.getElementById('tracks-container');
    
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
    
    // Восстанавливаем воспроизведение, если был играющий трек
    if (currentPlayingTrackInfo && currentPlayingTrackInfo.wasPlaying) {
        const newAudioElements = Array.from(document.querySelectorAll('#tracks-container audio'));
        
        const restoredAudio = newAudioElements.find(a => {
            const audioSrc = a.src || a.querySelector('source')?.src;
            return audioSrc && currentPlayingTrackInfo.src && 
                   (audioSrc === currentPlayingTrackInfo.src || 
                    audioSrc.endsWith(currentPlayingTrackInfo.src.split('/').pop()));
        });
        
        if (restoredAudio) {
            restoredAudio.currentTime = currentPlayingTrackInfo.currentTime;
            restoredAudio.play().catch(() => {
                console.log('Автовоспроизведение заблокировано браузером');
            });
        }
    }
}

// 5. Управление аудио
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
        
        audio.addEventListener('pause', () => {
            if (currentAudio === audio) {
                currentPlayingTrackInfo = null;
            }
        });
        
        audio.addEventListener('ended', () => {
            currentPlayingTrackInfo = null;
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

// 6. Модальное окно
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