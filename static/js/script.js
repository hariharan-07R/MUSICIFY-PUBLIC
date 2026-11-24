
document.addEventListener("DOMContentLoaded", () => {

    const audio = document.getElementById("audioPlayer");

    const searchInput = document.getElementById("songSearch");
    const searchButton = document.getElementById("searchButton");

    const onlineResults = document.getElementById("onlineSearchResults");

    const songTitle = document.getElementById("songTitle");
    const artistName = document.getElementById("artistName");
    const playerArtwork = document.getElementById("playerArtwork");

    const playButton = document.getElementById("playButton");
    const previousButton = document.getElementById("previousButton");
    const nextButton = document.getElementById("nextButton");

    const progressBar = document.getElementById("progressBar");
    const volumeBar = document.getElementById("volumeBar");

    const currentTime = document.getElementById("currentTime");
    const duration = document.getElementById("duration");

    const searchMessage = document.getElementById("searchMessage");
    const playerMessage = document.getElementById("playerMessage");

    const localSongs = window.MUSICIFY_SONGS || [];

    let playlist = [];
    let currentIndex = -1;
    let searchTimer = null;
    let isSearching = false;


    // =================================
    // FORMAT TIME
    // =================================

    function formatTime(seconds) {

        if (!Number.isFinite(seconds)) return "0:00";

        const minutes = Math.floor(seconds / 60);
        const remaining = Math.floor(seconds % 60);

        return `${minutes}:${String(remaining).padStart(2, "0")}`;
    }


    // =================================
    // DISPLAY MESSAGE
    // =================================

    function showPlayerMessage(message) {
        playerMessage.textContent = message;
    }


    // =================================
    // PLAY A SONG
    // =================================

    async function playSong(index) {

        if (index < 0 || index >= playlist.length) return;

        currentIndex = index;

        const song = playlist[index];

        audio.pause();
        audio.src = song.url;

        songTitle.textContent = song.title;
        artistName.textContent = song.artist;

        if (song.artwork) {

            playerArtwork.innerHTML = "";

            const img = document.createElement("img");
            img.src = song.artwork;
            img.alt = "Album artwork";

            playerArtwork.appendChild(img);

        } else {

            playerArtwork.textContent = "♫";
        }

        progressBar.value = 0;
        currentTime.textContent = "0:00";
        duration.textContent = "0:00";

        showPlayerMessage("Loading music...");

        try {

            await audio.play();

            playButton.textContent = "⏸";
            showPlayerMessage("");

        } catch (error) {

            playButton.textContent = "▶";

            showPlayerMessage(
                "Unable to play this song. Try another track."
            );

            console.error(error);
        }

    }


    // =================================
    // LOCAL SONG PLAYLIST
    // =================================

    function playLocalSong(index) {

        playlist = localSongs.map(song => ({
            title: song.name,
            artist: "Local Music",
            url: song.url,
            artwork: null,
            type: "local"
        }));

        playSong(index);
    }


    // =================================
    // ONLINE SONG PLAYLIST
    // =================================

    function playOnlineSong(index) {

        const onlineSongs = Array.from(
            onlineResults.querySelectorAll(".online-card")
        ).map(card => ({
            id: card.dataset.id,
            title: card.dataset.title,
            artist: card.dataset.artist,
            artwork: card.dataset.artwork || null,
            url: `/api/audius/stream/${encodeURIComponent(card.dataset.id)}`,
            type: "online"
        }));

        playlist = onlineSongs;

        playSong(index);
    }


    // =================================
    // SEARCH AUDIUS
    // =================================

    async function searchMusic() {

        const query = searchInput.value.trim();

        if (!query) {

            onlineResults.innerHTML =
                '<p class="empty-message">Enter a song or artist name.</p>';

            searchMessage.textContent = "";
            return;
        }

        if (isSearching) return;

        isSearching = true;

        searchButton.disabled = true;
        searchButton.textContent = "Searching...";

        searchMessage.textContent = "Searching online music...";

        onlineResults.innerHTML =
            '<p class="empty-message">Please wait...</p>';

        try {

            const response = await fetch(
                `/api/audius/search?q=${encodeURIComponent(query)}`
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Search failed");
            }

            onlineResults.innerHTML = "";

            const tracks = result.data || [];

            if (tracks.length === 0) {

                onlineResults.innerHTML =
                    '<p class="empty-message">No playable songs found.</p>';

                searchMessage.textContent = "Try another song or artist.";
                return;
            }

            tracks.forEach((track, index) => {

                const card = document.createElement("article");

                card.className = "music-card online-card";

                card.dataset.id = track.id;
                card.dataset.title = track.title;
                card.dataset.artist = track.artist;
                card.dataset.artwork = track.artwork || "";

                const artwork = document.createElement("div");
                artwork.className = "music-art";

                if (track.artwork) {

                    const img = document.createElement("img");
                    img.src = track.artwork;
                    img.alt = "Song artwork";
                    img.loading = "lazy";

                    artwork.appendChild(img);

                } else {

                    artwork.textContent = "♫";
                }

                const title = document.createElement("h3");
                title.textContent = track.title;

                const artist = document.createElement("p");
                artist.textContent = track.artist;

                const button = document.createElement("button");
                button.className = "online-play-button";
                button.textContent = "▶ Play";

                button.addEventListener("click", () => {
                    playOnlineSong(index);
                });

                card.appendChild(artwork);
                card.appendChild(title);
                card.appendChild(artist);
                card.appendChild(button);

                onlineResults.appendChild(card);

            });

            searchMessage.textContent =
                `${tracks.length} songs found.`;

        } catch (error) {

            console.error(error);

            onlineResults.innerHTML =
                '<p class="empty-message">Music search failed. Please try again.</p>';

            searchMessage.textContent = error.message;

        } finally {

            isSearching = false;

            searchButton.disabled = false;
            searchButton.textContent = "Search";
        }
    }


    // =================================
    // SEARCH BUTTON
    // =================================

    searchButton.addEventListener("click", searchMusic);


    // =================================
    // SEARCH WHILE TYPING
    // =================================

    searchInput.addEventListener("input", () => {

        clearTimeout(searchTimer);

        if (!searchInput.value.trim()) {
            onlineResults.innerHTML =
                '<p class="empty-message">Search for online music.</p>';
            searchMessage.textContent = "";
            return;
        }

        searchTimer = setTimeout(searchMusic, 700);

    });


    // =================================
    // LOCAL SONG CLICK
    // =================================

    document.querySelectorAll(".local-play-button").forEach(button => {

        button.addEventListener("click", () => {

            const card = button.closest(".local-card");

            const index = Number(card.dataset.songIndex);

            playLocalSong(index);

        });

    });


    // =================================
    // PLAY / PAUSE
    // =================================

    playButton.addEventListener("click", async () => {

        if (!audio.src) {

            if (localSongs.length > 0) {
                playLocalSong(0);
            } else {
                showPlayerMessage("Search and select a song first.");
            }

            return;
        }

        if (audio.paused) {

            try {
                await audio.play();
                playButton.textContent = "⏸";
                showPlayerMessage("");
            } catch (error) {
                showPlayerMessage("Unable to play this song.");
            }

        } else {

            audio.pause();
            playButton.textContent = "▶";
        }

    });


    // =================================
    // NEXT SONG
    // =================================

    nextButton.addEventListener("click", () => {

        if (playlist.length === 0) return;

        const next = (currentIndex + 1) % playlist.length;

        playSong(next);
    });


    // =================================
    // PREVIOUS SONG
    // =================================

    previousButton.addEventListener("click", () => {

        if (playlist.length === 0) return;

        const previous =
            (currentIndex - 1 + playlist.length) % playlist.length;

        playSong(previous);
    });


    // =================================
    // AUDIO EVENTS
    // =================================

    audio.addEventListener("play", () => {
        playButton.textContent = "⏸";
    });

    audio.addEventListener("pause", () => {
        playButton.textContent = "▶";
    });

    audio.addEventListener("loadedmetadata", () => {
        duration.textContent = formatTime(audio.duration);
    });

    audio.addEventListener("timeupdate", () => {

        if (!Number.isFinite(audio.duration) || audio.duration === 0) {
            return;
        }

        progressBar.value =
            (audio.currentTime / audio.duration) * 100;

        currentTime.textContent = formatTime(audio.currentTime);

    });

    audio.addEventListener("ended", () => {

        if (playlist.length > 0 && currentIndex >= 0) {

            const next = (currentIndex + 1) % playlist.length;

            playSong(next);

        }

    });

    audio.addEventListener("error", () => {

        if (audio.currentSrc) {
            showPlayerMessage("Audio unavailable. Try another song.");
        }

    });


    // =================================
    // PROGRESS BAR
    // =================================

    progressBar.addEventListener("input", () => {

        if (Number.isFinite(audio.duration) && audio.duration > 0) {

            audio.currentTime =
                (progressBar.value / 100) * audio.duration;

        }

    });


    // =================================
    // VOLUME
    // =================================

    audio.volume = Number(volumeBar.value);

    volumeBar.addEventListener("input", () => {

        audio.volume = Number(volumeBar.value);

    });

});
