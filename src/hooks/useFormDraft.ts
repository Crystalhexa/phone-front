import { useEffect, useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { CategoryFormData } from '@/types/category';

export const useFormDraft = (
  form: UseFormReturn<CategoryFormData>,
  categoryId?: string,
  enableAutoSave: boolean = true
) => {
  const draftKey = `category-draft-${categoryId || 'new'}`;

  const saveDraft = useCallback(() => {
    if (!enableAutoSave) return;
    
    const formData = form.getValues();
    try {
      localStorage.setItem(draftKey, JSON.stringify(formData));
    } catch (error) {
      console.warn('Failed to save draft:', error);
    }
  }, [form, draftKey, enableAutoSave]);

  const loadDraft = useCallback(() => {
    if (!enableAutoSave) return;
    
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const draftData = JSON.parse(savedDraft);
        form.reset(draftData);
      }
    } catch (error) {
      console.warn('Failed to load draft:', error);
    }
  }, [form, draftKey, enableAutoSave]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
    } catch (error) {
      console.warn('Failed to clear draft:', error);
    }
  }, [draftKey]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  useEffect(() => {
    const subscription = form.watch(() => {
      saveDraft();
    });
    
    return () => subscription.unsubscribe();
  }, [form, saveDraft]);

  return { saveDraft, loadDraft, clearDraft };
};