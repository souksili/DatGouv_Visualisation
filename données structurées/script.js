async function loadData() {
    try {
        const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vRxYI0Ynud9Ihxuy9t7deptenjAPj6WobFEGcP4ykg1Li4mfrT4RKtfdWYJeu6eTZh7RsruevnRoaGP/pub?output=csv');
        const csv = await response.text();
        const data = Papa.parse(csv, { header: true, dynamicTyping: true }).data;
        console.log('Data loaded successfully:', data);
        return data;
    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
}

async function addMarker(map, school) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${school.Commune},${school.Département},France&format=json&limit=1`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const geoData = await response.json();
        if (geoData.length > 0) {
            const lat = geoData[0].lat;
            const lon = geoData[0].lon;
            L.marker([lat, lon]).addTo(map)
                .bindPopup(`<b>${school.Commune}</b><br>${school.Département}`);
            console.log(`Marker added for ${school.Commune}, ${school.Département} at (${lat}, ${lon})`);
        } else {
            console.warn(`No geo data found for ${school.Commune}, ${school.Département}`);
        }
    } catch (error) {
        console.error(`Error geocoding ${school.Commune}:`, error);
    }
}

function initialize() {
    console.log('Initializing map...');
    const map = L.map('map').setView([46.603354, 1.888334], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    loadData().then(data => {
        console.log('Processing data...');
        processData(data, map);
    }).catch(error => {
        console.error('Error loading data:', error);
    });
}

function processData(data, map) {
    const topLeftLat = 51.089136; // Coordonnées approximatives pour la France
    const topLeftLng = -5.072634;
    const bottomRightLat = 41.331532;
    const bottomRightLng = 9.560079;

    const gridWidth = bottomRightLng - topLeftLng;
    const gridHeight = topLeftLat - bottomRightLat;

    const resX = 50; // Résolution de la grille en X
    const resY = 100; // Résolution de la grille en Y

    const rectangleColors = new Array(resX * resY);
    const rectangleCounts = new Array(resX * resY);

    const cellWidth = gridWidth / resX;
    const cellHeight = gridHeight / resY;

    data.forEach(school => {
        const pointLng = parseFloat(school.Longitude); // Assurez-vous que vos données contiennent les coordonnées Longitude et Latitude
        const pointLat = parseFloat(school.Latitude);

        if (!isNaN(pointLng) && !isNaN(pointLat)) {
            const deltaPx = pointLng - topLeftLng;
            const deltaPy = topLeftLat - pointLat;
            const xPos = parseInt(deltaPx / cellWidth);
            const yPos = parseInt(deltaPy / cellHeight);
            const index = parseInt(xPos + yPos * resX);

            if (xPos >= 0 && yPos >= 0 && index <= (rectangleCounts.length - 1)) {
                if (typeof rectangleCounts[index] == 'undefined') {
                    rectangleCounts[index] = 1;
                } else {
                    rectangleCounts[index]++;
                }
                console.log(`Point ${school.Commune} added to grid cell (${xPos}, ${yPos})`);
            } else {
                console.warn(`Point ${school.Commune} is out of grid bounds`);
            }
        } else {
            console.warn(`Invalid coordinates for ${school.Commune}: (${pointLng}, ${pointLat})`);
        }
    });

    makeGrid(map, topLeftLat, topLeftLng, resX, resY, gridWidth, gridHeight, rectangleCounts);
}

function makeGrid(map, topLeftLat, topLeftLng, resX, resY, gridWidth, gridHeight, rectangleCounts) {
    const cellWidth = gridWidth / resX;
    const cellHeight = gridHeight / resY;

    map.on('tilesloaded', function() {
        console.log('Map tiles loaded, rendering grid...');
        let index = 0;
        for (let j = 1; j <= resY; j++) {
            for (let i = 1; i <= resX; i++) {
                if (typeof rectangleCounts[index] == 'undefined') {
                    rectangleCounts[index] = 0;
                }
                const crimeCount = rectangleCounts[index];

                const newLng = topLeftLng + cellWidth * i;
                const newLat = topLeftLat - cellHeight * j;
                const southWest = new L.LatLng(newLat, newLng - cellWidth);
                const northEast = new L.LatLng(newLat + cellHeight, newLng);
                const bounds = new L.LatLngBounds(southWest, northEast);

                const newHSLColor = computeHSLColor(crimeCount, resX, resY);
                const newHexColor = hslToHex(newHSLColor.h, newHSLColor.s, newHSLColor.l);

                const rectangle = new L.Rectangle(bounds, {
                    stroke: false,
                    fillColor: newHexColor,
                    fillOpacity: 0.5
                });
                rectangle.addTo(map);
                console.log(`Rectangle added at grid cell (${i}, ${j}) with color ${newHexColor}`);

                index++;
            }
        }
    });
}

function computeHSLColor(count, resX, resY) {
    const crimeCountScale = 0.01;
    const hueScale = (1 - count * crimeCountScale);
    const hue = Math.ceil(hueScale * 120); // Decrement hue from green to red
    const sat = 100;
    const lum = 60;
    return { h: hue, s: sat, l: lum };
}

function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');   // convert to Hex and prefix "0" if needed
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

initialize();