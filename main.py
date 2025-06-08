"""
Axiomatic Designer Main Application
"""

from dp0_workflow_controller import WorkflowController
from dp1_project_template_manager import ProjectTemplateManager
from dp2_project_lexicon_service import ProjectLexiconService
from dp3_knowledge_retrieval_service import FilesystemKnowledgeService # Assuming default implementation
from dp4_knowledge_arbiter import KnowledgeArbiter
from dp5_content_engine import ContentEngine, LLMServiceClient as ContentLLMClient # Alias to avoid conflict
from dp6_review_engine import ReviewEngine, LLMServiceClient as ReviewLLMClient # Alias
from dp7_user_interface_handler import UserInterfaceHandler
from dp8_version_control_integrator import VersionControlIntegrator

import os

# Configuration (could be loaded from a file or environment variables)
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
DEFAULT_TEMPLATE_DIR = os.path.join(PROJECT_ROOT, "templates")
DEFAULT_LEXICON_FILE = os.path.join(PROJECT_ROOT, "lexicon.json")
DEFAULT_KNOWLEDGE_BASE_DIR = os.path.join(PROJECT_ROOT, "knowledge_base")

# Ensure directories exist (basic setup for demo)
if not os.path.exists(DEFAULT_TEMPLATE_DIR):
    os.makedirs(DEFAULT_TEMPLATE_DIR)
if not os.path.exists(DEFAULT_KNOWLEDGE_BASE_DIR):
    os.makedirs(DEFAULT_KNOWLEDGE_BASE_DIR)
# Create a dummy lexicon file if it doesn't exist for the demo
if not os.path.exists(DEFAULT_LEXICON_FILE):
    with open(DEFAULT_LEXICON_FILE, 'w') as f:
        f.write("{}")

def main():
    print("--- Axiomatic Designer Initializing ---")

    # Initialize DPs
    # DP1: Project Template Manager
    dp1_template_manager = ProjectTemplateManager(template_directory=DEFAULT_TEMPLATE_DIR)
    # Create a dummy template for demo purposes if none exist
    if not dp1_template_manager.list_templates():
        dp1_template_manager.create_template("default_project_template", 
                                           {"version": "1.0", "description": "Default project settings"})

    # DP2: Project Lexicon Service
    dp2_lexicon_service = ProjectLexiconService(lexicon_file_path=DEFAULT_LEXICON_FILE)
    # Add a dummy term if lexicon is empty
    if not dp2_lexicon_service.get_all_terms():
        dp2_lexicon_service.add_term("FR", "Functional Requirement")

    # DP3: Knowledge Retrieval Service
    dp3_knowledge_retriever = FilesystemKnowledgeService(knowledge_base_path=DEFAULT_KNOWLEDGE_BASE_DIR)
    # Add a dummy knowledge file
    dummy_kb_file = os.path.join(DEFAULT_KNOWLEDGE_BASE_DIR, "sample_kb.txt")
    if not os.path.exists(dummy_kb_file):
        with open(dummy_kb_file, 'w') as f:
            f.write("This is a sample knowledge snippet about system design.")
    dp3_knowledge_retriever.connect()

    # DP4: Knowledge Arbiter
    dp4_arbiter = KnowledgeArbiter(project_lexicon_service=dp2_lexicon_service, 
                                   knowledge_retrieval_service=dp3_knowledge_retriever)

    # DP5: Content Engine
    # Using separate LLM clients for content and review for potential different configurations
    content_llm = ContentLLMClient(model_name="content_generator_model_v1")
    dp5_content_engine = ContentEngine(llm_service_client=content_llm,
                                       project_template_manager=dp1_template_manager,
                                       knowledge_arbiter=dp4_arbiter)

    # DP6: Review Engine
    review_llm = ReviewLLMClient(model_name="review_analyzer_model_v1")
    dp6_review_engine = ReviewEngine(llm_service_client=review_llm,
                                     project_template_manager=dp1_template_manager,
                                     project_lexicon_service=dp2_lexicon_service,
                                     knowledge_arbiter=dp4_arbiter)

    # DP8: Version Control Integrator
    dp8_vcs_integrator = VersionControlIntegrator(project_root_path=PROJECT_ROOT)
    # Initialize repo if not already (for demo)
    if not dp8_vcs_integrator.git_initialized:
        dp8_vcs_integrator.initialize_repository()

    # DP0: Workflow Controller (needs other DPs)
    dp0_workflow_controller = WorkflowController(
        template_manager=dp1_template_manager,
        lexicon_service=dp2_lexicon_service,
        knowledge_retriever=dp3_knowledge_retriever,
        knowledge_arbiter=dp4_arbiter,
        content_engine=dp5_content_engine,
        review_engine=dp6_review_engine,
        vcs_integrator=dp8_vcs_integrator
        # UI Handler will be passed later or DP0 can instantiate it if preferred
    )

    # DP7: User Interface Handler (needs DP0)
    dp7_ui_handler = UserInterfaceHandler(workflow_controller=dp0_workflow_controller)
    # Now, if DP0 needs a reference to UI (e.g., for callbacks), set it.
    # dp0_workflow_controller.set_ui_handler(dp7_ui_handler) # If DP0 has such a method

    print("--- Axiomatic Designer Initialized Successfully ---")
    dp7_ui_handler.display_message("Welcome to the Axiomatic Designer (Conceptual CLI)", "info")

    # --- Example Workflow --- 
    # This is a very simplified flow. A real application would have a main loop in the UI handler.

    # 1. User creates a new project (simulated via UI)
    dp7_ui_handler.display_message("\nSimulating user action: Create New Project", "action")
    project_info = dp7_ui_handler.trigger_create_new_project() # This is a UI method that internally might call DP0
    if project_info:
        dp7_ui_handler.show_project_dashboard(project_info)
        # Simulate DP0 actually creating project artifacts and committing
        # dp0_workflow_controller.handle_new_project_creation(project_info['name'], project_info.get('template_id', 'default_project_template'))
        # For this demo, let's assume DP0's methods are called directly for simplicity in main
        dp0_workflow_controller.current_project_id = project_info.get("project_id", "sim_proj_main")
        dp0_workflow_controller.set_project_status(project_info.get("project_id", "sim_proj_main"), "Active")
        dp8_vcs_integrator.stage_files(["main.py"]) # Stage main.py as an example of project file
        dp8_vcs_integrator.commit_changes(f"Project '{project_info.get('name')}' created.")

    # 2. User requests to generate a document section (simulated via UI)
    dp7_ui_handler.display_message("\nSimulating user action: Generate Document Section", "action")
    # In a real app, project_id would be known from current context
    if dp0_workflow_controller.current_project_id:
        # Simulate UI getting details and calling a DP0 method
        # For demo, directly call a conceptual DP0 method or use UI's trigger which simulates it
        generated_doc_info = dp7_ui_handler.trigger_generate_document_section(dp0_workflow_controller.current_project_id)
        if generated_doc_info:
            dp7_ui_handler.show_document_draft("Generated Section", generated_doc_info['content'])
            # Simulate DP0 saving and committing this document
            # dp0_workflow_controller.save_document_draft(generated_doc_info['document_id'], generated_doc_info['content'])
            # dp8_vcs_integrator.stage_files([f"{generated_doc_info['document_id']}.txt"]) # Assuming it's saved
            # dp8_vcs_integrator.commit_changes(f"Drafted section for {generated_doc_info['document_id']}")

    # 3. User requests a review (conceptual)
    dp7_ui_handler.display_message("\nSimulating user action: Request Document Review", "action")
    if dp0_workflow_controller.current_project_id and generated_doc_info:
        # review_task = dp0_workflow_controller.prepare_review_task(generated_doc_info['document_id'])
        # feedback = dp6_review_engine.review_document_content(generated_doc_info['content'], review_task)
        # For demo, create a mock review task and call review engine directly
        mock_review_task_details = {
            "template_id": "default_project_template", # Assuming this template has review info
            "focus_areas": ["Clarity", "Completeness"]
        }
        feedback = dp6_review_engine.review_document_content(generated_doc_info['content'], mock_review_task_details)
        dp7_ui_handler.show_review_feedback(feedback)

    dp3_knowledge_retriever.disconnect()
    print("\n--- Axiomatic Designer Main Execution Finished ---")

if __name__ == "__main__":
    main()