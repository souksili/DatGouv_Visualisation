document.getElementById('fileInput').addEventListener('change', handleFileSelect);
document.getElementById('dropZone').addEventListener('dragover', handleDragOver);
document.getElementById('dropZone').addEventListener('drop', handleDrop);

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
    // Extract words and count their occurrences
    const wordCount = extractWords(content);
    // Create a JSON object
    const data = Object.keys(wordCount).map(word => ({ name: word, value: wordCount[word] }));

    createVisualization(data);
    createBarChart(data);
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
    const width = 480;
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

function createBarChart(data) {
    const width = 480;
    const height = 600;
    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select("#barChart")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("font", "12px sans-serif");

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .domain(data.map(d => d.name))
        .range([0, innerWidth])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.value)])
        .nice()
        .range([innerHeight, 0]);

    g.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x));

    g.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(y).ticks(10, "s"))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", "0.71em")
        .attr("text-anchor", "end")
        .text("Fréquence");

    g.selectAll(".bar")
        .data(data)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.name))
        .attr("y", d => y(d.value))
        .attr("width", x.bandwidth())
        .attr("height", d => innerHeight - y(d.value));
}