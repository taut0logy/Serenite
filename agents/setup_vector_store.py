"""
One-time setup script for ALL vector stores and knowledge bases
Run this once after database setup to populate all collections

Usage:
    python setup_vector_store.py                    # Setup all collections
    python setup_vector_store.py --clear            # Clear and recreate all
    python setup_vector_store.py --collection mental_health_resources  # Setup specific
    python setup_vector_store.py --clear --collection diary_entries    # Clear specific
    python setup_vector_store.py --verbose          # Detailed output
    python setup_vector_store.py --list             # List all collections

This script creates and populates:
1. mental_health_resources - Mental health knowledge base for chat assistant
2. diary_entries - Empty collection for user diary entries (populated at runtime)
"""

import argparse
import sys

from langchain_postgres import PGVector
from config.settings import settings
from utils.logger import logger
from sqlalchemy import create_engine, text

# Import embeddings adapter (switches between Cohere API and local based on USE_API_MODELS)
from services.embeddings_adapter import get_embeddings


# ============================================================================
# MENTAL HEALTH RESOURCES - For chat assistant knowledge base
# ============================================================================
MENTAL_HEALTH_DOCUMENTS = [
    "Mental health is just as important as physical health and deserves attention and care.",
    "Anxiety is a common mental health concern that can be managed with proper techniques and support.",
    "Depression is a serious but treatable condition that affects millions of people worldwide.",
    "Talking about your feelings and seeking help is a sign of strength, not weakness.",
    "Regular exercise, healthy eating, and good sleep can significantly improve mental health.",
    "Mindfulness and meditation practices can help reduce stress and improve overall mental wellbeing.",
    "It's okay to not be okay - everyone experiences difficult times and emotions.",
    "Professional mental health support is available and can make a real difference in recovery.",
    "Recovery from mental health challenges is possible with the right support and treatment approach.",
    "Setting boundaries is an important self-care practice for protecting your mental health.",
]

# ============================================================================
# COLLECTION DEFINITIONS
# ============================================================================
COLLECTIONS = {
    "mental_health_resources": {
        "description": "Mental health knowledge base for chat assistant",
        "documents": MENTAL_HEALTH_DOCUMENTS,
        "populate_now": True,  # Add documents during setup
    },
    "diary_entries": {
        "description": "User diary entries with semantic search",
        "documents": [],
        "populate_now": False,  # Created empty, populated at runtime
    },
}


def clear_collection(collection_name: str, verbose: bool = False):
    """Delete all data from a specific collection"""
    try:
        engine = create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()
            try:
                # Delete embeddings for this collection
                result = conn.execute(
                    text(
                        """
                    DELETE FROM langchain_pg_embedding e
                    USING langchain_pg_collection c
                    WHERE e.collection_id = c.uuid AND c.name = :collection_name
                """
                    ),
                    {"collection_name": collection_name},
                )

                deleted_count = result.rowcount
                trans.commit()

                if verbose:
                    print(
                        f"    🗑️  Deleted {deleted_count} embeddings from '{collection_name}'"
                    )
                logger.info(
                    f"Cleared collection '{collection_name}': {deleted_count} embeddings deleted"
                )
                return deleted_count
            except Exception as e:
                trans.rollback()
                raise e
    except Exception as e:
        logger.error(f"Failed to clear collection '{collection_name}': {e}")
        raise


def check_collection_exists(collection_name: str):
    """Check if a collection already has data"""
    try:
        engine = create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            # Check if the langchain_pg_collection and langchain_pg_embedding tables exist
            result = conn.execute(
                text(
                    """
                SELECT COUNT(*) 
                FROM langchain_pg_embedding e
                JOIN langchain_pg_collection c ON e.collection_id = c.uuid
                WHERE c.name = :collection_name
            """
                ),
                {"collection_name": collection_name},
            )
            count = result.scalar()
            return count > 0
    except Exception as e:
        logger.warning(f"Could not check collection {collection_name}: {e}")
        return False


def ensure_collection_exists(collection_name: str, embeddings):
    """Ensure a collection exists (creates empty collection if needed)"""
    try:
        vectorstore = PGVector(
            embeddings=embeddings,
            collection_name=collection_name,
            connection=settings.DATABASE_URL,
            use_jsonb=True,
        )
        logger.info(f"Collection '{collection_name}' is ready")
        return vectorstore
    except Exception as e:
        logger.error(f"Failed to create collection '{collection_name}': {str(e)}")
        raise


def setup_all_vector_stores(
    collection_filter: str = None, clear_first: bool = False, verbose: bool = False
):
    """
    Initialize and populate all vector stores

    Args:
        collection_filter: Only process this collection (None = all)
        clear_first: Clear existing data before setup
        verbose: Show detailed progress
    """
    try:
        # First, ensure pgvector extension is enabled
        try:
            engine = create_engine(settings.DATABASE_URL)
            with engine.connect() as conn:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                conn.commit()
                logger.info("pgvector extension enabled")
        except Exception as e:
            logger.warning(f"Could not enable pgvector extension: {e}")
            logger.info("Attempting to continue - extension may already be enabled")

        if verbose:
            print("🔧 Initializing embeddings model...")
        logger.info("Initializing embeddings model...")

        # Use embeddings adapter for production/dev switching
        # Production: Cohere API (multilingual, Bangla-optimized)
        # Dev: HuggingFace local (multilingual fallback)
        embeddings = get_embeddings()

        if verbose:
            print("✅ Embeddings model loaded\n")

        # Filter collections if specified
        collections_to_process = COLLECTIONS
        if collection_filter:
            if collection_filter not in COLLECTIONS:
                print(f"❌ Error: Collection '{collection_filter}' not found")
                print(f"Available collections: {', '.join(COLLECTIONS.keys())}")
                return
            collections_to_process = {collection_filter: COLLECTIONS[collection_filter]}

        # Process each collection
        total_collections = len(collections_to_process)
        for idx, (collection_name, config) in enumerate(
            collections_to_process.items(), 1
        ):
            print(f"[{idx}/{total_collections}] Processing '{collection_name}'")
            if verbose:
                print(f"    Description: {config['description']}")

            # Clear if requested
            if clear_first:
                print("    🗑️  Clearing existing data...")
                deleted = clear_collection(collection_name, verbose=verbose)
                print(f"    ✅ Cleared {deleted} embeddings")

            # Check if already has data (skip if not clearing)
            if not clear_first:
                has_data = check_collection_exists(collection_name)

                if has_data and config["populate_now"]:
                    print("    ℹ️  Collection already has data. Skipping.")
                    if verbose:
                        logger.info(f"Collection '{collection_name}' already populated")
                    continue

            # Ensure collection exists
            if verbose:
                print("    📦 Ensuring collection exists...")
            vectorstore = ensure_collection_exists(collection_name, embeddings)

            # Populate if needed
            if config["populate_now"] and config["documents"]:
                print(f"    📝 Adding {len(config['documents'])} documents...")
                for i, doc in enumerate(config["documents"], 1):
                    vectorstore.add_texts([doc])
                    if verbose and (i % 5 == 0 or i == len(config["documents"])):
                        print(f"       Added {i}/{len(config['documents'])} documents")

                logger.info(
                    f"Populated '{collection_name}' with {len(config['documents'])} documents"
                )
                print("    ✅ Collection populated")
            else:
                print("    ✅ Empty collection created (populated at runtime)")
                logger.info(f"Created empty collection '{collection_name}'")

            print()

        print("=" * 60)
        print("✅ All vector stores setup complete!")
        print("=" * 60)
        print("\nCollections created:")
        for collection_name, config in collections_to_process.items():
            status = (
                f"{len(config['documents'])} docs"
                if config["populate_now"]
                else "empty (runtime)"
            )
            print(f"  • {collection_name}: {status}")
        print()

        logger.info("All vector stores setup completed successfully")

    except Exception as e:
        logger.error(f"Failed to setup vector stores: {str(e)}")
        print(f"\n❌ Error: {str(e)}")
        raise


if __name__ == "__main__":
    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description="Setup vector stores and knowledge bases for mental health system",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                                          # Setup all collections
  %(prog)s --clear                                  # Clear and recreate all
  %(prog)s --collection mental_health_resources     # Setup specific collection
  %(prog)s --clear --collection diary_entries       # Clear specific collection
  %(prog)s --verbose                                # Detailed output
  %(prog)s --list                                   # List all collections
        """,
    )

    parser.add_argument(
        "--collection",
        "-c",
        type=str,
        help=f"Process only this collection. Available: {', '.join(COLLECTIONS.keys())}",
    )

    parser.add_argument(
        "--clear", action="store_true", help="Clear existing data before setup"
    )

    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Show detailed progress information",
    )

    parser.add_argument(
        "--list", action="store_true", help="List all available collections and exit"
    )

    args = parser.parse_args()

    # Handle list command
    if args.list:
        print("\nAvailable collections:")
        for name, config in COLLECTIONS.items():
            doc_count = (
                len(config["documents"]) if config["populate_now"] else "runtime"
            )
            print(f"  • {name}")
            print(f"      Description: {config['description']}")
            print(f"      Documents: {doc_count}")
        print()
        sys.exit(0)

    # Run setup
    print("\n" + "=" * 60)
    if args.collection:
        print(f"Vector Store Setup - {args.collection}")
    else:
        print("Vector Store Setup - All Collections")

    if args.clear:
        print("Mode: CLEAR and RECREATE")
    print("=" * 60 + "\n")

    try:
        setup_all_vector_stores(
            collection_filter=args.collection,
            clear_first=args.clear,
            verbose=args.verbose,
        )
    except KeyboardInterrupt:
        print("\n\n⚠️  Setup interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        sys.exit(1)
