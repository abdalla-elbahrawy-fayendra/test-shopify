// custom-load-more.js
console.log('▶︎ custom-load-more.js loaded');

document.addEventListener('click', (event) => {
  const btn = event.target.closest('.load-more_btn');
  if (!btn) return;

  event.preventDefault();

  if (typeof loadMoreProducts === 'function') {
    console.log('⏩ loadMoreProducts() invoked');
    loadMoreProducts();
  } else {
    console.error('⚠️ loadMoreProducts is not defined');
  }
});
