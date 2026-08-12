import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const SHOPIFY_DOMAIN = 'https://jf-store-10011.myshopify.com';
const STOREFRONT_ACCESS_TOKEN = 'dc296bfc4bb7fab3b66dca8f01cb96f5';
const API_VERSION = '2024-01'; 

// Fetch a single lookbook, now accepting the country code for Market pricing
const fetchSingleLookbook = async (handle, countryCode) => {
  const query = `
    query getLookbook($handle: MetaobjectHandleInput!, $country: CountryCode!) @inContext(country: $country) {
      metaobject(handle: $handle) {
        handle
        title: field(key: "title") { value }
        description: field(key: "description") { value }
        products: field(key: "products") {
          references(first: 10) {
            nodes {
              ... on Product {
                id
                title
                handle
                featuredImage {
                  url
                  altText
                }
                variants(first: 1) {
                  nodes {
                    price { amount currencyCode }
                    compareAtPrice { amount currencyCode }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(`${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_ACCESS_TOKEN,
      },
      body: JSON.stringify({
        query,
        variables: {
          handle: { type: 'lookbook', handle: handle.trim() },
          country: countryCode // Injects AUD, JPY, etc.
        }
      }),
    });

    const { data } = await response.json();
    return data?.metaobject;
  } catch (error) {
    console.error(`Failed to fetch lookbook: ${handle}`, error);
    return null;
  }
};

const LookbookApp = ({ handles, country }) => {
  const [lookbooks, setLookbooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleArray = handles.split(',').filter(Boolean);
    
    if (handleArray.length === 0) {
      setLoading(false);
      return;
    }

    // Pass both the handle and the active country to the fetcher
    Promise.all(handleArray.map(h => fetchSingleLookbook(h, country)))
      .then(results => {
        setLookbooks(results.filter(Boolean));
        setLoading(false);
      });
  }, [handles, country]);

  if (loading) return <div>Loading...</div>;
  if (!lookbooks.length) return null;

  return (
    <div className="lookbook-react-container">
      {lookbooks.map((lookbook) => (
        <section key={lookbook.handle} style={{ marginBottom: '3rem' }}>
          <h2>{lookbook.title?.value}</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
            {lookbook.products?.references?.nodes.map((product) => {
              // Extract the first variant for pricing
              const variant = product.variants.nodes[0];
              const price = variant?.price;
              const compareAt = variant?.compareAtPrice;
              
              // Only format compareAt if it exists AND is greater than the current price
              const isOnSale = compareAt && parseFloat(compareAt.amount) > parseFloat(price.amount);

              return (
                <a key={product.id} href={`/products/${product.handle}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  {product.featuredImage && (
                    <img src={product.featuredImage.url} alt={product.title} style={{ width: '100%' }} />
                  )}
                  
                  <h3>{product.title}</h3>
                  
                  <div>
                    {/* Render Compare-At Price with strikethrough if applicable */}
                    {isOnSale && (
                      <span style={{ textDecoration: 'line-through', color: '#888', marginRight: '8px' }}>
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: compareAt.currencyCode
                        }).format(compareAt.amount)}
                      </span>
                    )}
                    
                    {/* Render Active Market Price */}
                    <span style={{ fontWeight: isOnSale ? 'bold' : 'normal', color: isOnSale ? 'red' : 'inherit' }}>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: price.currencyCode
                      }).format(price.amount)}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};

// Mount app and pass both handles and country data attributes
document.querySelectorAll('.react-lookbook-mount').forEach(mountNode => {
  const handles = mountNode.dataset.lookbookHandles;
  const country = mountNode.dataset.country || 'US'; // Fallback if liquid fails
  
  if (handles) {
    const root = createRoot(mountNode);
    root.render(<LookbookApp handles={handles} country={country} />);
  }
});