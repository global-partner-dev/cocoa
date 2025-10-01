import ContestCleanup from "@/components/dashboard/ContestCleanup";
import { useTranslation } from "react-i18next";

/**
 * Contest Cleanup Page
 * 
 * Admin-only page for managing expired contest data cleanup.
 * This page provides a dedicated interface for the ContestCleanup utility.
 */
const ContestCleanupPage = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-[hsl(var(--chocolate-dark))] to-[hsl(var(--chocolate-medium))] rounded-lg p-6 text-[hsl(var(--chocolate-cream))]">
        <h1 className="text-2xl font-bold mb-2">
          {t('contestCleanup.pageTitle', 'Contest Data Cleanup')}
        </h1>
        <p className="text-[hsl(var(--chocolate-cream)_/_0.9)]">
          {t('contestCleanup.pageDescription', 'Manage and cleanup expired contest data to maintain database performance and organization.')}
        </p>
      </div>

      {/* Cleanup Component */}
      <div className="max-w-3xl">
        <ContestCleanup />
      </div>

      {/* Additional Information */}
      <div className="max-w-3xl bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">
          {t('contestCleanup.info.title', 'Important Information')}
        </h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>{t('contestCleanup.info.item1', 'Only contests with end_date in the past will be affected')}</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>{t('contestCleanup.info.item2', 'All associated data (samples, evaluations, rankings) will be permanently deleted')}</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>{t('contestCleanup.info.item3', 'This action cannot be undone - consider backing up data before cleanup')}</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>{t('contestCleanup.info.item4', 'Active contests (within start_date and end_date) are never affected')}</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>{t('contestCleanup.info.item5', 'Regular cleanup helps maintain optimal database performance')}</span>
          </li>
        </ul>
      </div>

      {/* Best Practices */}
      <div className="max-w-3xl bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="font-semibold text-green-900 mb-3">
          {t('contestCleanup.bestPractices.title', 'Best Practices')}
        </h3>
        <ul className="space-y-2 text-sm text-green-800">
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span>{t('contestCleanup.bestPractices.item1', 'Run cleanup after contest results have been archived or exported')}</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span>{t('contestCleanup.bestPractices.item2', 'Schedule regular cleanups (e.g., monthly or quarterly)')}</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span>{t('contestCleanup.bestPractices.item3', 'Notify directors before cleaning up their expired contests')}</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span>{t('contestCleanup.bestPractices.item4', 'Keep a backup of important contest data before cleanup')}</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ContestCleanupPage;