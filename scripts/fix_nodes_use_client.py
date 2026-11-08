with open(r'd:\phim ai thời trang\components\canvas\nodes.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Remove the misplaced imports at the very beginning
bad_prefix = 'import { Model3DNode } from "./model3d-node";\r\nimport { VoiceNode } from "./voice-node";\r\n'
bad_prefix_lf = 'import { Model3DNode } from "./model3d-node";\nimport { VoiceNode } from "./voice-node";\n'

if code.startswith(bad_prefix):
    code = code[len(bad_prefix):]
elif code.startswith(bad_prefix_lf):
    code = code[len(bad_prefix_lf):]

# Now insert after "use client";
use_client_crlf = '"use client";\r\n'
use_client_lf = '"use client";\n'

import_block = 'import { Model3DNode } from "./model3d-node";\r\nimport { VoiceNode } from "./voice-node";\r\n'

if use_client_crlf in code:
    code = code.replace(use_client_crlf, use_client_crlf + import_block, 1)
elif use_client_lf in code:
    code = code.replace(use_client_lf, use_client_lf + import_block, 1)

with open(r'd:\phim ai thời trang\components\canvas\nodes.tsx', 'w', encoding='utf-8', newline='') as f:
    f.write(code)

print("Fixed 'use client' at top of nodes.tsx!")
