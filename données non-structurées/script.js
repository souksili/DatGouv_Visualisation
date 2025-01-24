document.addEventListener('DOMContentLoaded', function() {
    let scene, camera, renderer, words3D;
    let data = [];
    let filteredData = [];
    let stopWordsFr = new Set(['le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'est', 'en', 'que', 'qui', 'dans', 'pour']);
    let stopWordsEn = new Set(['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with']);

    // Event Listeners
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);
    document.getElementById('dropZone').addEventListener('dragover', handleDragOver);
    document.getElementById('dropZone').addEventListener('drop', handleDrop);
    document.getElementById('frequencyThreshold').addEventListener('input', handleFrequencyThresholdChange);
    document.getElementById('searchInput').addEventListener('input', handleSearchInputChange);
    document.getElementById('resetButton').addEventListener('click', handleReset);
    document.getElementById('downloadButton').addEventListener('click', handleDownload);
    document.getElementById('visualizationSelector').addEventListener('change', handleVisualizationChange);
    document.getElementById('textInput').addEventListener('input', handleTextInputChange);
    document.getElementById('toggleModeButton').addEventListener('click', toggleMode);

    function init3DScene() {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, 960 / 600, 0.1, 1000);
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(960, 600);
        
        const container = document.getElementById('d-container');
        container.innerHTML = '';
        container.appendChild(renderer.domElement);

        camera.position.z = 100;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 1, 1);
        scene.add(directionalLight);

        setupMouseControls();
        animate();
    }

    function setupMouseControls() {
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };

        const container = document.getElementById('d-container');

        container.addEventListener('mousedown', (e) => {
            isDragging = true;
        });

        container.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const deltaMove = {
                    x: e.offsetX - previousMousePosition.x,
                    y: e.offsetY - previousMousePosition.y
                };

                scene.rotation.y += deltaMove.x * 0.005;
                scene.rotation.x += deltaMove.y * 0.005;
            }

            previousMousePosition = {
                x: e.offsetX,
                y: e.offsetY
            };
        });

        container.addEventListener('mouseup', () => {
            isDragging = false;
        });

        container.addEventListener('mouseleave', () => {
            isDragging = false;
        });
    }

    function create3DWordCloud(data) {
        if (!scene) init3DScene();

        // Supprime les anciens mots
        if (words3D) {
            words3D.forEach(word => scene.remove(word));
        }
        words3D = [];

        const loader = new THREE.FontLoader();
        const fontUrl = 'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json';

        loader.load(fontUrl, function(font) {
            data.forEach((d, i) => {
                const textGeometry = new THREE.TextGeometry(d.name, {
                    font: font,
                    size: Math.log(d.value) * 2,
                    height: 1
                });

                const material = new THREE.MeshPhongMaterial({
                    color: new THREE.Color(`hsl(${(i * 360) / data.length}, 70%, 50%)`),
                    specular: 0x555555,
                    shininess: 30
                });

                const word = new THREE.Mesh(textGeometry, material);

                // Position aléatoire dans une sphère
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(Math.random() * 2 - 1);
                const radius = 50;

                word.position.x = radius * Math.sin(phi) * Math.cos(theta);
                word.position.y = radius * Math.sin(phi) * Math.sin(theta);
                word.position.z = radius * Math.cos(phi);

                word.lookAt(new THREE.Vector3(0, 0, 0));

                scene.add(word);
                words3D.push(word);
            });
        });
    }

    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }

    function createBubbleVisualization(data) {
        const width = 960;
        const height = 600;
        const color = d3.scaleOrdinal(d3.schemeCategory10);

        const simulation = d3.forceSimulation(data)
            .force("x", d3.forceX(width / 2).strength(0.05))
            .force("y", d3.forceY(height / 2).strength(0.05))
            .force("collide", d3.forceCollide(d => d.value * 5 + 10));

        const svg = d3.select("#visualization")
            .attr("viewBox", `0 0 ${width} ${height}`);

        svg.selectAll("*").remove();

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
            .on("mouseover", showTooltip)
            .on("mouseout", hideTooltip)
            .on("mousemove", moveTooltip);

        node.append("text")
            .attr("dy", "0.3em")
            .attr("text-anchor", "middle")
            .text(d => d.name)
            .attr("style", d => `font-size:${d.value}px`);

        simulation.on("tick", () => {
            node.attr("transform", d => `translate(${d.x},${d.y})`);
        });

        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }

        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }
    }

    function createWordCloud(data) {
        const width = 960;
        const height = 600;
        const color = d3.scaleOrdinal(d3.schemeCategory10);

        const layout = d3.layout.cloud()
            .size([width, height])
            .words(data.map(d => ({ text: d.name, size: d.value * 10, value: d.value })))
            .padding(5)
            .rotate(() => ~~(Math.random() * 2) * 90)
            .font("Impact")
            .fontSize(d => d.size)
            .on("end", draw);

        layout.start();

        function draw(words) {
            const svg = d3.select("#visualization")
                .attr("viewBox", `0 0 ${width} ${height}`);

            svg.selectAll("*").remove();

            svg.append("g")
                .attr("transform", `translate(${width/2},${height/2})`)
                .selectAll("text")
                .data(words)
                .enter().append("text")
                .style("font-size", d => `${d.size}px`)
                .style("font-family", "Impact")
                .style("fill", d => color(d.text))
                .attr("text-anchor", "middle")
                .attr("transform", d => `translate(${d.x},${d.y})rotate(${d.rotate})`)
                .text(d => d.text)
                .on("mouseover", showTooltip)
                .on("mouseout", hideTooltip)
                .on("mousemove", moveTooltip);
        }
    }

    function showTooltip(event, d) {
        const tooltip = d3.select("#tooltip");
        tooltip.style("display", "block")
               .html(`Fréquence: ${d.value || d.size/10}`);
        moveTooltip(event);
    }

    function hideTooltip() {
        d3.select("#tooltip").style("display", "none");
    }

    function moveTooltip(event) {
        d3.select("#tooltip")
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
    }

    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            document.getElementById('fileName').textContent = file.name;
            document.getElementById('textInput').value = '';
            readFile(file);
        }
    }

    function handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }

    function handleDrop(event) {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file) {
            document.getElementById('fileName').textContent = file.name;
            document.getElementById('textInput').value = '';
            readFile(file);
        }
    }

    function readFile(file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            processData(event.target.result);
        };
        reader.readAsText(file);
    }

    function processData(text) {
        const words = text.toLowerCase().match(/\b\w+\b/g);
        const wordCount = {};
        
        if (words) {
            words.forEach(word => {
                if (!stopWordsFr.has(word) && !stopWordsEn.has(word) && /^[a-zA-Z]+$/.test(word)) {
                    wordCount[word] = (wordCount[word] || 0) + 1;
                }
            });
        }

        data = Object.entries(wordCount)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
        
        filteredData = data;
        updateVisualization();
    }

    function handleFrequencyThresholdChange(event) {
        const threshold = parseInt(event.target.value, 10);
        filteredData = data.filter(d => d.value >= threshold);
        updateVisualization();
    }

    function handleSearchInputChange(event) {
        const searchTerm = event.target.value.toLowerCase();
        filteredData = data.filter(d => d.name.includes(searchTerm));
        updateVisualization();
    }

    function handleReset() {
        document.getElementById('fileInput').value = '';
        document.getElementById('fileName').textContent = '';
        document.getElementById('textInput').value = '';
        document.getElementById('frequencyThreshold').value = '';
        document.getElementById('searchInput').value = '';
        data = [];
        filteredData = [];
        updateVisualization();
    }

    function handleDownload() {
        const visualizationType = document.getElementById('visualizationSelector').value;
        if (visualizationType === '3d') {
            // Pour la visualisation 3D, on capture le canvas WebGL
            const canvas = renderer.domElement;
            const link = document.createElement('a');
            link.download = 'visualization-3d.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        } else {
            // Pour les visualisations 2D (SVG)
            const svg = document.getElementById('visualization');
            const svgData = new XMLSerializer().serializeToString(svg);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = function() {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                const link = document.createElement('a');
                link.download = 'visualization-2d.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            };
            
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        }
    }

    function handleVisualizationChange() {
        updateVisualization();
        updateLegend();
    }

    function handleTextInputChange(event) {
        const text = event.target.value;
        if (text.trim() !== '') {
            document.getElementById('fileName').textContent = '';
            processData(text);
        }
    }

    function updateVisualization() {
        const selectedValue = document.getElementById('visualizationSelector').value;
        const visualizationSvg = document.getElementById('visualization');
        const container3D = document.getElementById('d-container');

        if (selectedValue === 'bubble') {
            visualizationSvg.style.display = 'block';
            container3D.style.display = 'none';
            createBubbleVisualization(filteredData);
        } else if (selectedValue === 'wordcloud') {
            visualizationSvg.style.display = 'block';
            container3D.style.display = 'none';
            createWordCloud(filteredData);
        } else if (selectedValue === '3d') {
            visualizationSvg.style.display = 'none';
            container3D.style.display = 'block';
            create3DWordCloud(filteredData);
        }
    }

    function updateLegend() {
        const selectedValue = document.getElementById('visualizationSelector').value;
        document.getElementById('bubble-legend').style.display = selectedValue === 'bubble' ? 'block' : 'none';
        document.getElementById('wordcloud-legend').style.display = selectedValue === 'wordcloud' ? 'block' : 'none';
        document.getElementById('3d-legend').style.display = selectedValue === '3d' ? 'block' : 'none';
    }

    function toggleMode() {
        document.body.classList.toggle('dark-mode');
        const icon = document.getElementById('toggleModeButton').querySelector('i');
        if (document.body.classList.contains('dark-mode')) {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        } else {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    }
});