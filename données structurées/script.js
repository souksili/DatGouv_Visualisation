async function loadData() {
    const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vRxYI0Ynud9Ihxuy9t7deptenjAPj6WobFEGcP4ykg1Li4mfrT4RKtfdWYJeu6eTZh7RsruevnRoaGP/pub?output=csv');
    const csv = await response.text();
    const data = Papa.parse(csv, { header: true, dynamicTyping: true }).data;
    return data;
}

async function addMarker(map, school) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${school.Commune},${school.Département},France&format=json&limit=1`);
        const geoData = await response.json();
        if (geoData.length > 0) {
            const lat = geoData[0].lat;
            const lon = geoData[0].lon;
            L.marker([lat, lon]).addTo(map)
                .bindPopup(`<b>${school["Dénomination principale"]}</b><br>${school.Commune}, ${school.Département}<br>Total élèves: ${school["Nombre total d'élèves"]}`);
        }
    } catch (error) {
        console.error(`Error geocoding ${school.Commune}:`, error);
    }
}

async function initMap() {
    const data = await loadData();

    const map = L.map('map').setView([46.603354, 1.888334], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    data.forEach(school => {
        addMarker(map, school);
    });
}

initMap();