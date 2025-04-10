import torch
from torchvision import models, transforms
from PIL import Image
import numpy as np


buy_sell_mapping = {
    "AT.jpg": "buy", "CAH.jpg": "buy", "DBW.jpg": "buy", "DT.jpg": "sell", "DTM.jpg": "sell", "FF.jpg": "buy",
    "BB.jpg": "buy", "BT.jpg": "sell", "TB.jpg": "buy", "TT.jpg": "sell", "RB.jpg": "buy", "RT.jpg": "sell", "HAS.jpg": "sell", "IHAS.jpg": "buy",
    "FP.jpg": "buy", "FW.jpg": "buy", "ICAH.jpg": "sell", "RF.jpg": "sell", "RP.jpg": "sell", "RW.jpg": "sell"
}

def load_resnet():
    model = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)  
    model = torch.nn.Sequential(*list(model.children())[:-1])  
    model.eval()
    return model

def extract_features_resnet(model, image_path):
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    image = Image.open(image_path).convert("RGB")
    image = transform(image).unsqueeze(0)
    
    with torch.no_grad():
        features = model(image)
    
    feature_vector = features.numpy().flatten()
    return feature_vector

