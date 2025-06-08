"""
DP7: User Interface & Interaction Handler

Responsibilities:
- Provides the means for users to interact with the system.
- Presents information to the user (e.g., project status, document drafts, review feedback).
- Captures user input and commands.
- Triggers actions in other DPs, likely via the WorkflowController (DP0).
- Implements L1 FR7: Provide user interface for system interaction.

Note: This is a conceptual placeholder. A full UI could be web-based, a desktop app,
       or a sophisticated CLI. For now, it will simulate interactions.
"""

class UserInterfaceHandler:
    def __init__(self, workflow_controller=None):
        # The UI handler will need to communicate with the workflow controller (DP0)
        # to initiate actions and get data.
        self.workflow_controller = workflow_controller 
        print("DP7: UserInterfaceHandler initialized.")

    def display_message(self, message: str, message_type: str = "info"):
        """Displays a message to the user."""
        print(f"[UI - {message_type.upper()}]: {message}")

    def get_user_input(self, prompt: str) -> str:
        """Gets input from the user."""
        return input(f"[UI - INPUT]: {prompt}\n> ")

    def display_menu(self, menu_options: dict) -> str:
        """
        Displays a menu of options and gets the user's choice.
        menu_options: e.g., {"1": "Create Project", "2": "Open Project", "q": "Quit"}
        Returns the user's selected key.
        """
        print("\n[UI - MENU]")
        for key, description in menu_options.items():
            print(f"  {key}) {description}")
        choice = self.get_user_input("Please select an option:")
        return choice

    def show_project_dashboard(self, project_data: dict):
        """Displays a summary of the project."""
        self.display_message("Project Dashboard:", "header")
        if not project_data:
            self.display_message("No project data to display.")
            return
        for key, value in project_data.items():
            self.display_message(f"  {key.replace('_', ' ').title()}: {value}")

    def show_document_draft(self, document_title: str, content: str):
        """Displays a document draft."""
        self.display_message(f"Document Draft: {document_title}", "header")
        print("--- DRAFT START ---")
        print(content)
        print("--- DRAFT END ---")

    def show_review_feedback(self, feedback: dict):
        """Displays review feedback."""
        self.display_message("Review Feedback:", "header")
        if not feedback or not feedback.get("findings"):
            self.display_message("No feedback to display or feedback is not in expected format.")
            return
        
        summary = feedback.get("summary", "No summary provided.")
        self.display_message(f"Summary: {summary}")
        
        for finding in feedback.get("findings", []):
            self.display_message(
                f"  - Finding ID: {finding.get('id', 'N/A')}, Severity: {finding.get('severity', 'N/A')}\n"
                f"    Description: {finding.get('description', 'N/A')}\n"
                f"    Recommendation: {finding.get('recommendation', 'N/A')}"
            )
        if feedback.get("raw_llm_output"):
            self.display_message("Raw LLM output available if needed.", "debug")

    # --- Example methods that would trigger backend actions via DP0 ---
    def trigger_create_new_project(self):
        if not self.workflow_controller:
            self.display_message("Workflow controller not available.", "error")
            return None
        
        project_name = self.get_user_input("Enter project name:")
        template_id = self.get_user_input("Enter template ID (e.g., 'default_template'):")
        # In a real scenario, DP0 would handle this and return status/project_id
        # return self.workflow_controller.create_project(project_name, template_id)
        self.display_message(f"Simulating project creation for '{project_name}' with template '{template_id}'.")
        return {"project_id": "sim_proj_123", "name": project_name, "status": "created"}

    def trigger_generate_document_section(self, project_id: str):
        if not self.workflow_controller:
            self.display_message("Workflow controller not available.", "error")
            return None
        
        doc_type = self.get_user_input("Enter document type (e.g., 'FRD', 'SystemSpec'):")
        section_topic = self.get_user_input("Enter section topic/prompt:")
        # return self.workflow_controller.generate_document_section(project_id, doc_type, section_topic)
        self.display_message(f"Simulating document generation for project '{project_id}', type '{doc_type}', topic '{section_topic}'.")
        return {"document_id": "sim_doc_456", "content": f"Simulated content for {section_topic}."}

if __name__ == '__main__':
    ui = UserInterfaceHandler() # No workflow controller for standalone test
    print("\n--- DP7: UserInterfaceHandler Test --- ")

    ui.display_message("Welcome to the Axiomatic Designer CLI (Conceptual).")
    
    # Test menu
    # options = {"1": "Create New Project", "c": "Configure Settings", "q": "Quit"}
    # choice = ui.display_menu(options)
    # ui.display_message(f"You selected: {choice}")

    # Test input
    # user_name = ui.get_user_input("What is your name?")
    # ui.display_message(f"Hello, {user_name}!")

    # Test displaying data (mocked)
    mock_project_data = {
        "project_id": "proj_alpha_001",
        "project_name": "Alpha Test Project",
        "status": "In Progress",
        "current_document": "FRD_v0.1.docx"
    }
    ui.show_project_dashboard(mock_project_data)

    mock_draft_content = "## 1. Introduction\nThis is the first draft of the introduction.\n\n## 2. Requirements\n- FR1: ...\n- FR2: ..."
    ui.show_document_draft("Functional Requirements Document - Draft 1", mock_draft_content)

    mock_feedback = {
        "summary": "Overall good, but needs more detail in section 2.",
        "findings": [
            {"id": "F001", "description": "Section 2 lacks specific metrics for FR1.", "severity": "High", "recommendation": "Add quantifiable metrics for FR1."}, 
            {"id": "F002", "description": "Terminology in Introduction is inconsistent with project lexicon.", "severity": "Medium", "recommendation": "Revise terms like 'system' to 'platform' as per lexicon."}
        ],
        "raw_llm_output": "[...some lengthy LLM text...]"
    }
    ui.show_review_feedback(mock_feedback)

    # Test triggering actions (simulated)
    ui.trigger_create_new_project()
    ui.trigger_generate_document_section("sim_proj_123")

    print("\nDP7: Test completed. Run this file to see conceptual UI interactions.")