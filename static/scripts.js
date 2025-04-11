document.addEventListener("DOMContentLoaded", function() {

    // Elements
    const dropArea = document.getElementById("drop-area");
    const input = document.getElementById("imageInput");
    const fileSelectBtn = document.getElementById("fileSelectBtn");
    const uploadedImage = document.getElementById("uploadedImage");
    const enterSiteBtn = document.getElementById("enter-site");
    const welcomeScreen = document.getElementById("welcome-screen");
    const mainContent = document.getElementById("main-content");
    const howWeWorkBtn = document.getElementById("how-we-work-link");
    const tradingSuggestionsBtn = document.getElementById("trading-suggestions-link");



    // Initialize any tooltips or advanced UI components
    initializeUI();

    // File selection button
    fileSelectBtn.addEventListener("click", () => {
        input.click();
    });

    // Drag and drop events
    dropArea.addEventListener("dragover", (event) => {
        event.preventDefault();
        dropArea.classList.add("drag-over");
    });

    dropArea.addEventListener("dragleave", () => {
        dropArea.classList.remove("drag-over");
    });

    dropArea.addEventListener("drop", (event) => {
        event.preventDefault();
        dropArea.classList.remove("drag-over");

        if (event.dataTransfer.files.length > 0) {
            input.files = event.dataTransfer.files;
            handleImagePreview({ target: input }); 
        }
    });

    // File input change
    input.addEventListener("change", handleImagePreview);

    // Welcome screen transition
    enterSiteBtn.addEventListener("click", function() {
        welcomeScreen.style.opacity = "0";
        setTimeout(() => {
            welcomeScreen.style.display = "none";
            mainContent.classList.remove("hidden");
            // Fade in main content
            setTimeout(() => {
                mainContent.style.opacity = "1";
            }, 50);
        }, 500);
    });

    // Navigation
    howWeWorkBtn.addEventListener("click", function(e) {
        e.preventDefault();
        navigateTo("/how_we_work");
    });

    tradingSuggestionsBtn.addEventListener("click", function(e) {
        e.preventDefault();
        navigateTo("/trading_suggestions");
    });

    // Apply initial styles
    mainContent.style.opacity = "0";
    mainContent.style.transition = "opacity 0.5s ease";
    welcomeScreen.style.transition = "opacity 0.5s ease";
});

function initializeUI() {
    // Add any UI initialization code here
    // This could include tooltips, modals, etc.
}

function handleImagePreview(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();

        reader.onload = function(e) {
            const previewImage = document.getElementById("uploadedImage");
            previewImage.src = e.target.result;
            previewImage.style.display = "block";
            
            // Update drop text and styles
            document.getElementById("drop-text").textContent = "Image ready for analysis";
            document.getElementById("drop-area").classList.add("file-selected");
            
            // Add fade-in animation for the preview
            previewImage.style.opacity = "0";
            setTimeout(() => {
                previewImage.style.opacity = "1";
            }, 50);
        }

        reader.readAsDataURL(file);
    }
}

function updateProgress(progress) {
    const progressBar = document.getElementById("progress-bar");
    progressBar.style.width = progress + "%";
}

function analyzeImage() {
    const input = document.getElementById("imageInput").files[0];
    if (!input) {
        showNotification('error', 'No Image Selected', 'Please select a stock chart image to analyze!');
        return;
    }

    const captchaResponse = grecaptcha.getResponse();
    if (!captchaResponse) {
        showNotification('error', 'Captcha Required', 'Please complete the captcha verification before analysis.');
        return;
    }

    // Check file size before uploading (max 5MB as per your server config)
    if (input.size > 5 * 1024 * 1024) {
        showNotification('error', 'File Too Large', 'Please select an image under 5MB in size.');
        return;
    }

    // Check file type
    const fileType = input.type.split('/')[1];
    const allowedTypes = ['jpg', 'jpeg', 'png', 'heic'];
    if (!allowedTypes.includes(fileType.toLowerCase())) {
        showNotification('error', 'Invalid File Type', 'Please upload only JPG, JPEG, PNG, or HEIC images.');
        return;
    }

    // Show progress and hide any previous results
    const progressContainer = document.getElementById("progress-container");
    const resultContainer = document.getElementById("result-container");
    
    progressContainer.classList.remove("hidden");
    resultContainer.classList.add("hidden");
    updateProgress(0);

    // Simulate progress (visual feedback)
    let progress = 0;
    let interval = setInterval(() => {
        progress += 5;
        if (progress >= 95) {
            clearInterval(interval);
        }
        updateProgress(progress);
    }, 100);

    // Prepare form data for API request
    const formData = new FormData();
    formData.append("image", input);
    formData.append("g-recaptcha-response", captchaResponse);
    
    // Make API request
    fetch("/analyze", {
        method: "POST",
        body: formData
    })
    .then(response => {
        grecaptcha.reset();
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        // Complete progress bar
        clearInterval(interval);
        updateProgress(100);
        
        // Format the results
        let finalText = "";
        const finalDecision = document.getElementById("finalDecision");
        
        if (data.resnet_decision === "buy") {
            finalText = "LONG (BUY)";
            finalDecision.className = "result-value buy-text";
        } else if (data.resnet_decision === "sell") {
            finalText = "SHORT (SELL)";
            finalDecision.className = "result-value sell-text";
        }

        // Update the UI with results
        finalDecision.innerText = finalText;
        document.getElementById("confidence").innerText = `${Math.round(data.resnet_confidence)}%`; 
        document.getElementById("closestImageName").innerText = `${data.resnet_imagename}`;
        
        // Show results with a slight delay for better UX
        setTimeout(() => {
            resultContainer.classList.remove("hidden");
            resultContainer.style.opacity = "0";
            setTimeout(() => {
                resultContainer.style.opacity = "1";
            }, 50);
        }, 500);
    })
    .catch(error => {
        console.error("Error:", error);
        clearInterval(interval);
        updateProgress(0);
        progressContainer.classList.add("hidden");
        
        // Handle specific error messages
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes("no image uploaded")) {
            showNotification('error', 'No Image Selected', 'Please select a stock chart image to analyze!');
        } 
        else if (errorMsg.includes("file type not allowed")) {
            showNotification('error', 'Invalid File Type', 'Please upload only JPG, JPEG, PNG, or HEIC images.');
        }
        else if (errorMsg.includes("5 per day")) {
            showNotification('error', 'Daily Limit Reached', 'You have reached your limit of 5 analyses per day. Please try again tomorrow.');
        }
        else if (errorMsg.includes("max_content_length")) {
            showNotification('error', 'File Too Large', 'Please select an image under 5MB in size.');
        }
        else {
            showNotification('error', 'Analysis Failed', 'An error occurred while processing the image. Please try again later.');
        }
    });
}

function showNotification(type, title, message) {
    Swal.fire({
        icon: type,
        title: title,
        text: message,
        confirmButtonColor: '#3772ff',
        background: '#16161a',
        color: '#ffffff'
    });
}

function navigateTo(url) {
    // Optional: add a fade-out transition before navigation
    document.body.style.opacity = "0";
    setTimeout(() => {
        window.location.href = url;
    }, 300);
}


function resetAnalyzer() {
    // Reset the form and UI
    document.getElementById("imageInput").value = "";
    document.getElementById("uploadedImage").src = "";
    document.getElementById("uploadedImage").style.display = "none";
    document.getElementById("drop-text").textContent = "Drag & drop your chart image here";
    document.getElementById("drop-area").classList.remove("file-selected");
    
    // Hide results
    document.getElementById("result-container").classList.add("hidden");
    document.getElementById("progress-container").classList.add("hidden");
}