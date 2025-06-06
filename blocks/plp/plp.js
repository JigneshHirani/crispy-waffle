import { getConfigValue } from '../../scripts/configs.js';
import { rootLink } from '../../scripts/scripts.js';
import { performMonolithGraphQLQuery } from '../../scripts/commerce.js';

async function loadCategory(urlPath) {
  const query = `{
    categories(filters: {url_path: {eq: "${urlPath}"}}) {
      items {
        name
        id
      }
    }
  }`;

  try {
    const response = await performMonolithGraphQLQuery(query, {}, true, false);
    return response?.data?.categories?.items?.[0] || null;
  } catch (error) {
    console.error('Failed to load category:', error);
    return null;
  }
}

function readUrlPath() {
  const path = window.location.pathname;

  // Match everything after "/categories/"
  const match = path.match(/\/categories\/(.+)/);
  if (!match) return '';

  // Extract the path part after /categories/
  let categoryPath = match[1];

  // Remove trailing slash (if any)
  categoryPath = categoryPath.replace(/\/$/, '');

  // Remove query string (just in case pathname contains it)
  [categoryPath] = categoryPath.split('?');

  // Split into segments
  const segments = categoryPath.split('/');

  // If last segment contains '=', remove it
  if (segments[segments.length - 1].includes('=')) {
    segments.pop();
  }

  return segments.join('/');
}

export default async function decorate(block) {
  const type = '';
  const urlPath = readUrlPath();
  const categoryData = await loadCategory(urlPath);
  const categoryName = categoryData?.name || '';
  const category = categoryData?.id;

  // eslint-disable-next-line import/no-absolute-path, import/no-unresolved
  await import('/scripts/widgets/search.js');
  block.textContent = '';

  const storeDetails = {
    environmentId: getConfigValue('headers.cs.Magento-Environment-Id'),
    environmentType: (getConfigValue('commerce-endpoint')).includes('sandbox') ? 'testing' : '',
    apiKey: getConfigValue('headers.cs.x-api-key'),
    apiUrl: getConfigValue('commerce-endpoint'),
    websiteCode: getConfigValue('headers.cs.Magento-Website-Code'),
    storeCode: getConfigValue('headers.cs.Magento-Store-Code'),
    storeViewCode: getConfigValue('headers.cs.Magento-Store-View-Code'),
    config: {
      pageSize: 8,
      perPageConfig: {
        pageSizeOptions: '12,24,36',
        defaultPageSizeOption: '12',
      },
      minQueryLength: '2',
      currencySymbol: '$',
      currencyRate: '1',
      displayOutOfStock: true,
      allowAllProducts: false,
      imageCarousel: false,
      optimizeImages: true,
      imageBaseWidth: 200,
      listview: true,
      displayMode: '', // "" for plp || "PAGE" for category/catalog
      addToCart: async (...args) => {
        const { addProductsToCart } = await import('../../scripts/__dropins__/storefront-cart/api.js');
        await addProductsToCart([{
          sku: args[0],
          options: args[1],
          quantity: args[2],
        }]);
      },
    },
    context: {
      customerGroup: getConfigValue('headers.cs.Magento-Customer-Group'),
    },
    route: ({ sku, urlKey }) => {
      const a = new URL(window.location.origin);
      a.pathname = rootLink(`/products/${urlKey}/${sku}`);
      return a.toString();
    },
  };

  if (type !== 'search') {
    storeDetails.config.categoryName = categoryName;
    storeDetails.config.currentCategoryId = `${category}`;
    storeDetails.config.currentCategoryUrlPath = urlPath;

    // Enable enrichment
    block.dataset.category = category;
  }

  await new Promise((resolve) => {
    const interval = setInterval(() => {
      if (window.LiveSearchPLP) {
        clearInterval(interval);
        resolve();
      }
    }, 200);
  });

  return window.LiveSearchPLP({ storeDetails, root: block });
}
