document.addEventListener("DOMContentLoaded", function () {
  const wishlistButtons = document.querySelectorAll(".wishlist-button");

  // Initialize hearts and badge when page loads
  updateHearts();
  updateWishlistBadge();

  // Setup heart button click events
  wishlistButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const productData = {
        id: this.dataset.productId,
        handle: this.dataset.productHandle,
        title: this.dataset.productTitle,
        image: this.dataset.productImage,
      };
      toggleWishlist(productData);
      updateHearts();
      updateWishlistBadge();
    });
  });

  function getWishlist() {
    return JSON.parse(localStorage.getItem("wishlist")) || [];
  }

  function saveWishlist(wishlist) {
    localStorage.setItem("wishlist", JSON.stringify(wishlist));
  }

  function toggleWishlist(productData) {
    let wishlist = getWishlist();
    const existing = wishlist.find((item) => item.id == productData.id);
    let message = "";

    if (existing) {
      wishlist = wishlist.filter((item) => item.id != productData.id);
      message =
        lang() === "ar"
          ? "❌ تمت إزالة المنتج من قائمة الأمنيات"
          : "❌ Removed from Wishlist";
    } else {
      wishlist.push(productData);
      message =
        lang() === "ar"
          ? "✅ تم إضافة المنتج إلى قائمة الأمنيات"
          : "✅ Added to Wishlist";
    }

    saveWishlist(wishlist);
    showToast(message);
  }

  function updateHearts() {
    const wishlist = getWishlist();
    wishlistButtons.forEach((button) => {
      const productId = button.dataset.productId;
      if (wishlist.some((item) => item.id == productId)) {
        button.classList.add("wishlisted");
      } else {
        button.classList.remove("wishlisted");
      }
    });
  }

  function updateWishlistBadge() {
    const wishlist = getWishlist();
    const badge = document.getElementById("wishlist-count-badge");

    if (badge) {
      if (wishlist.length > 0) {
        badge.style.display = "flex";
        badge.textContent = wishlist.length;
      } else {
        badge.style.display = "none";
      }
    }
  }

  function showToast(message) {
    const toast = document.getElementById("wishlist-toast");
    if (!toast) return;

    toast.textContent = message;
    toast.style.display = "block";

    setTimeout(() => {
      toast.style.display = "none";
    }, 2000);
  }

  function lang() {
    const htmlLang = document.documentElement.lang;
    if (htmlLang && htmlLang.startsWith("ar")) {
      return "ar";
    }
    return "en";
  }
});