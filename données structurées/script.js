async function loadUniqueValues() {
    const response = await fetch('unique_values.csv');
    const csv = await response.text();
    const data = Papa.parse(csv, { header: true, dynamicTyping: true }).data;
    return data;
}

async function loadFilteredData(region, academie, departement) {
    let url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRxYI0Ynud9Ihxuy9t7deptenjAPj6WobFEGcP4ykg1Li4mfrT4RKtfdWYJeu6eTZh7RsruevnRoaGP/pub?output=csv';
    if (region) url += `&region=${region}`;
    if (academie) url += `&academie=${academie}`;
    if (departement) url += `&departement=${departement}`;

    const response = await fetch(url);
    const csv = await response.text();
    const data = Papa.parse(csv, { header: true, dynamicTyping: true }).data;
    return data;
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
        }
    } catch (error) {
        console.error(`Error geocoding ${school.Commune}:`, error);
    }
}

function populateFilters(uniqueValues) {
    const regions = [...new Set(uniqueValues.map(item => item["Région académique"]))];
    const academies = [...new Set(uniqueValues.map(item => item.Académie))];
    const departements = [...new Set(uniqueValues.map(item => item.Département))];

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
    const uniqueValues = await loadUniqueValues();
    populateFilters(uniqueValues);

    const map = L.map('map').setView([46.603354, 1.888334], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    document.getElementById('filterButton').addEventListener('click', async () => {
        map.eachLayer(layer => {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });

        const region = document.getElementById('region').value;
        const academie = document.getElementById('academie').value;
        const departement = document.getElementById('departement').value;

        const data = await loadFilteredData(region, academie, departement);

        const queue = data.map(school => () => addMarker(map, school));
        await processQueue(queue, 5); // Limite à 5 requêtes simultanées
    });
}

async function processQueue(queue, concurrency) {
    const results = [];
    let index = 0;

    async function worker() {
        while (index < queue.length) {
            const task = queue[index++];
            try {
                const result = await task();
                results.push(result);
            } catch (error) {
                console.error(`Error processing task:`, error);
            }
        }
    }

    const workers = Array.from({ length: concurrency }, worker);
    await Promise.all(workers.map(w => w()));
    return results;
}

initMap();