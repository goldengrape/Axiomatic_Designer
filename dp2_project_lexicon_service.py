"""
DP2: Project Lexicon Service

Responsibilities:
- Loads, stores, and provides access to the 'Project Lexicon and Constraints' file content.
- Ensures consistent application of project-wide terminology and rules.
- Implements L1 FR2: Manage project-level lexicon and constraints.
"""

import json
import os

class ProjectLexiconService:
    def __init__(self, lexicon_file_path: str = "./project_lexicon/lexicon.json"):
        self.lexicon_file_path = lexicon_file_path
        self.lexicon_data = {}
        self._load_lexicon()
        print(f"DP2: ProjectLexiconService initialized. Lexicon file: {self.lexicon_file_path}")

    def _load_lexicon(self) -> bool:
        """Loads the lexicon data from the specified file."""
        lexicon_dir = os.path.dirname(self.lexicon_file_path)
        if not os.path.exists(lexicon_dir):
            try:
                os.makedirs(lexicon_dir)
                print(f"DP2: Created lexicon directory: {lexicon_dir}")
            except OSError as e:
                print(f"DP2: Error creating lexicon directory {lexicon_dir} - {e}")
                return False
                
        if not os.path.exists(self.lexicon_file_path):
            # Create a default empty lexicon if it doesn't exist
            print(f"DP2: Lexicon file {self.lexicon_file_path} not found. Creating a default empty lexicon.")
            self.lexicon_data = {
                "terms": {},
                "abbreviations": {},
                "naming_conventions": [],
                "formatting_constraints": []
            }
            return self.save_lexicon() # Save the newly created default lexicon

        try:
            with open(self.lexicon_file_path, 'r', encoding='utf-8') as f:
                self.lexicon_data = json.load(f)
            print(f"DP2: Lexicon data loaded successfully from {self.lexicon_file_path}.")
            return True
        except IOError as e:
            print(f"DP2: Error loading lexicon file {self.lexicon_file_path} - {e}")
            self.lexicon_data = {} # Reset to empty if load fails
            return False
        except json.JSONDecodeError as e:
            print(f"DP2: Error decoding lexicon JSON from {self.lexicon_file_path} - {e}")
            self.lexicon_data = {} # Reset to empty if decode fails
            return False

    def save_lexicon(self) -> bool:
        """Saves the current lexicon data to the file."""
        try:
            lexicon_dir = os.path.dirname(self.lexicon_file_path)
            if not os.path.exists(lexicon_dir):
                 os.makedirs(lexicon_dir)
            with open(self.lexicon_file_path, 'w', encoding='utf-8') as f:
                json.dump(self.lexicon_data, f, indent=4)
            print(f"DP2: Lexicon data saved successfully to {self.lexicon_file_path}.")
            return True
        except IOError as e:
            print(f"DP2: Error saving lexicon file {self.lexicon_file_path} - {e}")
            return False

    def get_term_definition(self, term: str) -> str | None:
        """Retrieves the definition of a term."""
        return self.lexicon_data.get("terms", {}).get(term)

    def add_term(self, term: str, definition: str) -> bool:
        """Adds or updates a term and its definition."""
        if "terms" not in self.lexicon_data:
            self.lexicon_data["terms"] = {}
        self.lexicon_data["terms"][term] = definition
        return self.save_lexicon()

    def get_all_terms(self) -> dict:
        """Returns all terms and their definitions."""
        return self.lexicon_data.get("terms", {}).copy()

    def get_abbreviation(self, abbr: str) -> str | None:
        """Retrieves the full form of an abbreviation."""
        return self.lexicon_data.get("abbreviations", {}).get(abbr)

    def add_abbreviation(self, abbr: str, full_form: str) -> bool:
        """Adds or updates an abbreviation."""
        if "abbreviations" not in self.lexicon_data:
            self.lexicon_data["abbreviations"] = {}
        self.lexicon_data["abbreviations"][abbr] = full_form
        return self.save_lexicon()
        
    def get_naming_conventions(self) -> list:
        """Retrieves all naming conventions."""
        return self.lexicon_data.get("naming_conventions", []).copy()

    def add_naming_convention(self, convention: str) -> bool:
        """Adds a naming convention."""
        if "naming_conventions" not in self.lexicon_data:
            self.lexicon_data["naming_conventions"] = []
        if convention not in self.lexicon_data["naming_conventions"]:
            self.lexicon_data["naming_conventions"].append(convention)
            return self.save_lexicon()
        return True # Convention already exists

    def get_formatting_constraints(self) -> list:
        """Retrieves all formatting constraints."""
        return self.lexicon_data.get("formatting_constraints", []).copy()

    def add_formatting_constraint(self, constraint: str) -> bool:
        """Adds a formatting constraint."""
        if "formatting_constraints" not in self.lexicon_data:
            self.lexicon_data["formatting_constraints"] = []
        if constraint not in self.lexicon_data["formatting_constraints"]:
            self.lexicon_data["formatting_constraints"].append(constraint)
            return self.save_lexicon()
        return True # Constraint already exists

    def get_full_lexicon(self) -> dict:
        """Returns a copy of the entire lexicon data."""
        return self.lexicon_data.copy()

if __name__ == '__main__':
    test_lexicon_file = "./test_lexicon_data/test_lex.json"
    # Ensure clean state for testing
    if os.path.exists(test_lexicon_file):
        os.remove(test_lexicon_file)
    if os.path.exists(os.path.dirname(test_lexicon_file)) and not os.listdir(os.path.dirname(test_lexicon_file)):
        os.rmdir(os.path.dirname(test_lexicon_file))
        
    service = ProjectLexiconService(lexicon_file_path=test_lexicon_file)
    print("\n--- DP2: ProjectLexiconService Test --- ")

    # Test with a fresh (default) lexicon
    print("Initial lexicon:", service.get_full_lexicon())
    assert service.get_term_definition("FR") is None

    # Add terms
    service.add_term("FR", "Functional Requirement")
    service.add_term("DP", "Design Parameter")
    assert service.get_term_definition("FR") == "Functional Requirement"
    print("Terms after adding:", service.get_all_terms())

    # Add abbreviations
    service.add_abbreviation("AD", "Axiomatic Design")
    assert service.get_abbreviation("AD") == "Axiomatic Design"

    # Add naming conventions
    service.add_naming_convention("Variables in snake_case")
    assert "Variables in snake_case" in service.get_naming_conventions()

    # Add formatting constraints
    service.add_formatting_constraint("Max line length 120 characters")
    assert "Max line length 120 characters" in service.get_formatting_constraints()

    print("Lexicon after additions:", service.get_full_lexicon())

    # Test loading an existing lexicon
    service_reloaded = ProjectLexiconService(lexicon_file_path=test_lexicon_file)
    assert service_reloaded.get_term_definition("DP") == "Design Parameter"
    assert service_reloaded.get_abbreviation("AD") == "Axiomatic Design"
    print("DP2: Reload test successful.")

    # Clean up test file and directory
    if os.path.exists(test_lexicon_file):
        os.remove(test_lexicon_file)
    test_lexicon_dir = os.path.dirname(test_lexicon_file)
    if os.path.exists(test_lexicon_dir) and not os.listdir(test_lexicon_dir):
        os.rmdir(test_lexicon_dir)
    print("DP2: Test completed and cleaned up.")