export function showGuestsPlaceholder() {
  const loading = document.querySelector('#guests-loading');
  const error = document.querySelector('#guests-error');
  const placeholder = document.querySelector('#guests-placeholder');

  loading.hidden = true;
  error.hidden = true;
  placeholder.hidden = false;
}
