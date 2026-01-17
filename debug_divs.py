import re

def check_div_balance(file_path):
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    depth = 0
    for i, line in enumerate(lines):
        # Remove comments to avoid false matches
        line_no_comment = re.sub(r'\{/\*.*?\*/\}', '', line)
        line_no_comment = re.sub(r'//.*', '', line_no_comment)
        
        openings = len(re.findall(r'<div(?![a-zA-Z0-9])', line_no_comment))
        closings = len(re.findall(r'</div(?![a-zA-Z0-9])', line_no_comment))
        
        if openings > 0 or closings > 0:
            depth += openings - closings
            print(f"Line {i+1:4}: {openings:+} | {closings:-} | Depth: {depth:2} | {line.strip()[:50]}")
        
    return depth

check_div_balance('/Users/Angel/Downloads/grupo-magno-inmobiliario 2/screens/AdminDashboard.tsx')
