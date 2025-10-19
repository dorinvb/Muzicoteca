/* script.js - Musicoteca (Last.fm API) - Stilizat Filmoteca, Doar Albume */
const API_KEY = "652c14677b5a1b0e9371e76b68b0a832";
const API_BASE = "https://ws.audioscrobbler.com/2.0/";
const jsonOpts = "&format=json";

// Elemente DOM
const genreSelect = document.getElementById('genre-select');
const albumsEl = document.getElementById('content-list'); 
const resultsTitleDetails = document.getElementById('current-title-details');

const detailPageEl = document.getElementById('detail-page'); // Modalul (Filmoteca)
const modalDetailsEl = document.getElementById('modal-details'); // Conținutul modalului
const backButtonEl = document.getElementById('back-button'); // Butonul de închidere


// --- Utilități ---

function el(tag, cls, html){ 
  const d = document.createElement(tag); 
  if(cls) d.className = cls; 
  if(html) d.innerHTML = html; 
  return d; 
}

function clear(node){ 
  node.innerHTML = ''; 
}

/**
 * Generează un link extern de căutare pentru album pe diverse platforme (doar pictograma).
 */
function createExternalLink(platform, artist, album) {
    let url, icon, title;
    const searchAlbum = encodeURIComponent(`${artist} ${album}`);

    switch (platform.toLowerCase()) {
        case 'youtube':
            url = `https://www.youtube.com/results?search_query=${searchAlbum} full album`;
            icon = '▶️';
            title = 'YouTube';
            break;
        case 'spotify':
            url = `https://www.google.com/search?q=spotify+${searchAlbum}`;
            icon = '🟢';
            title = 'Spotify';
            break;
        case 'deezer':
            url = `https://www.deezer.com/search/${searchAlbum}/album`;
            icon = '🟦';
            title = 'Deezer';
            break;
        case 'tidal':
            url = `https://listen.tidal.com/search?query=${searchAlbum}&type=albums`;
            icon = '💎';
            title = 'Tidal';
            break;
        case 'qobuz':
            url = `https://www.qobuz.com/search?q=${searchAlbum}&i=album`; 
            icon = '🎼';
            title = 'Qobuz';
            break;
        default:
            return '';
    }
    // Returăm doar pictograma. Titlul este folosit ca alt-text.
    return `<a class="external-link" target="_blank" rel="noopener" href="${url}" title="Caută pe ${title}">${icon}</a>`;
}

// --- Logică de Selecție ---

/**
 * Gestionează schimbarea selecției de gen și încarcă top albumele.
 */
function handleSelectionChange() {
    const tag = genreSelect.value;
    
    if (!tag) {
        albumsEl.innerHTML = '<div class="empty">Selectează un gen pentru a vedea rezultatele.</div>';
        resultsTitleDetails.textContent = '';
        return;
    }
    
    // Setează titlul corect
    const tagDisplay = (tag === 'music') ? 'Toate genurile' : tag.charAt(0).toUpperCase() + tag.slice(1);
    resultsTitleDetails.textContent = `pentru Genul: ${tagDisplay}`;
    
    // Acum se încarcă DOAR Albumele
    loadTopAlbumsForTag(tag, 50);
}

// --- Încărcare Date Last.fm ---

// 1. Populează selectorul de genuri cu opțiunea prestabilită
async function loadGenresForSelect() {
  genreSelect.innerHTML = '<option value="" disabled selected>⏳ Încarc genuri...</option>';
  try{
    const res = await fetch(`${API_BASE}?method=chart.gettoptags&api_key=${API_KEY}${jsonOpts}&limit=40`);
    const data = await res.json();
    const tags = data.tags?.tag || [];
    
    // Adaugă opțiunea "Toate genurile" ca opțiune selectată implicit
    genreSelect.innerHTML = '<option value="music" selected>Toate genurile</option>'; 

    if(!tags.length){ 
        genreSelect.innerHTML += '<option value="" disabled>Nu am găsit alte genuri</option>';
        return; 
    }
    
    tags.forEach(t=>{
      if(!t.name || t.name === 'music') return; 
      const capitalizedName = t.name.charAt(0).toUpperCase() + t.name.slice(1);
      const option = el('option', '', capitalizedName);
      option.value = t.name;
      genreSelect.appendChild(option);
    });
    
    // Asigură că selectorul are valoarea prestabilită și declanșează încărcarea
    genreSelect.value = 'music';
    handleSelectionChange(); 
    
  }catch(e){
    genreSelect.innerHTML = '<option value="" disabled selected>Eroare la încărcarea genurilor</option>';
    console.error("Eroare la Last.fm chart.gettoptags:", e);
  }
}

// 2. Load top albums
async function loadTopAlbumsForTag(tag, limit=50){
  albumsEl.innerHTML = `<div class="loading"><i class="fas fa-spinner fa-spin"></i> Se încarcă top ${limit} albume pentru «${tag}»...</div>`;
  
  try{
    const res = await fetch(`${API_BASE}?method=tag.gettopalbums&tag=${encodeURIComponent(tag)}&api_key=${API_KEY}${jsonOpts}&limit=${limit}`);
    const data = await res.json();
    clear(albumsEl);
    albumsEl.className = 'content-list';
    const albums = data.albums?.album || [];
    
    if(!albums.length){ 
      albumsEl.appendChild(el('div','empty',`Nu am găsit albume pentru genul «${tag}».`)); 
      return; 
    }
    
    albums.slice(0,limit).forEach(a=>{
      const imageArray = a.image || [];
      const bestImage = imageArray.find(img => img.size === 'extralarge' && img['#text']) || imageArray[imageArray.length - 1];
      const cover = (bestImage && bestImage['#text']) || 'https://via.placeholder.com/300x300/1a2b4a/ffffff?text=Imagine+indisponibilă';
      
      const albumCard = el('div','content-item');
      const albumName = a.name || 'Nume Necunoscut';
      const artist = a.artist?.name || 'Artist Necunoscut';
      
      // Am adaptat structura cardului la stilul Filmoteca (.content-info, h2, p)
      albumCard.innerHTML = `
        <img loading="lazy" src="${cover}" alt="${albumName} de ${artist}">
        <div class="content-info">
            <h2>${albumName}</h2>
            <p>${artist}</p>
        </div>
      `;
      albumCard.onclick = () => openAlbumModal(artist, albumName, cover);
      albumsEl.appendChild(albumCard);
    });
    
  }catch(e){
    clear(albumsEl);
    albumsEl.appendChild(el('div','empty','A apărut o eroare la încărcarea albumelor.'));
    console.error("Eroare la Last.fm tag.gettopalbums:", e);
  }
}

// --- Detalii Modal ---

async function openAlbumModal(artist, albumName, coverUrl) {
    clear(modalDetailsEl);
    modalDetailsEl.appendChild(el('div', 'loading', '<i class="fas fa-spinner fa-spin"></i> Se încarcă detalii...'));
    detailPageEl.classList.remove('hidden');

    try {
        const albumRes = await fetch(`${API_BASE}?method=album.getinfo&artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(albumName)}&api_key=${API_KEY}${jsonOpts}`);
        const albumData = await albumRes.json();
        
        clear(modalDetailsEl);

        const album = albumData.album;
        
        const releaseDate = album?.wiki?.published ? album.wiki.published.split(',')[0].trim() : 'Necunoscut';
        const summary = album?.wiki?.summary ? album.wiki.summary.replace(/<a href="[^"]*">Read more on Last.fm<\/a>/, '') : 'Descrierea albumului nu este disponibilă pe Last.fm.';
        const tags = album?.tags?.tag || [];
        const tracks = album?.tracks?.track || []; 
        
        const externalLinks = [
            createExternalLink('youtube', artist, albumName),
            createExternalLink('spotify', artist, albumName),
            createExternalLink('deezer', artist, albumName),
            createExternalLink('tidal', artist, albumName),
            createExternalLink('qobuz', artist, albumName),
        ].join('');
        
        const tracklistHtml = tracks.length > 0
            ? `<div class="tracklist">
                 <h3>Lista de melodii:</h3>
                 <ol>${tracks.map(t => `<li><strong>${t['@attr']?.rank}.</strong> ${t.name}</li>`).join('')}</ol>
               </div>`
            : `<div class="tracklist"><h3>Lista de melodii:</h3><p class="empty">Lista nu este disponibilă.</p></div>`;


        // Folosim clasa 'detail-header-music' pentru layout-ul specific de muzică
        modalDetailsEl.innerHTML = `
            <div class="detail-header-music"> 
                <div>
                    <img class="detail-poster" src="${coverUrl}" alt="${albumName} Poster">
                    <div class="external-links-container">
                        <h3>Ascultă pe:</h3>
                        ${externalLinks}
                    </div>
                </div>
                <div class="detail-info">
                    <h1 class="detail-title">${albumName}</h1>
                    <p><strong>Artist:</strong> ${artist}</p>
                    <p><strong>Anul Lansării:</strong> ${releaseDate}</p>
                    <hr>
                    ${tracklistHtml}
                    <hr>
                    <h3>Sinopsis</h3>
                    <p class="detail-overview">${summary}</p>
                    <h3>Genuri & Tag-uri:</h3>
                    ${tags.map(t => `<span class="genre-badge">${t.name}</span>`).join('') || '<p>Niciun tag.</p>'}
                    <p style="margin-top: 10px;" class="empty">Detalii complete pe <a target="_blank" href="${album.url}" style="color: #4dabf7; text-decoration: none;">Last.fm</a></p>
                </div>
            </div>
        `;

    } catch (e) {
        clear(modalDetailsEl);
        modalDetailsEl.innerHTML = '<p class="error">A apărut o eroare la încărcarea detaliilor.</p>';
        console.error("Eroare la Last.fm album.getinfo:", e);
    }
}


// --- Evenimente ---

// Ascultători pentru schimbarea selecției
genreSelect.addEventListener('change', handleSelectionChange);

// Butonul Inapoi din modal
backButtonEl.addEventListener('click', () => {
    detailPageEl.classList.add('hidden');
});

// Inițializare: Începe cu încărcarea genurilor.
document.addEventListener('DOMContentLoaded', () => {
    loadGenresForSelect();
});