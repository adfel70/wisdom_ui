# Wisdom UI - Database Browser & Search

A modern, sleek React-based database browser and search application with Material-UI components. This application allows users to search across multiple databases and tables with powerful filtering capabilities.

## Features

- **🔍 Fast Search**: Search across all databases and tables instantly
- **🎯 Smart Filters**: Filter by year, category, region, and table name
- **📊 Rich Data Views**: Browse and explore detailed table data with expandable views
- **🎨 Modern UI**: Built with Material-UI for a sleek, professional interface
- **📱 Responsive Design**: Works seamlessly on desktop and mobile devices
- **⚡ Fast Performance**: Built with Vite for lightning-fast development and builds
- **🔌 Offline Support**: Designed to run in offline environments with mock data

## Project Structure

```
wisdom_ui/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── DatabaseTabs.jsx
│   │   ├── EmptyState.jsx
│   │   ├── FilterModal.jsx
│   │   ├── SearchBar.jsx
│   │   └── TableCard.jsx
│   ├── data/                # Mock database data
│   │   └── mockDatabase.js
│   ├── pages/               # Page components
│   │   ├── HomePage.jsx
│   │   └── SearchResultsPage.jsx
│   ├── theme/               # MUI theme configuration
│   │   └── theme.js
│   ├── utils/               # Utility functions
│   │   └── searchUtils.js
│   ├── App.jsx              # Main app component with routing
│   ├── main.jsx             # App entry point
│   └── index.css            # Global styles
├── package.json
└── vite.config.js
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository or navigate to the project directory:
   ```bash
   cd wisdom_ui
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173/`

### Building for Production

Build the application for production:
```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

Preview the production build locally:
```bash
npm run preview
```

## Usage

### Home Page

The home page features a centered search interface with:
- Search input for querying across all databases
- Filter button to apply advanced filters
- Information cards explaining key features

### Search Results

After performing a search, you'll see:
- Database tabs to switch between different databases
- Table cards showing matching results
- Expandable data views with highlighted search terms
- Back button to return to the home page

### Filtering

Click the "Filter Tables" button to access advanced filters:
- **Table Name**: Search for tables by name
- **Year**: Filter by specific years
- **Category**: Filter by table categories
- **Region/Country**: Filter by geographical region

## Mock Data Structure

The application uses mock data defined in `src/data/mockDatabase.js`. Each database contains:

- **Database Information**
  - ID
  - Name
  - Description
  - Tables array

- **Table Information**
  - ID
  - Name
  - Year
  - Country/Region
  - Categories
  - Record count
  - Column definitions
  - Data rows

### Adding New Mock Data

To add new tables or databases, edit `src/data/mockDatabase.js`:

```javascript
{
  id: 'db_new',
  name: 'New Database',
  description: 'Description of the database',
  tables: [
    {
      id: 't_new',
      name: 'New_Table',
      year: 2024,
      country: 'USA',
      categories: ['Category1', 'Category2'],
      count: 100,
      columns: ['Column1', 'Column2', 'Column3'],
      data: [
        { Column1: 'Value1', Column2: 'Value2', Column3: 'Value3' },
        // ... more rows
      ]
    }
  ]
}
```

## Technology Stack

- **React 19** - UI library
- **Material-UI (MUI)** - Component library
- **React Router** - Client-side routing
- **Vite** - Build tool and dev server
- **Emotion** - CSS-in-JS for MUI styling

## Customization

### Theme

The MUI theme can be customized in `src/theme/theme.js`. You can modify:
- Color palette
- Typography
- Component styles
- Shadows and borders

### Styling

The application uses MUI's `sx` prop for styling. Global styles are minimal and defined in `src/index.css`.

## Offline Deployment

This application is designed to work offline. To deploy:

1. Build the application:
   ```bash
   npm run build
   ```

2. Copy the `dist/` folder to your offline environment

3. Serve the files using any static file server:
   ```bash
   # Example with Python
   cd dist
   python -m http.server 8080
   ```

4. Access the application at `http://localhost:8080`

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is private and proprietary.

## Contributing

This is a private project. Please contact the maintainer for contribution guidelines.
