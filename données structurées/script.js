async function loadData() {
    const response = await fetch('unique_values.csv');
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

function populateFilters(data) {
    const regions = [...new Set(data.map(school => school["Région académique"]))];
    const academies = [...new Set(data.map(school => school.Académie))];
    const departements = [...new Set(data.map(school => school.Département))];

    regions.forEach(region => {
        const option = document.createElement('option');
        option.value = region;
        option.textContent = region;
        document.getElementById('region').appendChild(option);
    });

    academies.forEach(academie => {
        const option = document.createElement('option');
        option.value = academie;
        option.textContent = academie;
        document.getElementById('academie').appendChild(option);
    });

    departements.forEach(departement => {
        const option = document.createElement('option');
        option.value = departement;
        option.textContent = departement;
        document.getElementById('departement').appendChild(option);
    });
}

async function initMap() {
    const data = await loadData();
    populateFilters(data);

    const map = L.map('map').setView([46.603354, 1.888334], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    document.getElementById('filterButton').addEventListener('click', () => {
        map.eachLayer(layer => {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });

        const region = document.getElementById('region').value;
        const academie = document.getElementById('academie').value;
        const departement = document.getElementById('departement').value;

        data.forEach(school => {
            if ((region === '' || school["Région académique"] === region) &&
                (academie === '' || school.Académie === academie) &&
                (departement === '' || school.Département === departement)) {
                addMarker(map, school);
            }
        });
    });
}

initMap();