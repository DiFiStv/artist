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
      ${album.tracks.map(track => `
        <div class="track">
          <h3>${track.title}</h3>
          <audio controls style="width:100%">
            <source src="${track.src}" type="audio/mpeg">
          </audio>
        </div>
      `).join('')}
    `;
  }
}
