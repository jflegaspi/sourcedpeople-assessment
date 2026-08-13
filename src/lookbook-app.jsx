import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const SHOPIFY_DOMAIN = 'https://jf-store-10011.myshopify.com';
const STOREFRONT_ACCESS_TOKEN = 'dc296bfc4bb7fab3b66dca8f01cb96f5';
const API_VERSION = '2024-01'; 

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
          country: countryCode
        }
      }),
    });

    const { data, errors } = await response.json();
    if (errors) console.error("GRAPHQL ERRORS:", errors);

    return data?.metaobject;
  } catch (error) {
    console.error(`Failed to fetch lookbook: ${handle}`, error);
    return null;
  }
};

const LookbookApp = ({ handles, country, columns, titleSize, showDescription, descriptionSize }) => {
  const [lookbooks, setLookbooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleArray = handles.split(',').filter(Boolean);
    
    if (handleArray.length === 0) {
      setLoading(false);
      return;
    }

    Promise.all(handleArray.map(h => fetchSingleLookbook(h, country)))
      .then(results => {
        setLookbooks(results.filter(Boolean));
        setLoading(false);
      });
  }, [handles, country]);

  if (loading) return <div>Loading...</div>;
  if (!lookbooks.length) return null;

  // Dynamically set grid columns based on customizer range setting (fallback to 3)
  const gridTemplateColumns = `repeat(${columns || 3}, minmax(0, 1fr))`;

  return (
    <div className="lookbook-react-container">
      {lookbooks.map((lookbook) => (
        <section key={lookbook.handle} style={{ marginBottom: '3rem' }}>
          
          {/* Header Typography Customization */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: `${titleSize || 2}rem`, margin: '0 0 10px 0' }}>
              {lookbook.title?.value}
            </h2>
            
            {showDescription && lookbook.description?.value && (
              <p style={{ fontSize: `${descriptionSize || 1}rem`, maxWidth: '700px', margin: '0 auto', color: '#666' }}>
                {lookbook.description.value}
              </p>
            )}
          </div>
          
          {/* Grid Layout Customization */}
          <div style={{ display: 'grid', gridTemplateColumns, gap: '20px' }}>
            {lookbook.products?.references?.nodes.map((product) => {
              const variant = product.variants.nodes[0];
              const price = variant?.price;
              const compareAt = variant?.compareAtPrice;
              const isOnSale = compareAt && parseFloat(compareAt.amount) > parseFloat(price.amount);

              return (
                <a key={product.id} href={`/products/${product.handle}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  {product.featuredImage && (
                    <img src={product.featuredImage.url} alt={product.title} style={{ width: '100%', borderRadius: '4px' }} />
                  )}
                  
                  <h3 style={{ fontSize: '1.1rem', margin: '10px 0 5px 0' }}>
                    {product.title}
                  </h3>
                  
                  <div>
                    {isOnSale && (
                      <span style={{ textDecoration: 'line-through', color: '#888', marginRight: '8px' }}>
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: compareAt.currencyCode
                        }).format(compareAt.amount)}
                      </span>
                    )}
                    
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

// Mount app and pass all configuration data attributes
const mountLookbooks = () => {
  document.querySelectorAll('.react-lookbook-mount').forEach(mountNode => {
    if (mountNode.dataset.mounted) return;
    
    const handles = mountNode.dataset.lookbookHandles;
    const country = mountNode.dataset.country || 'US';
    const columns = parseInt(mountNode.dataset.columns, 10) || 3;
    const titleSize = parseFloat(mountNode.dataset.titleSize) || 2.0;
    const showDescription = mountNode.dataset.showDescription !== 'false';
    const descriptionSize = parseFloat(mountNode.dataset.descriptionSize) || 1.0;
    
    if (handles) {
      const root = createRoot(mountNode);
      root.render(
        <LookbookApp 
          handles={handles} 
          country={country} 
          columns={columns}
          titleSize={titleSize}
          showDescription={showDescription}
          descriptionSize={descriptionSize}
        />
      );
      mountNode.dataset.mounted = "true";
    }
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountLookbooks);
} else {
  mountLookbooks();
}

document.addEventListener('shopify:section:load', mountLookbooks);