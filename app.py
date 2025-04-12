from flask import Flask, request, jsonify, send_from_directory, render_template, make_response
import os
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from cheatsheet import load_resnet, extract_features_resnet, buy_sell_mapping
import uuid
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import hashlib
from PIL import Image
import numpy as np
import secrets
from dotenv import load_dotenv
import requests



load_dotenv()

app = Flask(__name__, static_folder="static", template_folder="templates")

app.secret_key = os.environ.get("SECRET_KEY", secrets.token_hex(32))

# reCAPTCHA settings
RECAPTCHA_SECRET_KEY = os.environ.get("RECAPTCHA_SECRET_KEY")
RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"

app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024

ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'heic'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def verify_recaptcha(recaptcha_response):
    if not recaptcha_response:
        return False
    
    data = {
        'secret': RECAPTCHA_SECRET_KEY,
        'response': recaptcha_response
    }
    
    response = requests.post(RECAPTCHA_VERIFY_URL, data=data)
    result = response.json()
    
    return result.get('success', False)

def get_user_identifier():
    user_id = request.cookies.get('user_id')

    if not user_id:
        # Extract as many unique and stable headers as possible
        user_agent = request.headers.get('User-Agent', '')
        accept_lang = request.headers.get('Accept-Language', '')
        sec_ch_ua = request.headers.get('Sec-CH-UA', '')
        sec_ch_platform = request.headers.get('Sec-CH-UA-Platform', '')
        sec_ch_mobile = request.headers.get('Sec-CH-UA-Mobile', '')
        ip = get_remote_address()
        
        # Create combined fingerprint
        fingerprint = f"{user_agent}|{accept_lang}|{sec_ch_ua}|{sec_ch_platform}|{sec_ch_mobile}|{ip}"
        user_id = hashlib.sha256(fingerprint.encode()).hexdigest()

    return user_id

limiter = Limiter(get_user_identifier, app=app)

resnet_model = load_resnet()

root_dir = "./cheatsheet"
database_images = list(buy_sell_mapping.keys())
database_paths = [os.path.join(root_dir, img) for img in database_images]

image_name_map = {
    "AT.jpg": "Ascending Triangle",
    "BB.jpg": "Broadening Bottom",
    "BT.jpg": "Broadening Top",
    "CAH.jpg": "Cup and Handle",
    "DBW.jpg": "Double Bottom",
    "DT.jpg": "Descending Triangle",
    "DTM.jpg": "Double Top",
    "FF.jpg": "Falling Flag",
    "FP.jpg": "Falling Pennant",
    "FW.jpg": "Falling Wedge",
    "HAS.jpg": "Head and Shoulder",
    "ICAH.jpg": "Inverse Cup and Handle",
    "IHAS.jpg": "Inverse Head and Shoulder",
    "RB.jpg": "Rounding Bottom",
    "RF.jpg": "Rising Flag",
    "RP.jpg": "Rising Pennant",
    "RT.jpg": "Rounding Top",
    "RW.jpg": "Rising Wedge",
    "TB.jpg": "Triple Bottom",
    "TT.jpg": "Triple Top"
}


database_features_resnet = np.array([extract_features_resnet(resnet_model, img) for img in database_paths])

def delete_old_images():
    # Create uploads directory if it doesn't exist
    if not os.path.exists("uploads"):
        os.makedirs("uploads")
        
    for file in os.listdir("uploads"):
        file_path = os.path.join("uploads", file)
        if os.path.isfile(file_path):
            os.remove(file_path)


@app.errorhandler(413)  # 413 is the HTTP status code for request entity too large
def too_large(e):
    return jsonify({"error": "max_content_length exceeded. File too large."}), 413

@app.errorhandler(413)  # 413 is the HTTP status code for request entity too large
def too_large(e):
    return jsonify({"error": "max_content_length exceeded. File too large."}), 413

@app.errorhandler(429)  # 429 is the HTTP status code for too many requests
def ratelimit_handler(e):
    return jsonify({"error": "5 per day limit exceeded"}), 429


@app.route('/how_we_work')
def how_we_work():
    return render_template('how_we_work.html')

@app.route('/trading_suggestions')
def trading_suggestions():
    return render_template('trading_suggestions.html')


@app.route("/")
def index():
    return send_from_directory("templates", "frontend.html")

@app.route("/static/<path:path>")
def serve_static(path):
    return send_from_directory("static", path)

@app.route("/analyze", methods=["POST"])
@limiter.limit("5 per day")
def analyze():
    try:
        # Verify reCAPTCHA
        recaptcha_response = request.form.get('g-recaptcha-response')
        if not verify_recaptcha(recaptcha_response):
            return jsonify({"error": "reCAPTCHA verification failed"}), 400

        if "image" not in request.files:
            return jsonify({"error": "No image uploaded"}), 400

        image = request.files["image"]
        if not allowed_file(image.filename):
            return jsonify({"error": "File type not allowed. Only jpg, jpeg, png, heic accepted."}), 400
        image_path = f"uploads/{uuid.uuid4().hex}.jpg"
        image.save(image_path)

        input_features_resnet = extract_features_resnet(resnet_model, image_path)

        if input_features_resnet is None:
            return jsonify({"error": "Feature extraction failed"}), 500

        similarities_resnet = cosine_similarity([input_features_resnet], database_features_resnet)
        closest_resnet_idx = np.argmax(similarities_resnet)
        resnet_match = database_images[closest_resnet_idx]
        confidence_resnet = float(similarities_resnet[0, closest_resnet_idx] * 100)
        closest_image_name = image_name_map.get(resnet_match, "Unknown Image")

        resnet_decision = buy_sell_mapping[resnet_match]

        delete_old_images()

        result = {
            "resnet_match": resnet_match,
            "resnet_confidence": confidence_resnet,
            "resnet_decision": resnet_decision,
            "resnet_imagename": closest_image_name
        }

        response = make_response(jsonify(result))
        if not request.cookies.get('user_id'):
            user_id = get_user_identifier()
            response.set_cookie('user_id', user_id, max_age=60*60*24*365)  # 1 year
        return response

    
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "An error occurred", "details": str(e)}), 500


if __name__ == "__main__":
    # Make sure uploads directory exists
    if not os.path.exists("uploads"):
        os.makedirs("uploads")
        
    # Create a static directory if it doesn't exist
    if not os.path.exists("static"):
        os.makedirs("static")

    
    app.run(debug=False, host="127.0.0.1", port=5001)