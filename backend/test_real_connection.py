#!/usr/bin/env python3
"""
Script de test rapide — vérifie la connexion NVIDIA avec votre vraie clé.

Usage :
    cd backend
    python test_real_connection.py

Ce script lit .env (si présent) ou les variables d'environnement et teste
un appel simple à NVIDIA NIM. NE PAS exécuter en production.
"""

import asyncio
import os
import sys
from pathlib import Path

# Charger .env depuis le répertoire du script
backend_dir = Path(__file__).parent
env_file = backend_dir / ".env"

if env_file.exists():
    print(f"📂 Chargement de {env_file.name}...")
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip()
                if value and value != "change-me":
                    os.environ[key] = value
                    print(f"  ✅ {key} configuré")
else:
    print("⚠️  Aucun fichier .env trouvé — utilisation des variables d'environnement système")

# Vérification rapide de la clé
api_key = os.environ.get("NVIDIA_API_KEY", "")
if not api_key or api_key == "change-me" or not api_key.startswith("nvapi-"):
    print(f"\n❌ NVIDIA_API_KEY non configurée ou invalide")
    print(f"   Valeur actuelle : '{api_key[:10]}...' (longueur: {len(api_key)})")
    print(f"   Vérifiez que NVIDIA_API_KEY commence par 'nvapi-' dans backend/.env")
    sys.exit(1)

print(f"\n🔑 Clé NVIDIA détectée : '{api_key[:8]}...{api_key[-4:]}' (longueur: {len(api_key)})")

# Test de connexion
async def test_connection():
    from ai import get_ai_service

    print(f"\n🔧 Modèle : {os.environ.get('NVIDIA_MODEL', 'meta/llama-3.1-405b-instruct')}")
    print(f"🌐 Endpoint : {os.environ.get('NVIDIA_BASE_URL', 'https://integrate.api.nvidia.com/v1')}")
    print(f"⏱️  Timeout : {os.environ.get('NVIDIA_TIMEOUT', '120')}s")

    print(f"\n📡 Test de connexion en cours...")

    service = get_ai_service()
    result = await service.health_check()

    if result:
        print(f"\n✅ CONNEXION RÉUSSIE — Le service NVIDIA NIM est opérationnel")
    else:
        print(f"\n❌ ÉCHEC DE LA CONNEXION — Vérifiez votre clé API et votre connexion internet")

    return result


if __name__ == "__main__":
    try:
        success = asyncio.run(test_connection())
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ ERREUR INATTENDUE : {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
