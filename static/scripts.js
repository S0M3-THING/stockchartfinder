// Add this function to verify reCAPTCHA before analyzing
function analyzeImage() {
    const input = document.getElementById("imageInput").files[0];
    if (!input) {
        showNotification('error', 'No Image Selected', 'Please select a stock chart image to analyze!');
        return;
    }

    // Verify reCAPTCHA
    const recaptchaResponse = grecaptcha.getResponse();
    if (!recaptchaResponse) {
        showNotification('error', 'reCAPTCHA Required', 'Please complete the reCAPTCHA verification before proceeding.');
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
    formData.append("g-recaptcha-response", recaptchaResponse);
    
    // Make API request
    fetch("/analyze", {
        method: "POST",
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        // Reset reCAPTCHA after successful submission
        grecaptcha.reset();
        
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
        
        // Reset reCAPTCHA after error
        grecaptcha.reset();
        
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
        else if (errorMsg.includes("recaptcha")) {
            showNotification('error', 'reCAPTCHA Verification Failed', 'Please complete the reCAPTCHA verification again.');
        }
        else {
            showNotification('error', 'Analysis Failed', 'An error occurred while processing the image. Please try again later.');
        }
    });
}

function resetAnalyzer() {
    // Reset the form and UI
    document.getElementById("imageInput").value = "";
    document.getElementById("uploadedImage").src = "";
    document.getElementById("uploadedImage").style.display = "none";
    document.getElementById("drop-text").textContent = "Drag & drop your chart image here";
    document.getElementById("drop-area").classList.remove("file-selected");
    
    // Reset reCAPTCHA
    grecaptcha.reset();
    
    // Hide results
    document.getElementById("result-container").classList.add("hidden");
    document.getElementById("progress-container").classList.add("hidden");
}