document.addEventListener("DOMContentLoaded", () => {
    const soundButtons = document.getElementById("soundButtons");
    const fileInput = document.getElementById("fileInput");
    const uploadBtn = document.getElementById("uploadBtn");

    fetch('/api/sounds')
        .then(response => response.json())
        .then(sounds => {
            sounds.forEach(sound => {
                const button = document.createElement("button");
                // Substituir "-" por " " e capitalizar cada palavra  
                const displayName = sound.name.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
                button.textContent = displayName;
                button.className = "button";
                button.addEventListener("click", () => playSound(sound.id));
                soundButtons.appendChild(button);
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
                        alert("Failed to upload sound.");
                    }
                });
        }
    });
});  
