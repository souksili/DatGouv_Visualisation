document.getElementById('fileInput').addEventListener('change', handleFileSelect);
document.getElementById('dropZone').addEventListener('dragover', handleDragOver);
document.getElementById('dropZone').addEventListener('drop', handleDrop);
document.getElementById('minFrequency').addEventListener('input', updateVisualization);
document.getElementById('downloadBtn').addEventListener('click', downloadVisualization);
document.getElementById('colorTheme').addEventListener('change', updateVisualization);
document.getElementById('searchBar').addEventListener('input', highlightWord);

let data = [];
let simulation;
let colorScale;

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        readFile(file);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
}

function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files[0];
    if (file) {
        readFile(file);
    }
}

function readFile(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const content = event.target.result;
        processData(content);
    };
    reader.onerror = function(event) {
        console.error("Erreur lors de la lecture du fichier:", event);
    };
    reader.readAsText(file);
}

function processData(content) {
    // Extract words and count their occurrences
    const wordCount = extractWords(content);
    // Create a JSON object
    data = Object.keys(wordCount).map(word => ({ name: word, value: wordCount[word] }));

    updateStats(data);
    createVisualization(data);
    updateTitle(data);
}

function extractWords(text) {
    // Simple word extraction and counting
    const words = text.toLowerCase().match(/\b\w+\b/g);
    const wordCount = {};
    words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
    });
    return wordCount;
}

function createVisualization(data) {
    const width = 960;
    const height = 600;

    colorScale = d3.scaleOrdinal(d3[document.getElementById('colorTheme').value]);

    simulation = d3.forceSimulation(data)
        .force("x", d3.forceX(width / 2).strength(0.05))
        .force("y", d3.forceY(height / 2).strength(0.05))
        .force("collide", d3.forceCollide(d => d.value * 5 + 10)) // Increase the radius for better spacing
        .on("tick", ticked);

    const svg = d3.select("#visualization")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("font", "12px sans-serif");

    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    svg.call(zoom);

    const g = svg.append("g");

    const node = g.selectAll(".node")
        .data(data)
        .enter().append("g")
        .attr("class", "node")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    node.append("circle")
        .attr("r", d => d.value * 5) // Increase the initial size of the bubbles
        .attr("fill", d => colorScale(d.name))
        .attr("opacity", 0.75)
        .attr("stroke-width", "2");

    node.append("text")
        .attr("dy", "0.3em")
        .attr("text-anchor", "middle")
        .text(d => d.name)
        .attr("class", "nodetext")
        .attr("style", d => `font-size:${d.value}px`) // Adjust the text size for better readability
        .on("mouseover", function(event, d) {
            d3.select(this).style("cursor", "pointer").style("fill", "#2f4cff");
        })
        .on("mouseout", function(d) {
            d3.select(this).style("fill", "#000");
        });

    function ticked() {
        node
            .attr("transform", d => `translate(${d.x},${d.y})`);
    }

    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}

function updateVisualization() {
    const minFrequency = parseInt(document.getElementById('minFrequency').value, 10);
    const filteredData = data.filter(d => d.value >= minFrequency);
    createVisualization(filteredData);
}

function downloadVisualization() {
    const svg = document.getElementById('visualization');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = function() {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const a = document.createElement('a');
        a.download = 'visualization.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
}

function updateStats(data) {
    const totalWords = data.length;
    const topWords = data.slice(0, 5).map(d => `${d.name} (${d.value})`).join(', ');
    document.getElementById('stats').innerHTML = `
        <p>Nombre total de mots : ${totalWords}</p>
        <p>Mots les plus fréquents : ${topWords}</p>
    `;
}

function updateTitle(data) {
    const topWords = data.slice(0, 5).map(d => d.name).join(", ");
    document.title = `Top mots: ${topWords}`;
}

function highlightWord() {
    const searchTerm = document.getElementById('searchBar').value.toLowerCase();
    d3.selectAll('.nodetext')
        .style('fill', d => d.name.includes(searchTerm) ? '#ff0000' : '#000');
}