# School Bus — University Brand Style Guide

## Typography

### Official university font

| Property | Value |
|----------|-------|
| Font family | **Montserrat** |
| Font weight | **Medium (500)** |
| Font size | **+11** |
| Use case | All university-branded school-bus materials |

### Usage

Use **Montserrat Medium** at **+11** as the primary typeface for the school bus project (signage, documents, web assets, and any other university-branded deliverables).

CSS example:

```css
:root {
  --university-font-family: "Montserrat", sans-serif;
  --university-font-weight: 500; /* Medium */
  --university-font-size: +11; /* per university specification */
}

.university-text {
  font-family: var(--university-font-family);
  font-weight: var(--university-font-weight);
  font-size: var(--university-font-size);
}
```

### Fallback

If Montserrat is unavailable, fall back to the generic sans-serif stack:

```css
font-family: "Montserrat", -apple-system, BlinkMacSystemFont, "Segoe UI",
  Roboto, Helvetica, Arial, sans-serif;
```

---

*Specification: The University official font is Montserrat Medium +11.*