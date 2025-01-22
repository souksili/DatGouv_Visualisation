async function loadData() {
    try {
        const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vSd4HTeiECqX-S0Lt-grcZBPEZ9xpF5iCT76_0JtdWghXa2cVn4Ysf8DU8cK08bu4N-YMCbElEj6Xz8/pub?output=csv');
        const csv = await response.text();
        const data = Papa.parse(csv, { header: true, dynamicTyping: true }).data;
        console.log('Data loaded successfully:', data);
        return data;
    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
}

async function geocodeAddress(school) {
    try {
        const response = await fetch(`https://photon.komoot.io/api/?q=${school.Commune},${school.Département},France`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const geoData = await response.json();
        if (geoData.features.length > 0) {
            const lat = geoData.features[0].geometry.coordinates[1];
            const lon = geoData.features[0].geometry.coordinates[0];
            return { lat, lon };
        } else {
            console.warn(`No geo data found for ${school.Commune}, ${school.Département}`);
            return { lat: null, lon: null };
        }
    } catch (error) {
        console.error(`Error geocoding ${school.Commune}:`, error);
        return { lat: null, lon: null };
    }
}

function getColor(studentCount) {
    if (studentCount < 100) {
        return 'green';
    } else if (studentCount < 500) {
        return 'yellow';
    } else {
        return 'red';
    }
}

async function addCoordinatesToData(data, map) {
    for (let school of data) {
        const { lat, lon } = await geocodeAddress(school);
        school.Latitude = lat;
        school.Longitude = lon;

        const pointLng = parseFloat(school.Longitude);
        const pointLat = parseFloat(school.Latitude);
        const studentCount = school['Nombre total d\'élèves']; // Utilisez la colonne correcte pour le nombre d'élèves

        if (!isNaN(pointLng) && !isNaN(pointLat) && studentCount !== undefined) {
            const color = getColor(studentCount);
            L.circle([pointLat, pointLng], {
                color: color,
                fillColor: color,
                fillOpacity: 0.5,
                radius: 500
            }).addTo(map).bindPopup(`<b>${school.Commune}</b><br>${school.Département}<br>Élèves: ${studentCount}`);
            console.log(`Marker added for ${school.Commune}, ${school.Département} at (${pointLat}, ${pointLng}) with ${studentCount} students`);
        } else {
            console.warn(`Invalid data for ${school.Commune}: (${pointLng}, ${pointLat}, ${studentCount})`);
        }
    }
}

function initialize() {
    console.log('Initializing map...');
    const map = L.map('map').setView([46.603354, 1.888334], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    loadData().then(data => {
        addCoordinatesToData(data, map);
    }).catch(error => {
        console.error('Error loading data:', error);
    });
}

initialize();