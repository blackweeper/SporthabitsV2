"""
Script pour trouver quel modèle NVIDIA est actuellement disponible.
Teste plusieurs modèles en parallèle et affiche ceux qui fonctionnent.
"""
# -*- coding: utf-8 -*-
import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
import httpx

# Charger .env depuis la racine du projet
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Modèles à tester (basés sur la doc NVIDIA, mais triés par probabilité d'être récents)
MODELS_TO_TEST = [
    # Modèles plus récents / moins susceptibles d'être EOL
    "nvidia/nemotron-mini-4b-instruct",
    "microsoft/phi-4-mini-instruct",
    "qwen/qwq-32b",
    "qwen/qwen3-next-80b-a3b-instruct",
    "mistralai/mistral-nemotron",
    "mistralai/mixtral-8x22b-instruct",
    "nvidia/nemotron-3.5-lightning-30b-a3b",
    # Modèles qui ont peut-être survécu
    "meta/llama-3.2-3b-instruct",
    "google/gemma-7b",
]


async def test_model(model: str, api_key: str, base_url: str) -> tuple[str, bool, str]:
    """
    Teste si un modèle est disponible.

    Returns:
        (model_name, is_available, error_or_success_message)
    """
    endpoint = f"{base_url}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": "Hi"}],
        "max_tokens": 10,
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(endpoint, json=payload, headers=headers)

            if response.status_code == 200:
                return (model, True, "OK")
            elif response.status_code == 410:
                data = response.json()
                detail = data.get("detail", "End of life")
                return (model, False, f"410: {detail}")
            else:
                return (model, False, f"HTTP {response.status_code}")

    except httpx.TimeoutException:
        return (model, False, "Timeout")
    except Exception as e:
        return (model, False, f"Error: {str(e)[:50]}")


async def main():
    """Teste tous les modèles en parallèle."""
    api_key = os.getenv("NVIDIA_API_KEY")
    base_url = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")

    if not api_key:
        print("[ERREUR] NVIDIA_API_KEY manquante dans .env")
        return

    print("=" * 70)
    print("RECHERCHE DE MODELES NVIDIA DISPONIBLES")
    print("=" * 70)
    print(f"\nTest de {len(MODELS_TO_TEST)} modeles en parallele...\n")

    # Tester tous les modèles en parallèle
    tasks = [test_model(model, api_key, base_url) for model in MODELS_TO_TEST]
    results = await asyncio.gather(*tasks)

    # Séparer disponibles / non-disponibles
    available = [r for r in results if r[1]]
    unavailable = [r for r in results if not r[1]]

    # Afficher les résultats
    if available:
        print("\n" + "=" * 70)
        print(f"MODELES DISPONIBLES ({len(available)}):")
        print("=" * 70)
        for model, _, msg in available:
            print(f"  [OK] {model}")
            print(f"       -> {msg}")

        print("\n" + "=" * 70)
        print("RECOMMENDATION:")
        print("=" * 70)
        recommended = available[0][0]
        print(f"\nUtilise ce modele dans ton .env :")
        print(f"\n    NVIDIA_MODEL={recommended}\n")
    else:
        print("\n[ERREUR] Aucun modele disponible trouve.")

    if unavailable:
        print("\n" + "=" * 70)
        print(f"MODELES NON DISPONIBLES ({len(unavailable)}):")
        print("=" * 70)
        for model, _, msg in unavailable:
            print(f"  [X] {model}")
            print(f"      -> {msg}")

    print("\n" + "=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
