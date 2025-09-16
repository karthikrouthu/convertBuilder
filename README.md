# HTML to MJML Converter

A powerful web application that converts HTML code to MJML with perfect styling preservation.

## Features

✅ **Perfect Style Preservation** - Maintains all inline styles, CSS classes, and styling properties
✅ **CSS Class Support** - Parses `<style>` tags and applies class-based styling
✅ **Real-time Conversion** - See results instantly as you type
✅ **Smart Element Mapping** - Converts HTML elements to appropriate MJML components
✅ **Copy to Clipboard** - Easy copying of generated MJML code
✅ **Mobile Responsive** - Works perfectly on all devices
✅ **No Backend Required** - Pure client-side application

## Usage

1. **Paste HTML** - Add your HTML code in the left panel
2. **Convert** - Click "Convert to MJML" or it auto-converts as you type
3. **Copy** - Use the copy button to get the MJML code
4. **Test** - Try the provided examples to see the conversion in action

## Supported Elements

- **Containers**: `div`, `section` → `mj-section`, `mj-column`
- **Text**: `h1-h6`, `p`, `span` → `mj-text`
- **Tables**: `table`, `tr`, `td` → `mj-table`
- **Buttons**: `button`, `a` with button styling → `mj-button`
- **Images**: `img` → `mj-image`
- **Styling**: All CSS properties, classes, and inline styles

## Development

```bash
npm install
npm run dev
```

## Building for Production

```bash
npm run build
```

## Technologies Used

- **Vite** - Build tool and dev server
- **Vanilla JavaScript** - No frameworks needed
- **CSS3** - Modern styling
- **MJML** - Email markup language

## License

MIT License - Feel free to use and modify!