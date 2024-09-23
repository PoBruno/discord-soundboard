document.addEventListener("DOMContentLoaded", () => {
    const soundButtons = document.getElementById("soundButtons");
    const fileInput = document.getElementById("fileInput");
    const uploadBtn = document.getElementById("uploadBtn");
    const toggleVoiceBtn = document.getElementById("toggleVoiceBtn");
    const channelSelect = document.getElementById("channelSelect");
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    let isBotInVoiceChannel = false;
    let selectedChannelId = '';

    // Função para alternar entre as abas  
    function openTab(tabName) {
        tabContents.forEach(content => {
            content.classList.remove('active');
        });

        tabButtons.forEach(button => {
            button.classList.remove('active');
        });

        document.getElementById(tabName).classList.add('active');
        document.querySelector(`.tab-button[data-tab="${tabName}"]`).classList.add('active');
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            openTab(button.getAttribute('data-tab'));
        });
    });

    // Função para preencher a lista de canais de voz  
    function populateVoiceChannels() {
        fetch('/api/voice-channels')
            .then(response => response.json())
            .then(channels => {
                channels.forEach(channel => {
                    const option = document.createElement('option');
                    option.value = channel.id;
                    option.textContent = channel.name;
                    channelSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Failed to fetch voice channels:', error);
            });
    }

    // Preencher a lista de canais de voz ao carregar a página  
    populateVoiceChannels();

    // Verificar o status do bot ao carregar a página  
    function checkVoiceStatus() {
        fetch('/api/voice-status')
            .then(response => response.json())
            .then(status => {
                if (status.connected) {
                    isBotInVoiceChannel = true;
                    toggleVoiceBtn.textContent = "Leave";
                    selectedChannelId = status.channelId;
                    channelSelect.value = status.channelId;
                } else {
                    isBotInVoiceChannel = false;
                    toggleVoiceBtn.textContent = "Join";
                }
            })
            .catch(error => {
                console.error('Failed to check voice status:', error);
            });
    }

    checkVoiceStatus();

    channelSelect.addEventListener('change', (event) => {
        selectedChannelId = event.target.value;
    });

    fetch('/api/sounds')
        .then(response => response.json())
        .then(sounds => {
            sounds.forEach(sound => {
                const buttonContainer = document.createElement("div");
                buttonContainer.className = "button-container";

                const button = document.createElement("button");
                const displayName = sound.name.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
                button.textContent = displayName;
                button.className = "button";
                button.addEventListener("click", () => playSound(sound.id));

                const menuButton = document.createElement("button");
                menuButton.textContent = "☰"; // Icon for menu  
                menuButton.className = "menu-button";
                menuButton.addEventListener("click", () => {
                    buttonContainer.classList.toggle("show");
                });

                const options = document.createElement("div");
                options.className = "options";

                const renameInput = document.createElement("input");
                renameInput.type = "text";
                renameInput.placeholder = "New name";
                renameInput.className = "rename-input";

                const renameBtn = document.createElement("button");
                renameBtn.textContent = "Rename";
                renameBtn.className = "rename-btn";
                renameBtn.addEventListener("click", () => renameSound(sound.name, renameInput.value));

                const deleteBtn = document.createElement("button");
                deleteBtn.textContent = "Delete";
                deleteBtn.className = "delete-btn";
                deleteBtn.addEventListener("click", () => deleteSound(sound.name));

                options.appendChild(renameInput);
                options.appendChild(renameBtn);
                options.appendChild(deleteBtn);

                buttonContainer.appendChild(button);
                buttonContainer.appendChild(menuButton);
                buttonContainer.appendChild(options);
                soundButtons.appendChild(buttonContainer);
            });
        });

    function playSound(soundId) {
        fetch(`/api/play-sound`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ soundId })
        });
    }

    function renameSound(oldName, newName) {
        fetch('/api/rename-sound', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ oldName, newName })
        }).then(response => response.json())
            .then(data => {
                if (data.success) {
                    location.reload(); // Reload to show updated name  
                } else {
                    alert("Failed to rename sound: " + data.error);
                }
            });
    }

    function deleteSound(name) {
        fetch('/api/delete-sound', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        }).then(response => response.json())
            .then(data => {
                if (data.success) {
                    location.reload(); // Reload to remove deleted sound  
                } else {
                    alert("Failed to delete sound: " + data.error);
                }
            });
    }

    uploadBtn.addEventListener("click", () => {
        const file = fileInput.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('sound', file);

            fetch('/api/upload-sound', {
                method: 'POST',
                body: formData
            }).then(response => response.json())
                .then(data => {
                    if (data.success) {
                        location.reload(); // Reload to show new sound  
                    } else {
                        alert("Failed to upload sound: " + data.error);
                    }
                });
        } else {
            alert("Please select a .mp3 file to upload.");
        }
    });

    toggleVoiceBtn.addEventListener("click", () => {
        if (!selectedChannelId) {
            alert("Please select a voice channel first.");
            return;
        }

        if (isBotInVoiceChannel) {
            fetch('/api/leave-voice', { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        isBotInVoiceChannel = false;
                        toggleVoiceBtn.textContent = "Join";
                    } else {
                        alert("Failed to leave voice channel.");
                    }
                });
        } else {
            fetch('/api/join-voice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ channelId: selectedChannelId })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        isBotInVoiceChannel = true;
                        toggleVoiceBtn.textContent = "Leave";
                    } else {
                        alert("Failed to join voice channel.");
                    }
                });
        }
    });
});  
