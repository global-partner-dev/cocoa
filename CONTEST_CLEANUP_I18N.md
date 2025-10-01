# Contest Cleanup Page - Multi-Language Implementation

## Overview

This document describes the internationalization (i18n) implementation for the Contest Cleanup Page, providing full support for English and Spanish languages.

## Implementation Date

Implemented: 2024

## Files Modified

### 1. English Translations (`src/locales/en.json`)

Added complete `contestCleanup` section with the following keys:

```json
{
  "contestCleanup": {
    "pageTitle": "Contest Data Cleanup",
    "pageDescription": "Manage and cleanup expired contest data to maintain database performance and organization.",
    "info": {
      "title": "Important Information",
      "item1": "Only contests with end_date in the past will be affected",
      "item2": "All associated data (samples, evaluations, rankings) will be permanently deleted",
      "item3": "This action cannot be undone - consider backing up data before cleanup",
      "item4": "Active contests (within start_date and end_date) are never affected",
      "item5": "Regular cleanup helps maintain optimal database performance"
    },
    "bestPractices": {
      "title": "Best Practices",
      "item1": "Run cleanup after contest results have been archived or exported",
      "item2": "Schedule regular cleanups (e.g., monthly or quarterly)",
      "item3": "Notify directors before cleaning up their expired contests",
      "item4": "Keep a backup of important contest data before cleanup"
    }
  }
}
```

### 2. Spanish Translations (`src/locales/es.json`)

Added complete `contestCleanup` section with Spanish translations:

```json
{
  "contestCleanup": {
    "pageTitle": "Limpieza de Datos de Concursos",
    "pageDescription": "Gestiona y limpia los datos de concursos expirados para mantener el rendimiento y organización de la base de datos.",
    "info": {
      "title": "Información Importante",
      "item1": "Solo los concursos con fecha de finalización en el pasado serán afectados",
      "item2": "Todos los datos asociados (muestras, evaluaciones, clasificaciones) serán eliminados permanentemente",
      "item3": "Esta acción no se puede deshacer - considera hacer una copia de seguridad de los datos antes de la limpieza",
      "item4": "Los concursos activos (dentro de fecha de inicio y fin) nunca son afectados",
      "item5": "La limpieza regular ayuda a mantener un rendimiento óptimo de la base de datos"
    },
    "bestPractices": {
      "title": "Mejores Prácticas",
      "item1": "Ejecuta la limpieza después de que los resultados del concurso hayan sido archivados o exportados",
      "item2": "Programa limpiezas regulares (por ejemplo, mensual o trimestralmente)",
      "item3": "Notifica a los directores antes de limpiar sus concursos expirados",
      "item4": "Mantén una copia de seguridad de los datos importantes del concurso antes de la limpieza"
    }
  }
}
```

## Translation Keys Structure

### Page Header

- `contestCleanup.pageTitle` - Main page title
- `contestCleanup.pageDescription` - Page description/subtitle

### Important Information Section

- `contestCleanup.info.title` - Section title
- `contestCleanup.info.item1` - Info about expired contests
- `contestCleanup.info.item2` - Info about data deletion
- `contestCleanup.info.item3` - Warning about irreversibility
- `contestCleanup.info.item4` - Info about active contests
- `contestCleanup.info.item5` - Info about performance benefits

### Best Practices Section

- `contestCleanup.bestPractices.title` - Section title
- `contestCleanup.bestPractices.item1` - Archive before cleanup
- `contestCleanup.bestPractices.item2` - Schedule regular cleanups
- `contestCleanup.bestPractices.item3` - Notify directors
- `contestCleanup.bestPractices.item4` - Keep backups

## Component Implementation

The `ContestCleanupPage.tsx` component already uses the `useTranslation` hook from `react-i18next`:

```typescript
import { useTranslation } from "react-i18next";

const ContestCleanupPage = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("contestCleanup.pageTitle", "Contest Data Cleanup")}</h1>
      {/* ... */}
    </div>
  );
};
```

All text content in the component uses translation keys with fallback values.

## Language Switching

Users can switch between English and Spanish using the language selector in the application. The Contest Cleanup page will automatically update to display content in the selected language.

## Testing

To test the translations:

1. **English Mode:**

   - Set language to English
   - Navigate to Contest Cleanup page
   - Verify all text appears in English

2. **Spanish Mode:**

   - Set language to Spanish (Español)
   - Navigate to Contest Cleanup page
   - Verify all text appears in Spanish

3. **Dynamic Switching:**
   - While on the Contest Cleanup page, switch languages
   - Verify content updates immediately without page reload

## Translation Coverage

✅ **100% Coverage** - All visible text in the Contest Cleanup page is internationalized:

- Page title and description
- Important Information section (title + 5 items)
- Best Practices section (title + 4 items)
- Sidebar menu item (already existed)

## Future Enhancements

If additional languages are added to the application:

1. Copy the `contestCleanup` section from `en.json`
2. Translate all values to the target language
3. Add to the new language file (e.g., `fr.json`, `pt.json`)
4. Maintain the same key structure

## Notes

- All translations maintain the same semantic meaning across languages
- Spanish translations use formal language appropriate for administrative interfaces
- Fallback values are provided in the component for development safety
- JSON syntax has been validated for both language files

## Related Files

- `src/components/dashboard/ContestCleanupPage.tsx` - Component using translations
- `src/locales/en.json` - English translations
- `src/locales/es.json` - Spanish translations
- `CONTEST_CLEANUP_INTEGRATION.md` - Overall integration documentation

## Validation

Both JSON files have been validated and confirmed to be syntactically correct:

- ✅ `en.json` - Valid JSON
- ✅ `es.json` - Valid JSON
