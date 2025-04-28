#!/usr/bin/env python

def fix_indentation():
    """Fix indentation issues in the mental_health_assistant.py file."""
    file_path = "ai-agent-assistant/mental_health_assistant/mental_health_assistant.py"
    fixed_code = []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    in_problem_area = False
    fixed_valence_block = False
    
    for i, line in enumerate(lines):
        # Check if we're in the problematic section with the valence processing
        if "elif \"valence\" in line.lower():" in line:
            in_problem_area = True
            fixed_code.append(line)
        elif in_problem_area and "else:" in line:
            # This is the problematic else clause
            fixed_code.append(line)
            # The next line should be indented correctly
            if i + 1 < len(lines) and "emotion_data" in lines[i + 1]:
                fixed_code.append("                        emotion_data[\"emotional_valence\"] = \"neutral\"\n")
                fixed_valence_block = True
        elif in_problem_area and fixed_valence_block and "emotion_data[\"emotional_valence\"] = \"neutral\"" in line:
            # Skip this line as we've already added the correct indentation
            continue
        elif in_problem_area and "elif \"confidence\" in line.lower():" in line:
            # Fix the indentation of the elif clause
            fixed_code.append("                elif \"confidence\" in line.lower():\n")
            in_problem_area = False  # End of problematic section
            fixed_valence_block = False
        else:
            fixed_code.append(line)
    
    # Write the fixed content back to the file
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(fixed_code)
    
    print(f"Fixed indentation issues in {file_path}")

if __name__ == "__main__":
    fix_indentation() 