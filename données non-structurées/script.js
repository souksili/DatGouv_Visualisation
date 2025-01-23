document.getElementById('fileInput').addEventListener('change', handleFileSelect);
document.getElementById('dropZone').addEventListener('dragover', handleDragOver);
document.getElementById('dropZone').addEventListener('drop', handleDrop);
document.getElementById('frequencyThreshold').addEventListener('input', handleFrequencyThresholdChange);
document.getElementById('searchInput').addEventListener('input', handleSearchInputChange);
document.getElementById('resetButton').addEventListener('click', handleReset);
document.getElementById('downloadButton').addEventListener('click', handleDownload);

let data = [];
let filteredData = [];

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
    reader.readAsText(file);
}

function processData(content) {
    const wordCount = extractWords(content);
    data = Object.keys(wordCount).map(word => ({ name: word, value: wordCount[word] }));
    filteredData = data;
    createVisualization(filteredData);
    createWordCloud(filteredData);
}

function extractWords(text) {
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
        .force("collide", d3.forceCollide(d => d.value * 5 + 10))
        .on("tick", ticked);

    const svg = d3.select("#visualization")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("font", "12px sans-serif");

    // Supprimer l'ancien graphique
    svg.selectAll("*").remove();

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
        .attr("r", d => d.value * 5)
        .attr("fill", d => color(d.name))
        .attr("opacity", 0.75)
        .attr("stroke-width", "2");

    node.append("text")
        .attr("dy", "0.3em")
        .attr("text-anchor", "middle")
        .text(d => d.name)
        .attr("class", "nodetext")
        .attr("style", d => `font-size:${d.value}px`)
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

function createWordCloud(data) {
    const width = 960;
    const height = 600;

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const layout = d3.layout.cloud()
        .size([width, height])
        .words(data.map(d => ({ text: d.name, size: d.value * 10 })))
        .padding(5)
        .rotate(() => ~~(Math.random() * 2) * 90)
        .font("Impact")
        .fontSize(d => d.size)
        .on("end", draw);

    layout.start();

    function draw(words) {
        d3.select("#wordcloud").append("g")
            .attr("transform", "translate(" + layout.size()[0] / 2 + "," + layout.size()[1] / 2 + ")")
            .selectAll("text")
            .data(words)
            .enter().append("text")
            .style("font-size", d => d.size + "px")
            .style("font-family", "Impact")
            .style("fill", d => color(d.text))
            .attr("text-anchor", "middle")
            .attr("transform", d => "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")")
            .text(d => d.text);
    }
}

function handleFrequencyThresholdChange(event) {
    const threshold = parseInt(event.target.value, 10);
    filteredData = data.filter(d => d.value >= threshold);
    createVisualization(filteredData);
    createWordCloud(filteredData);
}

function handleSearchInputChange(event) {
    const searchTerm = event.target.value.toLowerCase();
    filteredData = data.filter(d => d.name.includes(searchTerm));
    createVisualization(filteredData);
    createWordCloud(filteredData);
}

function handleReset() {
    filteredData = data;
    createVisualization(filteredData);
    createWordCloud(filteredData);
    document.getElementById('frequencyThreshold').value = '';
    document.getElementById('searchInput').value = '';
}

function handleDownload() {
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
        a.href = canvas.toDataURL('image/png');
        a.download = 'visualization.png';
        a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
}