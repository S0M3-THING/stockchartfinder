from flask import Flask, request, jsonify, send_from_directory
import os
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from cheatsheet import load_resnet, extract_features_resnet, buy_sell_mapping
import uuid
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

app = Flask(__name__, static_folder="static", template_folder="templates")

limiter = Limiter(get_remote_address, app=app, default_limits=["10 per minute"])


resnet_model = load_resnet()

root_dir = "./cheatsheet"
database_images = list(buy_sell_mapping.keys())
database_paths = [os.path.join(root_dir, img) for img in database_images]

database_features_resnet = np.array([extract_features_resnet(resnet_model, img) for img in database_paths])

def delete_old_images():
    for file in os.listdir("uploads"):
        file_path = os.path.join("uploads", file)
        if os.path.isfile(file_path):
            os.remove(file_path)

@app.route("/")
def index():
    return send_from_directory("templates", "frontend.html")

@app.route("/static/<path:path>")
def serve_static(path):
    return send_from_directory("static", path)

@app.route("/analyze", methods=["POST"])
@limiter.limit("10 per minute") 
def analyze():
    try:
        delete_old_images()

        if "image" not in request.files:
            return jsonify({"error": "No image uploaded"}), 400

        image = request.files["image"]
        image_path = f"uploads/{uuid.uuid4().hex}.jpg"
        image.save(image_path)


        input_features_resnet = extract_features_resnet(resnet_model, image_path)

        if input_features_resnet is None:
            return jsonify({"error": "Feature extraction failed"}), 500


        similarities_resnet = cosine_similarity([input_features_resnet], database_features_resnet)
        closest_resnet_idx = np.argmax(similarities_resnet)
        resnet_match = database_images[closest_resnet_idx]
        confidence_resnet = float(similarities_resnet[0, closest_resnet_idx] * 100)

        resnet_decision = buy_sell_mapping[resnet_match]

        return jsonify({
            "resnet_match": resnet_match,
            "resnet_confidence": confidence_resnet,
            "resnet_decision": resnet_decision
        })
    
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "An error occurred", "details": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(debug=False, host="0.0.0.0", port=port)
