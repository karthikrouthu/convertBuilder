class HTMLToMJMLConverter {
    constructor() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const convertBtn = document.getElementById('convertBtn');
        const copyBtn = document.getElementById('copyBtn');
        const htmlInput = document.getElementById('htmlInput');

        convertBtn.addEventListener('click', () => this.convertHTML());
        copyBtn.addEventListener('click', () => this.copyToClipboard());

        // Auto-convert on input change with debounce
        let timeout;
        htmlInput.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => this.convertHTML(), 500);
        });
    }

    showStatus(message, type = 'success') {
        const statusDiv = document.getElementById('statusMessage');
        statusDiv.innerHTML = `<div class="status-message status-${type}">${message}</div>`;
        setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 3000);
    }

    convertHTML() {
        const htmlInput = document.getElementById('htmlInput').value.trim();
        const outputDiv = document.getElementById('mjmlOutput');
        const copyBtn = document.getElementById('copyBtn');

        if (!htmlInput) {
            outputDiv.textContent = 'Your converted MJML code will appear here...';
            copyBtn.style.display = 'none';
            return;
        }

        try {
            const mjmlCode = this.htmlToMJML(htmlInput);
            outputDiv.textContent = mjmlCode;
            copyBtn.style.display = 'block';
            this.showStatus('✅ Conversion successful! Styling preserved.', 'success');
        } catch (error) {
            outputDiv.textContent = `Error: ${error.message}`;
            copyBtn.style.display = 'none';
            this.showStatus('❌ Conversion failed. Please check your HTML syntax.', 'error');
        }
    }

    htmlToMJML(htmlString) {
        // Parse the HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');

        // Extract styles from the HTML
        const styles = this.extractStyles(doc);

        // Convert the body content
        const bodyContent = doc.body || doc.documentElement;
        const mjmlBody = this.convertElement(bodyContent, styles);

        // Build comprehensive MJML structure with enhanced style preservation
        const mjml = `<mjml>
  <mj-head>
    <mj-title>Converted Email</mj-title>
    <mj-preview>Email converted from HTML</mj-preview>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
      <mj-text padding="0" />
      <mj-section padding="0" />
      <mj-column padding="0" />
    </mj-attributes>
    ${styles.cssStyles ? `<mj-style>
      ${styles.cssStyles}
      /* Ensure exact style preservation */
      * { box-sizing: border-box; }
      table { border-collapse: collapse; }
      .preserve-bg { background-color: inherit !important; }
    </mj-style>` : `<mj-style>
      /* Ensure exact style preservation */
      * { box-sizing: border-box; }
      table { border-collapse: collapse; }
      .preserve-bg { background-color: inherit !important; }
    </mj-style>`}
  </mj-head>
  <mj-body>
    ${mjmlBody}
  </mj-body>
</mjml>`;

        return this.formatMJML(mjml);
    }

    extractStyles(doc) {
        let cssStyles = '';
        const classStyles = {};

        // Extract style tags
        const styleTags = doc.querySelectorAll('style');
        styleTags.forEach(style => {
            cssStyles += style.textContent + '\n';

            // Parse CSS to extract class styles
            this.parseCSS(style.textContent, classStyles);
        });

        // Extract link stylesheets (just note them, can't fetch in browser)
        const linkTags = doc.querySelectorAll('link[rel="stylesheet"]');
        if (linkTags.length > 0) {
            cssStyles += '/* Note: External stylesheets detected but not imported */\n';
        }

        return {
            cssStyles: cssStyles.trim(),
            classStyles: classStyles
        };
    }

    parseCSS(cssText, classStyles) {
        // Simple CSS parser to extract class styles
        const rules = cssText.match(/\.[^{]+\{[^}]*\}/g) || [];

        rules.forEach(rule => {
            const match = rule.match(/\.([^{,\s]+)\s*\{([^}]*)\}/);
            if (match) {
                const className = match[1];
                const styles = match[2];

                // Parse individual style properties
                const styleObj = {};
                styles.split(';').forEach(prop => {
                    const [property, value] = prop.split(':').map(s => s.trim());
                    if (property && value) {
                        styleObj[property] = value;
                    }
                });

                classStyles[className] = styleObj;
            }
        });
    }

    mergeStyles(element, classStyles) {
        const mergedStyles = {};

        // Add CSS class styles
        if (element.className) {
            const classNames = element.className.split(' ');
            classNames.forEach(className => {
                if (classStyles[className]) {
                    Object.assign(mergedStyles, classStyles[className]);
                }
            });
        }

        // Add inline styles (these override class styles)
        if (element.style) {
            const inlineStyleObj = this.parseInlineStyles(element.style.cssText);
            Object.assign(mergedStyles, inlineStyleObj);
        }

        return mergedStyles;
    }

    buildCSSText(styleObj) {
        return Object.entries(styleObj)
            .map(([property, value]) => `${property}: ${value}`)
            .join('; ');
    }

    convertElement(element, styles, depth = 0) {
        if (!element || element.nodeType === Node.TEXT_NODE) {
            return element ? element.textContent.trim() : '';
        }

        const tagName = element.tagName ? element.tagName.toLowerCase() : '';
        const inlineStyles = element.style ? element.style.cssText : '';
        const className = element.className || '';
        const attributes = this.getElementAttributes(element);

        // Merge CSS class styles with inline styles
        const combinedStyles = this.mergeStyles(element, styles.classStyles || {});

        // Skip html, head, body tags at root level
        if (depth === 0 && ['html', 'head', 'body'].includes(tagName)) {
            return this.convertChildren(element, styles, depth);
        }

        let mjmlContent = '';

        switch (tagName) {
            case 'div':
            case 'section':
                mjmlContent = this.convertContainer(element, styles, depth);
                break;

            case 'table':
                mjmlContent = this.convertTable(element, styles, depth);
                break;

            case 'tr':
                mjmlContent = this.convertTableRow(element, styles, depth);
                break;

            case 'td':
            case 'th':
                mjmlContent = this.convertTableCell(element, styles, depth);
                break;

            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                mjmlContent = this.convertHeading(element, styles, depth);
                break;

            case 'p':
                mjmlContent = this.convertParagraph(element, styles, depth);
                break;

            case 'a':
                mjmlContent = this.convertLink(element, styles, depth);
                break;

            case 'button':
                mjmlContent = this.convertButton(element, styles, depth);
                break;

            case 'img':
                mjmlContent = this.convertImage(element, styles, depth);
                break;

            case 'span':
            case 'strong':
            case 'b':
            case 'em':
            case 'i':
                mjmlContent = this.convertInlineElement(element, styles, depth);
                break;

            case 'br':
                return '<br/>';

            case 'hr':
                mjmlContent = `<mj-divider border-width="1px" border-color="#cccccc" />`;
                break;

            default:
                // For unknown elements, treat as container
                mjmlContent = this.convertContainer(element, styles, depth);
                break;
        }

        return mjmlContent;
    }

    convertContainer(element, styles, depth) {
        const combinedStyles = this.mergeStyles(element, styles.classStyles || {});
        const children = this.convertChildren(element, styles, depth + 1);

        // Determine if this should be a section or column
        const hasBlockChildren = this.hasBlockChildren(element);

        if (depth === 0 || hasBlockChildren) {
            // For containers with background, apply to both section and column for better compatibility
            const sectionAttrs = this.buildStyleAttributes(combinedStyles, 'section');
            const columnAttrs = this.buildStyleAttributes(combinedStyles, 'column');

            return `<mj-section ${sectionAttrs}>
      <mj-column ${columnAttrs}>
        ${children}
      </mj-column>
    </mj-section>`;
        } else {
            // For inline containers, preserve all styles in mj-text and the div
            const textAttrs = this.buildStyleAttributes(combinedStyles, 'text');
            const preservedStyles = this.buildCSSText(combinedStyles);

            return `<mj-text ${textAttrs}>
      <div style="${preservedStyles}">${children}</div>
    </mj-text>`;
        }
    }

    convertTable(element, styles, depth) {
        const combinedStyles = this.mergeStyles(element, styles.classStyles || {});
        const children = this.convertChildren(element, styles, depth + 1);

        return `<mj-section ${this.buildStyleAttributes(combinedStyles, 'section')}>
      <mj-column>
        <mj-table ${this.buildStyleAttributes(combinedStyles, 'table')}>
          <table style="${this.buildCSSText(combinedStyles)}">
            ${children}
          </table>
        </mj-table>
      </mj-column>
    </mj-section>`;
    }

    convertTableRow(element, styles, depth) {
        const children = this.convertChildren(element, styles, depth + 1);
        const combinedStyles = this.mergeStyles(element, styles.classStyles || {});
        return `<tr style="${this.buildCSSText(combinedStyles)}">${children}</tr>`;
    }

    convertTableCell(element, styles, depth) {
        const children = this.convertChildren(element, styles, depth + 1);
        const combinedStyles = this.mergeStyles(element, styles.classStyles || {});
        return `<td style="${this.buildCSSText(combinedStyles)}">${children}</td>`;
    }

    convertHeading(element, styles, depth) {
        const combinedStyles = this.mergeStyles(element, styles.classStyles || {});
        const content = this.convertChildren(element, styles, depth + 1);
        const fontSize = this.getHeadingSize(element.tagName);

        return `<mj-text ${this.buildStyleAttributes(combinedStyles, 'text')} font-size="${fontSize}">
      <${element.tagName.toLowerCase()} style="${this.buildCSSText(combinedStyles)}">${content}</${element.tagName.toLowerCase()}>
    </mj-text>`;
    }

    convertParagraph(element, styles, depth) {
        const combinedStyles = this.mergeStyles(element, styles.classStyles || {});
        const content = this.convertChildren(element, styles, depth + 1);

        return `<mj-text ${this.buildStyleAttributes(combinedStyles, 'text')}>
      <p style="${this.buildCSSText(combinedStyles)}">${content}</p>
    </mj-text>`;
    }

    convertLink(element, styles, depth) {
        const href = element.getAttribute('href') || '#';
        const content = this.convertChildren(element, styles, depth + 1);
        const combinedStyles = this.mergeStyles(element, styles.classStyles || {});

        return `<a href="${href}" style="${this.buildCSSText(combinedStyles)}">${content}</a>`;
    }

    convertButton(element, styles, depth) {
        const combinedStyles = this.mergeStyles(element, styles.classStyles || {});
        const content = element.textContent || element.innerHTML;
        const href = element.getAttribute('onclick') ? '#' : (element.getAttribute('href') || '#');

        return `<mj-button ${this.buildStyleAttributes(combinedStyles, 'button')} href="${href}">
      ${content}
    </mj-button>`;
    }

    convertImage(element, styles, depth) {
        const src = element.getAttribute('src') || '';
        const alt = element.getAttribute('alt') || '';
        const combinedStyles = this.mergeStyles(element, styles.classStyles || {});

        return `<mj-image ${this.buildStyleAttributes(combinedStyles, 'image')} src="${src}" alt="${alt}" />`;
    }

    convertInlineElement(element, styles, depth) {
        const content = this.convertChildren(element, styles, depth + 1);
        const tag = element.tagName.toLowerCase();
        const combinedStyles = this.mergeStyles(element, styles.classStyles || {});

        return `<${tag} style="${this.buildCSSText(combinedStyles)}">${content}</${tag}>`;
    }

    convertChildren(element, styles, depth) {
        if (!element.childNodes) return '';

        let result = '';
        for (let child of element.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
                const text = child.textContent.trim();
                if (text) result += text;
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                result += this.convertElement(child, styles, depth);
            }
        }
        return result;
    }

    parseInlineStyles(cssText) {
        const styles = {};
        if (!cssText) return styles;

        cssText.split(';').forEach(rule => {
            if (rule.trim()) {
                const [property, value] = rule.split(':').map(s => s.trim());
                if (property && value) {
                    styles[property] = value;
                }
            }
        });

        return styles;
    }

    buildStyleAttributes(styles, componentType) {
        const attributes = [];

        // Enhanced CSS to MJML mapping with comprehensive background support
        const mappings = {
            'section': {
                'background-color': 'background-color',
                'background': 'background-color',
                'background-image': 'background-url',
                'background-repeat': 'background-repeat',
                'background-size': 'background-size',
                'padding': 'padding',
                'padding-top': 'padding-top',
                'padding-bottom': 'padding-bottom',
                'padding-left': 'padding-left',
                'padding-right': 'padding-right',
                'margin': 'padding',
                'text-align': 'text-align',
                'border': 'border',
                'border-radius': 'border-radius'
            },
            'column': {
                'background-color': 'background-color',
                'background': 'background-color',
                'padding': 'padding',
                'padding-top': 'padding-top',
                'padding-bottom': 'padding-bottom',
                'padding-left': 'padding-left',
                'padding-right': 'padding-right',
                'border': 'border',
                'border-radius': 'border-radius'
            },
            'text': {
                'color': 'color',
                'font-family': 'font-family',
                'font-size': 'font-size',
                'font-weight': 'font-weight',
                'text-align': 'align',
                'line-height': 'line-height',
                'padding': 'padding',
                'padding-top': 'padding-top',
                'padding-bottom': 'padding-bottom',
                'padding-left': 'padding-left',
                'padding-right': 'padding-right',
                'background-color': 'background-color',
                'background': 'background-color'
            },
            'button': {
                'background-color': 'background-color',
                'background': 'background-color',
                'color': 'color',
                'font-family': 'font-family',
                'font-size': 'font-size',
                'font-weight': 'font-weight',
                'padding': 'inner-padding',
                'border-radius': 'border-radius',
                'border': 'border',
                'text-align': 'align',
                'width': 'width',
                'height': 'height'
            },
            'image': {
                'width': 'width',
                'height': 'height',
                'padding': 'padding',
                'border': 'border',
                'border-radius': 'border-radius'
            },
            'table': {
                'width': 'width',
                'background-color': 'background-color',
                'background': 'background-color',
                'border': 'border',
                'border-collapse': 'border',
                'padding': 'padding'
            }
        };

        const mapping = mappings[componentType] || {};

        Object.entries(styles).forEach(([property, value]) => {
            // Handle background shorthand property
            if (property === 'background' && value) {
                const bgColor = this.extractBackgroundColor(value);
                if (bgColor) {
                    attributes.push(`background-color="${bgColor}"`);
                }
            } else {
                const mjmlAttr = mapping[property];
                if (mjmlAttr && value) {
                    attributes.push(`${mjmlAttr}="${value}"`);
                }
            }
        });

        return attributes.join(' ');
    }

    extractBackgroundColor(backgroundValue) {
        // Extract color from background shorthand (e.g., "red", "#ff0000", "rgb(255,0,0)")
        const colorRegex = /(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)|[a-zA-Z]+)/;
        const match = backgroundValue.match(colorRegex);
        return match ? match[0] : null;
    }

    hasBlockChildren(element) {
        const blockElements = ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'section', 'article'];

        for (let child of element.children || []) {
            if (blockElements.includes(child.tagName.toLowerCase())) {
                return true;
            }
        }
        return false;
    }

    getHeadingSize(tagName) {
        const sizes = {
            'H1': '32px',
            'H2': '24px',
            'H3': '20px',
            'H4': '18px',
            'H5': '16px',
            'H6': '14px'
        };
        return sizes[tagName.toUpperCase()] || '16px';
    }

    getElementAttributes(element) {
        const attrs = {};
        if (element.attributes) {
            for (let attr of element.attributes) {
                attrs[attr.name] = attr.value;
            }
        }
        return attrs;
    }

    formatMJML(mjmlString) {
        // Basic formatting for better readability
        let formatted = mjmlString;
        let indent = 0;
        const lines = formatted.split('\n');
        const result = [];

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;

            if (trimmed.startsWith('</')) {
                indent = Math.max(0, indent - 2);
            }

            result.push(' '.repeat(indent) + trimmed);

            if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>')) {
                indent += 2;
            }
        });

        return result.join('\n');
    }

    async copyToClipboard() {
        const outputDiv = document.getElementById('mjmlOutput');
        const text = outputDiv.textContent;

        try {
            await navigator.clipboard.writeText(text);
            this.showStatus('📋 MJML code copied to clipboard!', 'success');
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showStatus('📋 MJML code copied to clipboard!', 'success');
        }
    }
}

// Load example function
window.loadExample = function(element) {
    const htmlContent = element.innerHTML
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');

    document.getElementById('htmlInput').value = htmlContent;
    converter.convertHTML();
};

// Initialize the converter when the page loads
const converter = new HTMLToMJMLConverter();

// Add some helpful keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        converter.convertHTML();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && e.target.id === 'mjmlOutput') {
        converter.copyToClipboard();
    }
});

console.log('HTML to MJML Converter initialized!');