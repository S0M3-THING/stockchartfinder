# Stock Chart Finder

A Flask web app that compares an uploaded stock chart image with 20 reference chart patterns. It extracts image features using an ImageNet-pretrained ResNet18, finds the closest reference with cosine similarity, and displays the matched pattern plus a predefined buy/sell label.

The displayed percentage is based on feature similarity, not a calibrated probability or a measured forecast of future prices. The repository does not train a stock-specific model or demonstrate trading performance.

## How matching works

```text
Browser image upload + reCAPTCHA token
    → Flask validation and rate limiting
    → ResNet18 feature extraction
    → Cosine similarity against reference images
    → Closest pattern and predefined buy/sell mapping
    → JSON response displayed in the browser
```

Images are resized to 224 × 224, converted to RGB, and normalized before feature extraction. The ResNet18 classification layer is removed. If the best similarity is below 60%, the app returns “No Recognizable Pattern” and `NONE`; that branch also subtracts 30 from the displayed similarity value.

## Project layout

| Path | Purpose |
| --- | --- |
| [`app.py`](app.py) | Flask routes, reCAPTCHA verification, uploads, rate limiting, and matching. |
| [`cheatsheet.py`](cheatsheet.py) | Model loading, feature extraction, and buy/sell labels. |
| [`cheatsheet/`](cheatsheet/) | Reference pattern images. |
| [`templates/frontend.html`](templates/frontend.html) | Main upload page and reCAPTCHA widget. |
| [`static/scripts.js`](static/scripts.js) | Image preview, upload requests, and result display. |
| [`static/styles.css`](static/styles.css) | Shared styles. |
| [`requirements.txt`](requirements.txt) | Pinned Python dependencies. |

## Local setup

Use an isolated Python environment compatible with the pinned dependencies. The complete dependency set has not been verified across Python versions and operating systems.

```bash
git clone https://github.com/S0M3-THING/stockchartfinder.git
cd stockchartfinder
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

On Windows, activate with `.venv\Scripts\activate` instead.

### Configure reCAPTCHA

The upload endpoint requires successful Google reCAPTCHA verification; starting Flask alone is not enough to analyze an image.

- Set `RECAPTCHA_SECRET_KEY` in your local environment or an untracked `.env` file.
- Set `SECRET_KEY` to a private application secret for a consistent Flask secret across restarts. Otherwise, the app generates a random value at startup.
- The reCAPTCHA site key is currently embedded in `templates/frontend.html` as `data-sitekey`. For your own setup, it must correspond to your secret key and permit the hostname you use, including your local development hostname where applicable.
- Do not commit secret values.

### Start the server

Run from the repository root because reference images and uploads use relative paths:

```bash
python app.py
```

Open [the local app](http://127.0.0.1:5001). The first model load may download the pretrained ResNet18 weights if they are not already cached. Startup also extracts features for the reference images.

Flask serves CSS, JavaScript, and the background video locally through `/static/`; Nginx is not required for those assets. Google fonts, icons, reCAPTCHA, and the SweetAlert script are loaded from external services, so those parts need network access.

## Upload and API behavior

1. Select or drag in a chart image.
2. Complete reCAPTCHA.
3. Submit the image and read the closest-pattern result.

`POST /analyze` accepts multipart fields `image` and `g-recaptcha-response`. Successful responses contain `resnet_match`, `resnet_confidence`, `resnet_decision`, and `resnet_imagename`.

| Constraint | Current behavior |
| --- | --- |
| Request size | Flask limits the complete request to 5 MiB. |
| Filename extensions | JPG, JPEG, PNG, and HEIC are accepted by the extension check. |
| Image decoding | Depends on Pillow support; accepting a HEIC extension does not install a HEIC decoder. |
| Request rate | Five analysis requests per day per identifier used by the limiter. |
| Temporary files | Saved under `uploads/`; the success path deletes every file in that directory. |

Other pages are available at `/how_we_work` and `/trading_suggestions`.

## Development notes and limitations

- Browser upload-error regressions can be checked with Node.js 18+ using `node --test tests/upload_errors.test.cjs`. These tests run the actual error handler with mocked browser and network boundaries. They cover unsupported files, oversized requests, rate limits, reCAPTCHA failures, and unexpected errors. They do not test model inference. There is no CI workflow in this repository.
- No end-to-end startup or upload verification is claimed by this guide. Runtime checks need compatible dependencies, model weights, and working reCAPTCHA configuration.
- Upload cleanup currently removes all files in `uploads/`, which can interfere with concurrent requests; error paths may leave files behind.
- The built-in startup block creates `uploads/`. Alternative WSGI entry points must ensure the directory exists before accepting uploads.
- Nginx, EC2, Cloudflare, and TLS were described in the original project notes, but deployment configuration is not included here. The local command above uses Flask's development server.

## License

See [LICENSE](LICENSE).
