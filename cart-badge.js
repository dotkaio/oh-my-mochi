function updateCartBadge() {
  const badge = document.querySelector('.cart-badge');
  if (!badge) return;
  const cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];
  let count = 0;
  cart.forEach(item => {
    count += item.quantity || 1;
  });
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
});

updateCartBadge();
window.addEventListener('storage', updateCartBadge);
