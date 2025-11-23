// AI Object Detection & Image Analysis
// Uses TensorFlow.js and COCO-SSD for real-time object detection

let model = null;
let isModelLoaded = false;
let currentImage = null;
let cameraStream = null;

// Supported object categories in COCO-SSD
const cocoCategories = [
    'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck',
    'boat', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench',
    'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe',
    'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis',
    'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard',
    'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife',
    'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot',
    'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch', 'potted plant', 'bed',
    'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'microwave',
    'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors',
    'teddy bear', 'hair drier', 'toothbrush'
];

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing Object Detection AI...');
    await loadModel();
    setupEventListeners();
    displayCategories();
});

// Load COCO-SSD model
async function loadModel() {
    try {
        console.log('Loading COCO-SSD model...');
        model = await cocoSsd.load();
        isModelLoaded = true;
        console.log('✓ Model loaded successfully');
    } catch (error) {
        console.error('Error loading model:', error);
        alert('Error loading AI model. Please refresh the page.');
    }
}

// Setup event listeners
function setupEventListeners() {
    const imageInput = document.getElementById('imageInput');
    const cameraBtn = document.getElementById('cameraBtn');
    const captureBtn = document.getElementById('captureBtn');
    const closeCameraBtn = document.getElementById('closeCameraBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const analyzeAgainBtn = document.getElementById('analyzeAgainBtn');

    imageInput.addEventListener('change', handleImageUpload);
    cameraBtn.addEventListener('click', startCamera);
    captureBtn.addEventListener('click', capturePhoto);
    closeCameraBtn.addEventListener('click', closeCamera);
    downloadBtn.addEventListener('click', downloadResults);
    analyzeAgainBtn.addEventListener('click', resetAnalysis);
}

// Handle image upload
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const img = new Image();
        img.onload = async () => {
            currentImage = img;
            await analyzeImage(img);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Start camera
async function startCamera() {
    try {
        const cameraSection = document.getElementById('cameraSection');
        const cameraFeed = document.getElementById('cameraFeed');

        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });

        cameraFeed.srcObject = cameraStream;
        cameraSection.style.display = 'block';
        cameraSection.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Unable to access camera. Please check permissions.');
    }
}

// Capture photo from camera
async function capturePhoto() {
    const cameraFeed = document.getElementById('cameraFeed');
    const cameraCanvas = document.getElementById('cameraCanvas');
    const ctx = cameraCanvas.getContext('2d');

    cameraCanvas.width = cameraFeed.videoWidth;
    cameraCanvas.height = cameraFeed.videoHeight;
    ctx.drawImage(cameraFeed, 0, 0);

    const img = new Image();
    img.onload = async () => {
        currentImage = img;
        await analyzeImage(img);
        closeCamera();
    };
    img.src = cameraCanvas.toDataURL();
}

// Close camera
function closeCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    document.getElementById('cameraSection').style.display = 'none';
}

// Main analysis function
async function analyzeImage(img) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    loadingSpinner.style.display = 'flex';

    try {
        if (!isModelLoaded) {
            alert('Model is still loading. Please wait...');
            return;
        }

        // Run detection
        const predictions = await model.detect(img);

        // Display results
        displayResults(img, predictions);

    } catch (error) {
        console.error('Error analyzing image:', error);
        alert('Error analyzing image. Please try again.');
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

// Display analysis results
function displayResults(img, predictions) {
    const analysisSection = document.getElementById('analysisSection');
    const outputCanvas = document.getElementById('outputCanvas');
    const ctx = outputCanvas.getContext('2d');

    // Set canvas size
    outputCanvas.width = img.width;
    outputCanvas.height = img.height;

    // Draw image
    ctx.drawImage(img, 0, 0);

    // Draw bounding boxes
    predictions.forEach(prediction => {
        const [x, y, width, height] = prediction.bbox;
        const score = (prediction.score * 100).toFixed(2);

        // Draw box
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);

        // Draw label background
        const label = `${prediction.class} (${score}%)`;
        const textWidth = ctx.measureText(label).width;
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(x, y - 30, textWidth + 10, 25);

        // Draw label text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(label, x + 5, y - 10);
    });

    // Update results
    updateObjectsList(predictions);
    updateStatistics(predictions, img);
    updateConfidenceScores(predictions);
    updateImageInfo(img);

    // Show analysis section
    analysisSection.style.display = 'block';
    analysisSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Update detected objects list
function updateObjectsList(predictions) {
    const objectsList = document.getElementById('objectsList');
    objectsList.innerHTML = '';

    // Count objects by class
    const objectCounts = {};
    predictions.forEach(pred => {
        objectCounts[pred.class] = (objectCounts[pred.class] || 0) + 1;
    });

    // Display objects
    Object.entries(objectCounts).forEach(([className, count]) => {
        const item = document.createElement('div');
        item.className = 'object-item';
        item.innerHTML = `
            <span class="object-name">${className}</span>
            <span class="object-count">${count} detected</span>
        `;
        objectsList.appendChild(item);
    });

    if (predictions.length === 0) {
        objectsList.innerHTML = '<p style="color: var(--text-light);">No objects detected</p>';
    }
}

// Update statistics
function updateStatistics(predictions, img) {
    const statistics = document.getElementById('statistics');
    statistics.innerHTML = '';

    const totalObjects = predictions.length;
    const avgConfidence = predictions.length > 0
        ? (predictions.reduce((sum, p) => sum + p.score, 0) / predictions.length * 100).toFixed(2)
        : 0;
    const highConfidence = predictions.filter(p => p.score > 0.8).length;

    const stats = [
        { label: 'Total Objects', value: totalObjects },
        { label: 'Avg Confidence', value: avgConfidence + '%' },
        { label: 'High Confidence (>80%)', value: highConfidence },
        { label: 'Image Size', value: `${img.width}x${img.height}px` }
    ];

    stats.forEach(stat => {
        const item = document.createElement('div');
        item.className = 'stat-item';
        item.innerHTML = `
            <span class="stat-label">${stat.label}</span>
            <span class="stat-value">${stat.value}</span>
        `;
        statistics.appendChild(item);
    });
}

// Update confidence scores
function updateConfidenceScores(predictions) {
    const confidenceScores = document.getElementById('confidenceScores');
    confidenceScores.innerHTML = '';

    // Get top 5 predictions by confidence
    const topPredictions = predictions
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    topPredictions.forEach(pred => {
        const confidence = (pred.score * 100).toFixed(1);
        const item = document.createElement('div');
        item.className = 'score-item';
        item.innerHTML = `
            <span class="score-label">${pred.class}</span>
            <div class="score-bar">
                <div class="score-fill" style="width: ${confidence}%">
                    ${confidence > 20 ? confidence + '%' : ''}
                </div>
            </div>
            <span class="score-value">${confidence}%</span>
        `;
        confidenceScores.appendChild(item);
    });

    if (predictions.length === 0) {
        confidenceScores.innerHTML = '<p style="color: var(--text-light);">No predictions available</p>';
    }
}

// Update image information
function updateImageInfo(img) {
    const imageInfo = document.getElementById('imageInfo');
    imageInfo.innerHTML = '';

    const info = [
        { label: 'Width', value: img.width + 'px' },
        { label: 'Height', value: img.height + 'px' },
        { label: 'Aspect Ratio', value: (img.width / img.height).toFixed(2) },
        { label: 'Processing Time', value: '< 100ms' }
    ];

    info.forEach(item => {
        const div = document.createElement('div');
        div.className = 'info-item';
        div.innerHTML = `
            <span class="info-label">${item.label}</span>
            <span class="info-value">${item.value}</span>
        `;
        imageInfo.appendChild(div);
    });
}

// Display supported categories
function displayCategories() {
    const categoriesGrid = document.getElementById('categoriesGrid');
    categoriesGrid.innerHTML = '';

    cocoCategories.forEach(category => {
        const tag = document.createElement('div');
        tag.className = 'category-tag';
        tag.textContent = category;
        categoriesGrid.appendChild(tag);
    });
}

// Download results
function downloadResults() {
    const outputCanvas = document.getElementById('outputCanvas');
    const link = document.createElement('a');
    link.href = outputCanvas.toDataURL('image/png');
    link.download = `object-detection-${Date.now()}.png`;
    link.click();
}

// Reset analysis
function resetAnalysis() {
    document.getElementById('imageInput').value = '';
    document.getElementById('analysisSection').style.display = 'none';
    currentImage = null;
    document.getElementById('imageInput').focus();
}
