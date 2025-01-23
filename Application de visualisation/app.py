from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import os
import logging
from datetime import datetime

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configurer Flask
app = Flask(__name__)
CORS(app)

# Configuration
class Config:
    UPLOAD_FOLDER = 'uploads'
    GRAPH_FOLDER = 'static/graphs'
    ALLOWED_EXTENSIONS = {'csv'}
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max-file-size

app.config.from_object(Config)

# Créer les dossiers nécessaires
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['GRAPH_FOLDER'], exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def generate_graphs(data, base_filename):
    """Génère tous les graphiques d'analyse"""
    graphs = []
    
    try:
        # Configuration du style
        plt.style.use('seaborn')
        
        # 1. Histogrammes des variables numériques
        numerical_cols = data.select_dtypes(include=[np.number]).columns
        if len(numerical_cols) > 0:
            plt.figure(figsize=(15, 10))
            data[numerical_cols].hist(bins=30, figsize=(20, 15))
            plt.suptitle("Distribution des variables numériques")
            graph_path = f'{base_filename}_histograms.png'
            plt.savefig(os.path.join(app.config['GRAPH_FOLDER'], graph_path))
            plt.close()
            graphs.append(f'/static/graphs/{graph_path}')

        # 2. Boîtes à moustaches
        if len(numerical_cols) > 0:
            plt.figure(figsize=(12, 8))
            sns.boxplot(data=data[numerical_cols])
            plt.xticks(rotation=45)
            plt.title("Diagrammes en boîte des variables numériques")
            graph_path = f'{base_filename}_boxplots.png'
            plt.savefig(os.path.join(app.config['GRAPH_FOLDER'], graph_path), bbox_inches='tight')
            plt.close()
            graphs.append(f'/static/graphs/{graph_path}')

        # 3. Diagrammes circulaires pour variables catégorielles
        categorical_cols = data.select_dtypes(exclude=[np.number]).columns
        for col in categorical_cols[:3]:  # Limiter à 3 variables catégorielles
            plt.figure(figsize=(8, 6))
            data[col].value_counts().plot(kind='pie', autopct='%1.1f%%')
            plt.title(f"Distribution de {col}")
            graph_path = f'{base_filename}_pie_{col}.png'
            plt.savefig(os.path.join(app.config['GRAPH_FOLDER'], graph_path))
            plt.close()
            graphs.append(f'/static/graphs/{graph_path}')

        # 4. Matrice de corrélation
        if len(numerical_cols) > 0:
            plt.figure(figsize=(10, 8))
            sns.heatmap(data[numerical_cols].corr(), annot=True, cmap="coolwarm", fmt=".2f")
            plt.title("Matrice de corrélation")
            graph_path = f'{base_filename}_correlation.png'
            plt.savefig(os.path.join(app.config['GRAPH_FOLDER'], graph_path), bbox_inches='tight')
            plt.close()
            graphs.append(f'/static/graphs/{graph_path}')

    except Exception as e:
        logger.error(f"Erreur lors de la génération des graphiques: {str(e)}")
    
    return graphs

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_csv():
    try:
        if 'csvFile' not in request.files:
            return jsonify({'error': 'Aucun fichier détecté.'}), 400

        file = request.files['csvFile']
        if not file.filename:
            return jsonify({'error': 'Aucun fichier sélectionné.'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': 'Format de fichier non valide. Veuillez charger un fichier CSV.'}), 400

        # Sauvegarder le fichier
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], f'data_{timestamp}.csv')
        file.save(file_path)

        # Lire et analyser le CSV
        try:
            df = pd.read_csv(file_path)
            if df.empty:
                return jsonify({'error': 'Le fichier CSV est vide.'}), 400
        except Exception as e:
            logger.error(f"Erreur lecture CSV: {str(e)}")
            return jsonify({'error': 'Erreur lors de la lecture du fichier CSV.'}), 400

        # Générer l'analyse
        analysis = {
            'apercu': df.head().to_dict(),
            'types_colonnes': df.dtypes.astype(str).to_dict(),
            'stats': df.describe().round(2).to_dict(),
            'valeurs_manquantes': df.isnull().sum().to_dict(),
            'nombre_lignes': len(df),
            'nombre_colonnes': len(df.columns),
            'colonnes_numeriques': list(df.select_dtypes(include=[np.number]).columns),
            'colonnes_categorielles': list(df.select_dtypes(exclude=[np.number]).columns)
        }

        # Générer les graphiques
        graphs = generate_graphs(df, f'analysis_{timestamp}')

        return jsonify({
            'analysis': analysis,
            'graphs': graphs
        })

    except Exception as e:
        logger.error(f"Erreur générale: {str(e)}")
        return jsonify({'error': 'Une erreur inattendue est survenue.'}), 500

if __name__ == '__main__':
    app.run(debug=True)