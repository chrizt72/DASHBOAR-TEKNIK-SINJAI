import os
import csv
import json

# Ensure public/data directory exists
os.makedirs('public/data', exist_ok=True)
os.makedirs('src/data', exist_ok=True)

csv_path = 'public/data/material_sinjai.csv'
print("Material generator initialized.")
