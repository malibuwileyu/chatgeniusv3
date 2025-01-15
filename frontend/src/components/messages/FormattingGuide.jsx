/**
 * @file FormattingGuide.jsx
 * @description Formatting guide component that displays markdown syntax examples
 * with live preview. This component helps users understand available formatting
 * options for messages.
 * 
 * Core Functionality:
 * - Markdown syntax examples
 * - Live preview
 * - Toggle visibility
 * 
 * Features:
 * - Interactive toggle
 * - Rich text preview
 * - Comprehensive examples
 * - Popup positioning
 * - Scrollable content
 * - Responsive design
 * 
 * Dependencies:
 * - react
 * - ./FormattedMessage
 * 
 * @version 1.0.0
 * @created 2024-01-14
 */

import { useState } from 'react';
import FormattedMessage from './FormattedMessage';

function FormattingGuide() {
    const [isOpen, setIsOpen] = useState(false);

    const exampleMarkdown = `
Here's how to format your messages:

**Bold text** or __bold text__
*Italic text* or _italic text_
~~Strikethrough text~~

# Heading 1
## Heading 2
### Heading 3

* Bullet point
* Another point
  * Nested point

1. Numbered list
2. Second item
   * Mixed list

> Quote text
> Multiple lines

\`Inline code\`

\`\`\`
Code block
Multiple lines
\`\`\`

[Link text](https://example.com)

| Table | Header |
|-------|--------|
| Cell  | Cell   |

***
Horizontal rule above
`;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-gray-500 hover:text-gray-700 text-sm"
            >
                {isOpen ? 'Hide formatting guide' : 'Show formatting guide'}
            </button>

            {isOpen && (
                <div className="absolute bottom-full mb-2 w-96 bg-white rounded-lg shadow-lg border p-4 z-10">
                    <div className="max-h-96 overflow-y-auto">
                        <h3 className="font-semibold mb-2">Markdown Formatting Guide</h3>
                        <FormattedMessage content={exampleMarkdown} />
                    </div>
                </div>
            )}
        </div>
    );
}

export default FormattingGuide; 