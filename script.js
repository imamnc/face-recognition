// Get image upload element
const imageUpload = document.getElementById('imageUpload')

// Load models
Promise.all([
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models')
]).then(start)

// Start face recognition
async function start() {
    // Create container
    const container = document.getElementById('result');

    // Prepare detector
    const labeledFaceDescriptors = await loadLabeledImages();
    const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);

    // Declare variable
    let dataImage;
    let image;
    let canvas;

    // Loaded indicator
    $('#status').removeClass('alert-warning');
    $('#status').addClass('alert-success');
    $('#status').html('<strong>Ready</strong>');
    $('#btn-camera').prop('disabled', false);

    // Trigger
    imageUpload.addEventListener('change', async() => {
        // Reset image content
        if (canvas) canvas.remove();

        // Read dataImage
        image = document.querySelector('#result img');
        dataImage = await faceapi.bufferToImage(imageUpload.files[0]);
        image.src = dataImage.src;

        // Create canvas
        canvas = faceapi.createCanvasFromMedia(image);
        container.append(canvas);

        // Set display size
        const displaySize = { width: image.width, height: image.height }
        faceapi.matchDimensions(canvas, displaySize);

        // Recognition
        const detections = await faceapi.detectAllFaces(image).withFaceLandmarks().withFaceDescriptors();
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        const results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor));

        if (results.length > 1) {
            // Reset image content
            if (image) image.src = 'https://www.neddysnorthbayhyundai.ca/dist/img/nophoto.jpg';
            if (canvas) canvas.remove();
            // Alert
            Swal.fire({
                position: 'center',
                icon: 'error',
                title: 'Foto wajib sendiri',
                text: 'Foto tidak boleh menyertakan wajah orang lain !',
                showConfirmButton: false,
                timer: 4000
            });
        } else {
            if (results[0]._label != 'unknown') {
                // Draw label to canvas
                results.forEach((result, i) => {
                    const box = resizedDetections[i].detection.box;
                    const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() });
                    drawBox.draw(canvas);
                });
            } else {
                // Reset image content
                if (image) image.src = 'https://www.neddysnorthbayhyundai.ca/dist/img/nophoto.jpg';
                if (canvas) canvas.remove();
                // Alert
                Swal.fire({
                    position: 'center',
                    icon: 'error',
                    title: 'Wajah tidak dikenali',
                    text: 'Foto wajah anda tidak dikenali !',
                    showConfirmButton: false,
                    timer: 4000
                });
            }
        }

    })
}

// Function load labeled images
async function loadLabeledImages() {
    var labels = await fetch('server/faces.json');
    labels = await labels.json();
    return Promise.all(
        labels.map(async label => {
            const descriptions = []
            for (let i = 0; i < label.faces.length; i++) {
                const face = label.faces[i];
                const img = await faceapi.fetchImage(face);
                const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
                descriptions.push(detections.descriptor);
            }
            return new faceapi.LabeledFaceDescriptors(label.name, descriptions);
        })
    )
}