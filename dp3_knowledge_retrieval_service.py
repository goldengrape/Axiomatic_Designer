"""
DP3: Knowledge Retrieval Service

Responsibilities:
- Encapsulates interaction with an abstract knowledge base service interface.
- Receives retrieval requests and returns relevant information snippets.
- Implements L1 FR3: Retrieve information from external knowledge sources.

Note: This is a simplified placeholder. A real implementation would involve
       a more sophisticated AbstractKnowledgeService and potentially different
       retrieval strategies (e.g., vector search, keyword search).
"""

from abc import ABC, abstractmethod
import os
import glob

# --- Abstract Knowledge Service Interface (as defined in SPEC_L1_AbstractKnowledgeService.md) ---
class AbstractKnowledgeService(ABC):
    @abstractmethod
    def connect(self, connection_params: dict) -> bool:
        """Establishes connection to the knowledge source."""
        pass

    @abstractmethod
    def disconnect(self) -> bool:
        """Closes the connection to the knowledge source."""
        pass

    @abstractmethod
    def retrieve_knowledge(self, query: str, context: dict = None, max_results: int = 5) -> list[dict]:
        """
        Retrieves knowledge snippets based on a query and optional context.
        Each snippet should be a dictionary, e.g., {"source": "doc.txt", "content": "..."}
        """
        pass

    @abstractmethod
    def get_status(self) -> dict:
        """Returns the status of the knowledge service."""
        pass

# --- Default Filesystem-based Knowledge Service Implementation ---
class FilesystemKnowledgeService(AbstractKnowledgeService):
    def __init__(self):
        self.knowledge_base_path = None
        self.connected = False
        print("DP3: FilesystemKnowledgeService (default implementation) initialized.")

    def connect(self, connection_params: dict) -> bool:
        self.knowledge_base_path = connection_params.get("path")
        if not self.knowledge_base_path or not os.path.isdir(self.knowledge_base_path):
            print(f"DP3: FilesystemKS - Error: Invalid or missing 'path' in connection_params: {self.knowledge_base_path}")
            self.connected = False
            return False
        self.connected = True
        print(f"DP3: FilesystemKS - Connected to knowledge base at: {self.knowledge_base_path}")
        return True

    def disconnect(self) -> bool:
        print(f"DP3: FilesystemKS - Disconnected from {self.knowledge_base_path}")
        self.knowledge_base_path = None
        self.connected = False
        return True

    def retrieve_knowledge(self, query: str, context: dict = None, max_results: int = 5) -> list[dict]:
        if not self.connected:
            print("DP3: FilesystemKS - Error: Not connected to a knowledge base.")
            return []

        results = []
        # Simple keyword search in .txt and .md files (case-insensitive)
        # This is a very naive implementation for demonstration purposes.
        search_terms = query.lower().split()
        
        # Consider only .txt and .md files for now, as per URD 1.3 & 1.4 (implicitly)
        for file_path in glob.glob(os.path.join(self.knowledge_base_path, "**", "*.txt"), recursive=True) + \
                         glob.glob(os.path.join(self.knowledge_base_path, "**", "*.md"), recursive=True):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    content_lower = content.lower()
                    if all(term in content_lower for term in search_terms):
                        # For simplicity, returning the whole content if all terms match
                        # A real system would extract relevant snippets.
                        results.append({
                            "source": os.path.relpath(file_path, self.knowledge_base_path),
                            "content_preview": content[:200] + ("..." if len(content) > 200 else ""), # Preview
                            "full_content": content # For more detailed use if needed
                        })
                        if len(results) >= max_results:
                            break 
            except Exception as e:
                print(f"DP3: FilesystemKS - Error reading file {file_path}: {e}")
            if len(results) >= max_results:
                break
        
        print(f"DP3: FilesystemKS - Retrieved {len(results)} snippets for query '{query}'.")
        return results

    def get_status(self) -> dict:
        return {
            "service_type": "FilesystemKnowledgeService",
            "connected": self.connected,
            "knowledge_base_path": self.knowledge_base_path
        }

# --- DP3 Knowledge Retrieval Service --- 
class KnowledgeRetrievalService:
    def __init__(self, knowledge_service_impl: AbstractKnowledgeService = None):
        # If no specific implementation is provided, use the default Filesystem one.
        self.service_impl = knowledge_service_impl if knowledge_service_impl else FilesystemKnowledgeService()
        print(f"DP3: KnowledgeRetrievalService initialized with {type(self.service_impl).__name__}.")

    def connect_to_knowledge_base(self, connection_params: dict) -> bool:
        """Connects to the configured knowledge base."""
        return self.service_impl.connect(connection_params)

    def disconnect_from_knowledge_base(self) -> bool:
        """Disconnects from the knowledge base."""
        return self.service_impl.disconnect()

    def search_knowledge(self, query: str, context: dict = None, max_results: int = 5) -> list[dict]:
        """Searches the knowledge base for relevant information."""
        if not self.service_impl.get_status().get("connected"):
            print("DP3: KnowledgeRetrievalService - Cannot search, not connected to a knowledge base.")
            return []
        return self.service_impl.retrieve_knowledge(query, context, max_results)
    
    def get_service_status(self) -> dict:
        """Gets the status of the underlying knowledge service."""
        return self.service_impl.get_status()

if __name__ == '__main__':
    print("\n--- DP3: KnowledgeRetrievalService Test --- ")
    
    # Setup a dummy knowledge base for testing
    test_kb_dir = "./test_knowledge_base"
    os.makedirs(test_kb_dir, exist_ok=True)
    os.makedirs(os.path.join(test_kb_dir, "subdir"), exist_ok=True)

    with open(os.path.join(test_kb_dir, "doc1.txt"), "w", encoding='utf-8') as f:
        f.write("This document talks about functional requirements (FRs) and design parameters (DPs).")
    with open(os.path.join(test_kb_dir, "doc2.md"), "w", encoding='utf-8') as f:
        f.write("# Axiomatic Design Principles\nAxiomatic design is a key concept.")
    with open(os.path.join(test_kb_dir, "subdir", "notes.txt"), "w", encoding='utf-8') as f:
        f.write("Some notes on system architecture and parameters.")

    # Initialize with default FilesystemKnowledgeService
    retrieval_service = KnowledgeRetrievalService()
    
    # Connect
    connection_success = retrieval_service.connect_to_knowledge_base({"path": test_kb_dir})
    assert connection_success
    print("Service status after connect:", retrieval_service.get_service_status())

    # Search
    results1 = retrieval_service.search_knowledge("axiomatic design")
    print(f"Search results for 'axiomatic design': {results1}")
    assert len(results1) > 0
    assert any("doc2.md" in r["source"] for r in results1)

    results2 = retrieval_service.search_knowledge("parameters")
    print(f"Search results for 'parameters': {results2}")
    assert len(results2) > 0
    assert any("doc1.txt" in r["source"] for r in results2) or any("subdir/notes.txt" in r["source"] for r in results2)

    results3 = retrieval_service.search_knowledge("non_existent_term_xyz")
    print(f"Search results for 'non_existent_term_xyz': {results3}")
    assert len(results3) == 0

    # Disconnect
    retrieval_service.disconnect_from_knowledge_base()
    print("Service status after disconnect:", retrieval_service.get_service_status())
    assert not retrieval_service.get_service_status()["connected"]

    # Search while disconnected (should fail gracefully)
    results_disconnected = retrieval_service.search_knowledge("axiomatic design")
    assert len(results_disconnected) == 0

    # Clean up test knowledge base
    import shutil
    if os.path.exists(test_kb_dir):
        shutil.rmtree(test_kb_dir)
    print("DP3: Test completed and cleaned up.")