document.getElementById('fileInput').addEventListener('change', handleFileSelect);
document.getElementById('dropZone').addEventListener('dragover', handleDragOver);
document.getElementById('dropZone').addEventListener('drop', handleDrop);
document.getElementById('frequencyFilter').addEventListener('input', applyFrequencyFilter);
document.getElementById('downloadButton').addEventListener('click', downloadSVG);
document.getElementById('colorScheme').addEventListener('change', changeColorScheme);

let data = [];
let simulation;
let node;

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

    createVisualization(data);
    createLegend(data);
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

    node = g.selectAll(".node")
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

function createLegend(data) {
    const legend = d3.select("#legend");
    legend.selectAll("*").remove();

    const legendItems = legend.selectAll(".legend-item")
        .data(data)
        .enter().append("div")
        .attr("class", "legend-item")
        .style("cursor", "pointer")
        .style("padding", "5px")
        .style("margin", "2px")
        .style("background-color", d => d3.schemeCategory10[d.value % 10])
        .style("color", "#fff")
        .text(d => `${d.name} (${d.value})`)
        .on("mouseover", function(event, d) {
            highlightWord(d.name);
        })
        .on("mouseout", function(d) {
            resetHighlight();
        });
}

function highlightWord(word) {
    node.selectAll("text")
        .style("fill", d => d.name === word ? "#ff0000" : "#000");
}

function resetHighlight() {
    node.selectAll("text")
        .style("fill", "#000");
}

function applyFrequencyFilter() {
    const minFrequency = parseInt(document.getElementById('frequencyFilter').value);
    const filteredData = data.filter(d => d.value >= minFrequency);
    createVisualization(filteredData);
    createLegend(filteredData);
}

function downloadSVG() {
    const svg = document.getElementById("visualization");
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "visualization.svg";
    link.click();
}

function changeColorScheme() {
    const scheme = document.getElementById('colorScheme').value;
    const color = d3.scaleOrdinal(d3[scheme]);
    node.selectAll("circle")
        .attr("fill", d => color(d.name));
    createLegend(data);
}