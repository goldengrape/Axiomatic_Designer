"""
DP1: Project Template Manager

Responsibilities:
- Handles CRUD (Create, Read, Update, Delete) operations for project templates.
- Provides on-demand loading of configuration data for other parts of the system.
- Implements L1 FR1: Manage project configuration templates.
"""

import json
import os

class ProjectTemplateManager:
    def __init__(self, template_dir: str = "./project_templates"):
        self.template_dir = template_dir
        if not os.path.exists(self.template_dir):
            os.makedirs(self.template_dir)
        print(f"DP1: ProjectTemplateManager initialized. Template directory: {self.template_dir}")

    def create_template(self, template_id: str, template_data: dict) -> bool:
        """Creates a new project template."""
        file_path = os.path.join(self.template_dir, f"{template_id}.json")
        if os.path.exists(file_path):
            print(f"DP1: Error - Template {template_id} already exists.")
            return False
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(template_data, f, indent=4)
            print(f"DP1: Template {template_id} created successfully.")
            return True
        except IOError as e:
            print(f"DP1: Error creating template {template_id} - {e}")
            return False

    def get_template(self, template_id: str) -> dict | None:
        """Retrieves a project template."""
        file_path = os.path.join(self.template_dir, f"{template_id}.json")
        if not os.path.exists(file_path):
            print(f"DP1: Error - Template {template_id} not found.")
            return None
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                template_data = json.load(f)
            print(f"DP1: Template {template_id} loaded successfully.")
            return template_data
        except IOError as e:
            print(f"DP1: Error loading template {template_id} - {e}")
            return None
        except json.JSONDecodeError as e:
            print(f"DP1: Error decoding template {template_id} - {e}")
            return None

    def update_template(self, template_id: str, template_data: dict) -> bool:
        """Updates an existing project template."""
        file_path = os.path.join(self.template_dir, f"{template_id}.json")
        if not os.path.exists(file_path):
            print(f"DP1: Error - Template {template_id} not found. Cannot update.")
            return False
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(template_data, f, indent=4)
            print(f"DP1: Template {template_id} updated successfully.")
            return True
        except IOError as e:
            print(f"DP1: Error updating template {template_id} - {e}")
            return False

    def delete_template(self, template_id: str) -> bool:
        """Deletes a project template."""
        file_path = os.path.join(self.template_dir, f"{template_id}.json")
        if not os.path.exists(file_path):
            print(f"DP1: Error - Template {template_id} not found. Cannot delete.")
            return False
        try:
            os.remove(file_path)
            print(f"DP1: Template {template_id} deleted successfully.")
            return True
        except IOError as e:
            print(f"DP1: Error deleting template {template_id} - {e}")
            return False

    def list_templates(self) -> list[str]:
        """Lists all available template IDs."""
        try:
            templates = [f.split('.')[0] for f in os.listdir(self.template_dir) if f.endswith('.json')]
            return templates
        except IOError as e:
            print(f"DP1: Error listing templates - {e}")
            return []

if __name__ == '__main__':
    manager = ProjectTemplateManager(template_dir="./test_templates")
    print("\n--- DP1: ProjectTemplateManager Test --- ")
    
    # Create
    sample_template_data = {
        "version": "1.0",
        "settings": {"max_review_cycles": 3, "llm_style": "critical"},
        "structure": ["Introduction", "Body", "Conclusion"],
        "checklist": ["Check A", "Check B"],
        "info_axiom_metrics": [{"id": "metric1", "name": "Metric One"}]
    }
    manager.create_template("test_template_01", sample_template_data)
    
    # List
    print("Available templates:", manager.list_templates())
    
    # Get
    retrieved_template = manager.get_template("test_template_01")
    if retrieved_template:
        # print("Retrieved test_template_01:", json.dumps(retrieved_template, indent=2))
        pass

    # Update
    updated_data = sample_template_data.copy()
    updated_data["settings"]["max_review_cycles"] = 5
    manager.update_template("test_template_01", updated_data)
    retrieved_updated_template = manager.get_template("test_template_01")
    if retrieved_updated_template:
        # print("Updated test_template_01:", json.dumps(retrieved_updated_template, indent=2))
        assert retrieved_updated_template["settings"]["max_review_cycles"] == 5
        print("DP1: Update verified.")

    # Get non-existent
    manager.get_template("non_existent_template")

    # Delete
    manager.delete_template("test_template_01")
    manager.delete_template("test_template_01") # Try deleting again
    print("Available templates after delete:", manager.list_templates())

    # Clean up test directory
    if os.path.exists("./test_templates/test_template_01.json"):
        os.remove("./test_templates/test_template_01.json")
    if os.path.exists("./test_templates") and not os.listdir("./test_templates"):
        os.rmdir("./test_templates")
    print("DP1: Test completed and cleaned up.")