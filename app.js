document.getElementById('selectFolderBtn').addEventListener('click', selectFolder);
document.getElementById('addMarkerBtn').addEventListener('click', addMarker);
document.getElementById('prevBtn').addEventListener('click', () => changeFile(-1));
document.getElementById('nextBtn').addEventListener('click', () => changeFile(1));
document.getElementById('fileSelect').addEventListener('change', () => loadAudioFile(document.getElementById('fileSelect').value));
document.getElementById('exportBtn').addEventListener('click', exportData);

document.getElementById('goodBtn').addEventListener('click', () => markFile('good'));
document.getElementById('badBtn').addEventListener('click', () => markFile('bad'));

let currentFileIndex = -1;
let markers = {};
let fileStatus = {};
let files = [];
let audioDirectoryHandle;

async function selectFolder() {
    try {
        audioDirectoryHandle = await window.showDirectoryPicker();
        files = [];
        await traverseDirectory(audioDirectoryHandle);
        populateFileSelect();
    } catch (err) {
        console.error('Error selecting folder:', err);
    }
}

async function traverseDirectory(directoryHandle) {
    for await (const [name, handle] of directoryHandle) {
        if (handle.kind === 'file' && isAudioFile(name)) {
            files.push({ name, handle });
        } else if (handle.kind === 'directory') {
            await traverseDirectory(handle);
        }
    }
}

function isAudioFile(fileName) {
    return fileName.endsWith('.mp3') || fileName.endsWith('.wav') || fileName.endsWith('.ogg') || fileName.endsWith('.flac');
}

function populateFileSelect() {
    const fileSelect = document.getElementById('fileSelect');
    fileSelect.innerHTML = '<option value="" disabled selected>Select an audio file</option>';
    files.forEach((file, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = file.name;
        fileSelect.appendChild(option);
    });
}

async function loadAudioFile(index) {
    currentFileIndex = parseInt(index, 10);
    const audioPlayer = document.getElementById('audioPlayer');
    const file = files[currentFileIndex];
    const fileData = await file.handle.getFile();
    const fileURL = URL.createObjectURL(fileData);

    audioPlayer.src = fileURL;
    document.getElementById('fileTitle').value = file.name;
    loadMarkers(file.name);

    // Highlight file status
    const goodBtn = document.getElementById('goodBtn');
    const badBtn = document.getElementById('badBtn');
    goodBtn.disabled = false;
    badBtn.disabled = false;
    goodBtn.classList.remove('selected');
    badBtn.classList.remove('selected');
    document.getElementById('fileTitle').classList.remove('good', 'bad');
    if (fileStatus[file.name] === 'good') {
        goodBtn.classList.add('selected');
        document.getElementById('fileTitle').classList.add('good');
    } else if (fileStatus[file.name] === 'bad') {
        badBtn.classList.add('selected');
        document.getElementById('fileTitle').classList.add('bad');
    }
}

function loadMarkers(fileName) {
    const markerTableBody = document.getElementById('markerTable').querySelector('tbody');
    markerTableBody.innerHTML = '';

    (markers[fileName] || []).forEach((marker, index) => {
        const listItem = document.createElement('tr');
        listItem.className = 'marker';
        listItem.innerHTML = `
            <td>${formatTime(marker.time)}</td>
            <td contenteditable="true" onblur="updateMarkerDescription('${fileName}', ${index}, this)">${marker.description}</td>
            <td><button onclick="deleteMarker('${fileName}', ${index}')">Delete</button></td>
        `;
        markerTableBody.appendChild(listItem);
    });
}

function addMarker() {
    const audioPlayer = document.getElementById('audioPlayer');
    const currentTime = audioPlayer.currentTime;
    const description = document.getElementById('markerDescription').value;
    const fileName = files[currentFileIndex].name;

    if (!markers[fileName]) {
        markers[fileName] = [];
    }
    markers[fileName].push({ time: currentTime, description });

    const markerTableBody = document.getElementById('markerTable').querySelector('tbody');
    const listItem = document.createElement('tr');
    listItem.className = 'marker';
    listItem.innerHTML = `
        <td>${formatTime(currentTime)}</td>
        <td contenteditable="true" onblur="updateMarkerDescription('${fileName}', ${markers[fileName].length - 1}, this)">${description}</td>
        <td><button onclick="deleteMarker('${fileName}', ${markers[fileName].length - 1})">Delete</button></td>
    `;
    markerTableBody.appendChild(listItem);

    document.getElementById('markerDescription').value = '';
    updateDataTable();
}

function markFile(status) {
    const fileName = files[currentFileIndex].name;
    fileStatus[fileName] = status;
    const goodBtn = document.getElementById('goodBtn');
    const badBtn = document.getElementById('badBtn');
    goodBtn.classList.remove('selected');
    badBtn.classList.remove('selected');
    document.getElementById('fileTitle').classList.remove('good', 'bad');
    if (status === 'good') {
        goodBtn.classList.add('selected');
        document.getElementById('fileTitle').classList.add('good');
    } else if (status === 'bad') {
        badBtn.classList.add('selected');
        document.getElementById('fileTitle').classList.add('bad');
    }
    updateDataTable();
}

function changeFile(direction) {
    const newIndex = currentFileIndex + direction;
    if (newIndex >= 0 && newIndex < files.length) {
        loadAudioFile(newIndex);
        document.getElementById('fileSelect').value = newIndex;
    }
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

function updateDataTable() {
    const dataTableBody = document.getElementById('dataTable').querySelector('tbody');
    dataTableBody.innerHTML = '';

    files.forEach(file => {
        const status = fileStatus[file.name] || 'not reviewed';
        const markerDescriptions = (markers[file.name] || []).map(marker => `${formatTime(marker.time)}: ${marker.description}`).join('<br>');

        const listItem = document.createElement('tr');
        listItem.innerHTML = `
            <td>${file.name}</td>
            <td class="${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</td>
            <td>${markerDescriptions}</td>
        `;
        dataTableBody.appendChild(listItem);
    });
}

function exportData() {
    const reviewData = {
        markers: markers,
        status: fileStatus
    };

    const blob = new Blob([JSON.stringify(reviewData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'review_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function deleteMarker(fileName, index) {
    if (markers[fileName]) {
        markers[fileName].splice(index, 1);
        loadMarkers(fileName);
        updateDataTable();
    }
}

function updateMarkerDescription(fileName, index, element) {
    if (markers[fileName] && markers[fileName][index]) {
        markers[fileName][index].description = element.textContent;
        updateDataTable();
    }
}

// Add event listeners to mark buttons
document.getElementById('goodBtn').addEventListener('click', () => markFile('good'));
document.getElementById('badBtn').addEventListener('click', () => markFile('bad'));