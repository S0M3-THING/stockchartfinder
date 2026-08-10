Overview
A web app that lets users upload stock chart images to analyze patterns using AI. Built with Python, HTML, CSS, Javascript and designed to be deployed behind Nginx, AWS EC2, and Cloudflare. When cloned and run on local environment, the local host will not execute any stylistic code.

Requirements
Python 3.9+
Virtual environment recommended

Setup
1.Clone Repository
2.Create and activate virtual environment
3.Install dependencies from requirements.txt (pip install -r requirements.txt)
4.Run app.py and go to http://127.0.0.1:5001


Frontend	HTML
Styling	CSS
Client-side logic	JavaScript
Backend	Python
Web framework	Flask
ML framework	PyTorch
CNN	ResNet18
Image processing	Pillow
Similarity	Scikit-learn
Rate limiting	Flask-Limiter
Production WSGI	Gunicorn
Reverse proxy	Nginx
Server	Ubuntu
Cloud	AWS EC2
DNS / Proxy / Firewall	Cloudflare
SSL	Certbot / Cloudflare Origin SSL
Source control	Git / GitHub


                    ┌─────────────────────┐
                    │        User         │
                    │                     │
                    │ Uploads Stock Chart │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      Browser        │
                    │                     │
                    │  HTML / CSS / JS    │
                    └──────────┬──────────┘
                               │
                               │ HTTP POST
                               ▼
                    ┌─────────────────────┐
                    │       Nginx         │
                    │                     │
                    │    Reverse Proxy    │
                    │    HTTPS / SSL      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │       Flask         │
                    │       app.py        │
                    │                     │
                    │   Request Handling  │
                    │    File Uploads     |
                    │    Rate Limiting    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   cheatsheet.py     │
                    │                     │
                    │  ResNet18 Feature   │
                    │      Extraction     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Cosine Similarity   │
                    │                     │
                    │ Uploaded Image      │
                    │       vs            │
                    │ Reference Images    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Closest Pattern     │
                    │                     │
                    │ Buy/Sell Mapping    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │       Flask         │
                    │ Returns Result      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      Browser        │
                    │                     │
                    │ Pattern             │
                    │ Confidence          │
                    │ Decision            │
                    └─────────────────────┘
