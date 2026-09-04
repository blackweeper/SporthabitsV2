"""
Test simple pour vérifier que l'API NVIDIA fonctionne.

Usage:
    python test_nvidia_api.py (depuis le répertoire backend/)
"""
# -*- coding: utf-8 -*-
import asyncio
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Charger .env depuis la racine du projet
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Ajouter le répertoire backend au PYTHONPATH
sys.path.insert(0, str(Path(__file__).parent))

from ai import get_ai_service


async def test_nvidia_simple():
    """Test basique : appel IA simple."""
    print("=== Test NVIDIA API - Appel simple ===\n")

    try:
        service = get_ai_service()
        print("[OK] AIService initialise\n")

        response = await service.chat(
            prompt="What is 2+2? Respond with ONLY the number.",
            temperature=0.0
        )

        print(f"✅ Réponse reçue : {response.content}")
        print(f"   Modèle : {response.model}")
        print(f"   Usage : {response.usage}")

        return True

    except Exception as e:
        print(f"❌ Erreur : {e}")
        return False


async def test_nvidia_json():
    """Test JSON : vérifier que le modèle peut retourner du JSON valide."""
    print("\n=== Test NVIDIA API - Génération JSON ===\n")

    try:
        service = get_ai_service()

        system_prompt = """You are a JSON generator.
Always respond with VALID JSON only, no markdown, no explanation.
"""

        prompt = """Generate a simple program structure with this JSON format:
{
  "name": "Example Program",
  "weeks": 1,
  "days": [
    {
      "day": 1,
      "exercises": [
        {
          "name": "Squat",
          "sets": 3,
          "reps": 10
        }
      ]
    }
  ]
}
"""

        response = await service.chat(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.1
        )

        print("✅ Réponse JSON reçue :")
        print(response.content[:500])  # Premiers 500 caractères

        # Essayer de parser le JSON
        import json
        try:
            data = json.loads(response.content)
            print(f"\n✅ JSON valide parsé : {data.get('name', 'N/A')}")
            return True
        except json.JSONDecodeError as e:
            print(f"\n⚠️  JSON invalide : {e}")
            print("   L'IA a retourné quelque chose mais ce n'est pas du JSON pur.")
            return False

    except Exception as e:
        print(f"❌ Erreur : {e}")
        return False


async def test_nvidia_timeout():
    """Test timeout : vérifier la gestion des timeouts."""
    print("\n=== Test NVIDIA API - Timeout ===\n")

    try:
        service = get_ai_service()

        # Forcer un timeout très court pour tester la gestion d'erreur
        original_timeout = service.provider.timeout
        service.provider.timeout = 1  # 1 seconde

        try:
            response = await service.chat(
                prompt="Write a very long story about...",
                max_tokens=4000
            )
            print("⚠️  Pas de timeout (le modèle a été très rapide)")
            return True
        except ValueError as e:
            if "Timeout" in str(e):
                print(f"✅ Timeout géré correctement : {e}")
                return True
            else:
                print(f"❌ Erreur inattendue : {e}")
                return False
        finally:
            service.provider.timeout = original_timeout

    except Exception as e:
        print(f"❌ Erreur : {e}")
        return False


async def main():
    """Lance tous les tests."""
    print("=" * 60)
    print("TEST NVIDIA API - IRONFLOW")
    print("=" * 60)
    print()

    # Vérifier que les variables d'environnement sont présentes
    if not os.getenv("NVIDIA_API_KEY"):
        print("❌ NVIDIA_API_KEY manquante dans .env")
        print("   Copiez .env.example vers .env et configurez votre clé.")
        return

    results = []

    # Test 1 : Appel simple
    results.append(await test_nvidia_simple())

    # Test 2 : Génération JSON
    results.append(await test_nvidia_json())

    # Test 3 : Timeout (optionnel, commenté pour ne pas ralentir)
    # results.append(await test_nvidia_timeout())

    # Résumé
    print("\n" + "=" * 60)
    print(f"RÉSULTAT : {sum(results)}/{len(results)} tests réussis")
    print("=" * 60)

    if all(results):
        print("\n✅ NVIDIA API fonctionne correctement !")
        print("   Vous pouvez maintenant construire le pipeline PDF.")
    else:
        print("\n⚠️  Certains tests ont échoué.")
        print("   Vérifiez la configuration NVIDIA dans .env")


if __name__ == "__main__":
    asyncio.run(main())
