(function () {
  const config = window.HAYES_SUPABASE_CONFIG || {};
  const hasConfig = Boolean(config.url && config.anonKey);

  function getClient() {
    if (!hasConfig || !window.supabase) return null;
    if (!window.hayesSupabaseClient) {
      window.hayesSupabaseClient = window.supabase.createClient(config.url, config.anonKey);
    }
    return window.hayesSupabaseClient;
  }

  function formatCurrency(value) {
    return Number(value || 0).toLocaleString("en-US", {
      style: "currency",
      currency: "USD"
    });
  }

  window.HayesSupabase = {
    configured: hasConfig,
    getClient,
    formatCurrency
  };

  document.documentElement.dataset.supabase = hasConfig ? "configured" : "not-configured";
  if (!hasConfig) {
    console.info("Supabase is not configured yet. Add your public project URL and anon key in js/supabase-config.js or generate it from environment variables.");
  }
})();
