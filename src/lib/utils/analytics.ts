
interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
}

export const trackEvent = (event: AnalyticsEvent): void => {
  // Implement your analytics tracking here
  console.log('Analytics Event:', event);
  
  // Example implementations:
  // gtag('event', event.name, event.properties);
  // analytics.track(event.name, event.properties);
  // mixpanel.track(event.name, event.properties);
};

export const categoryFormEvents = {
  FORM_OPENED: 'category_form_opened',
  FORM_SUBMITTED: 'category_form_submitted',
  SUBCATEGORY_ADDED: 'subcategory_added',
  SUBCATEGORY_REMOVED: 'subcategory_removed',
  SUBCATEGORY_REORDERED: 'subcategory_reordered',
  FORM_DRAFT_SAVED: 'form_draft_saved',
  FORM_EXPORTED: 'form_exported',
} as const;