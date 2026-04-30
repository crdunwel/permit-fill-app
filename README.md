# Miami-Dade Permit Helper

Simple web app to fill out a Miami-Dade permit PDF.

## Quick Start

``` bash
npm install
npm run dev
```

Open: http://localhost:5173/

## Build

``` bash
npm run build
npm run preview
```

## How it Works

-   Loads `building-permit.pdf`
-   Maps form inputs → PDF fields (`pdf-lib`)
-   Captures signature (canvas)
-   Generates + downloads completed PDF

## Key Points

-   No backend
-   No data stored
-   Runs entirely in browser

## Project Structure

    public/
      building-permit.pdf

    src/
      App.tsx
      App.css
      main.tsx

## Gotchas

-   Some permits may still require:
    -   wet signatures
    -   notarization
-   PDF field names must match exactly
-   `mailto:` links depend on user email client

## Dev Notes

-   Keep it simple
-   Avoid adding backend unless necessary

## License

MIT
