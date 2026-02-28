const products_on_page = document.getElementById('product-grid');
let next_url = products_on_page.dataset.nextUrl;

const load_more_btn = document.getElementsByClassName('load-more_btn')[0];
const load_more_spinner = document.getElementsByClassName('load-more_spinner')[0];
async function getNextPage() {
  try {
    let res = await fetch(next_url);
    return await res.text();
  } catch (error) {
    console.log(error);
  }
}

async function loadMoreProducts() {
  load_more_btn.style.display = 'none';
  load_more_spinner.style.display = 'block';
  let nextPage = await getNextPage();

  const parser = new DOMParser();
  const nextPageDoc = parser.parseFromString(nextPage, 'text/html');

  load_more_spinner.style.display = 'none';

  const productgrid = nextPageDoc.getElementById('product-grid');
  const new_products = productgrid.getElementsByClassName('grid__item');
  const new_url = productgrid.dataset.nextUrl;
  if (new_url) {
    load_more_btn.style.display = 'block';
  }
  next_url = new_url;
  for (let i = 0; i < new_products.length; i++) {
    let single_product = new_products[i].cloneNode(true);
    products_on_page.appendChild(single_product);
  }
}