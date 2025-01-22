document.getElementById('fileInput').addEventListener('change', handleFileSelect);
document.getElementById('dropZone').addEventListener('dragover', handleDragOver);
document.getElementById('dropZone').addEventListener('drop', handleDrop);
document.getElementById('searchInput').addEventListener('input', handleSearch);
document.getElementById('downloadButton').addEventListener('click', downloadVisualization);
document.getElementById('colorTheme').addEventListener('change', changeColorTheme);

let data = [];
let filteredData = [];

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        showProgressBar();
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
        showProgressBar();
        readFile(file);
    }
}

function showProgressBar() {
    document.getElementById('progressBarContainer').style.display = 'block';
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    let progress = 0;
    const interval = setInterval(() => {
        if (progress >= 100) {
            clearInterval(interval);
            progressText.textContent = 'Chargement terminé';
        } else {
            progress += 10;
            progressBar.value = progress;
            progressText.textContent = `Chargement... ${progress}%`;
        }
    }, 100);
}

function readFile(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const content = event.target.result;
        processData(content);
        hideProgressBar();
    };
    reader.readAsText(file);
}

function hideProgressBar() {
    const progressBarContainer = document.getElementById('progressBarContainer');
    progressBarContainer.style.display = 'none';
    const progressBar = document.getElementById('progressBar');
    progressBar.value = 0;
    const progressText = document.getElementById('progressText');
    progressText.textContent = 'Chargement...';
}

function processData(content) {
    // Extract words and count their occurrences
    const wordCount = extractWords(content);
    // Create a JSON object
    data = Object.keys(wordCount).map(word => ({ name: word, value: wordCount[word] }));
    filteredData = data;
    createVisualization(filteredData);
    updateLegend(filteredData);
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

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const simulation = d3.forceSimulation(data)
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
        .attr("fill", d => color(d.name))
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

function handleSearch(event) {
    const query = event.target.value.toLowerCase();
    filteredData = data.filter(d => d.name.includes(query));
    createVisualization(filteredData);
    updateLegend(filteredData);
}

function downloadVisualization() {
    const svg = document.getElementById('visualization');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
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

function changeColorTheme(event) {
    const theme = event.target.value;
    const svg = d3.select("#visualization");
    const nodes = svg.selectAll(".node");
    let color;
    if (theme === 'dark') {
        color = d3.scaleOrdinal(d3.schemeDark2);
        document.body.style.backgroundColor = '#333';
        document.body.style.color = '#fff';
    } else if (theme === 'light') {
        color = d3.scaleOrdinal(d3.schemeCategory10);
        document.body.style.backgroundColor = '#f4f4f4';
        document.body.style.color = '#333';
    } else {
        color = d3.scaleOrdinal(d3.schemeCategory10);
        document.body.style.backgroundColor = '#f4f4f4';
        document.body.style.color = '#333';
    }
    nodes.select("circle")
        .attr("fill", d => color(d.name));
}

function updateLegend(data) {
    const legend = document.getElementById('legend');
    legend.innerHTML = '';
    const ul = document.createElement('ul');
    data.forEach(d => {
        const li = document.createElement('li');
        li.textContent = `${d.name}: ${d.value}`;
        ul.appendChild(li);
    });
    legend.appendChild(ul);
}