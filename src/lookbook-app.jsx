import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

// ------------------------------------------------------------------
// Storefront API Configuration
// These credentials connect our React app to the Shopify backend.
// ------------------------------------------------------------------
const SHOPIFY_DOMAIN = 'https://jf-store-10011.myshopify.com';
const STOREFRONT_ACCESS_TOKEN = 'dc296bfc4bb7fab3b66dca8f01cb96f5';
const API_VERSION = '2024-01'; 

/**
 * Fetches a single lookbook's data from Shopify based on its handle.
 * We pass the 'countryCode' to Shopify's @inContext directive so the API 
 * automatically converts product prices into the correct local currency (e.g., AUD or JPY).
 */
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
    
    // If Shopify rejects the query (e.g., missing permissions), log it for easy debugging.
    if (errors) console.error("GRAPHQL ERRORS:", errors);

    return data?.metaobject;
  } catch (error) {
    console.error(`Failed to fetch lookbook: ${handle}`, error);
    return null;
  }
};

/**
 * Main Lookbook Component
 * Receives layout and typography settings directly from the Shopify Theme Customizer.
 */
const LookbookApp = ({ handles, country, columns, titleSize, showDescription, descriptionSize }) => {
  const [lookbooks, setLookbooks] = useState([]);
  const [loading, setLoading] = useState(true);

  // When the component mounts, fetch all the lookbooks requested by the Liquid section.
  useEffect(() => {
    // Clean up the handles list just in case there are empty trailing commas
    const handleArray = handles.split(',').filter(Boolean);
    
    if (handleArray.length === 0) {
      setLoading(false);
      return;
    }

    // Fetch all lookbook handles simultaneously for better performance
    Promise.all(handleArray.map(h => fetchSingleLookbook(h, country)))
      .then(results => {
        // Filter out any null results (in case a handle was deleted or invalid)
        setLookbooks(results.filter(Boolean));
        setLoading(false);
      });
  }, [handles, country]);

  // Simple loading state while we wait for the Storefront API
  if (loading) return <div>Loading...</div>;
  if (!lookbooks.length) return null;

  // Convert the customizer setting (e.g., "3") into actual CSS Grid columns
  const gridTemplateColumns = `repeat(${columns || 3}, minmax(0, 1fr))`;

  return (
    <div className="lookbook-react-container">
      {lookbooks.map((lookbook) => (
        <section key={lookbook.handle} style={{ marginBottom: '3rem' }}>
          
          {/* Header & Description */}
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
          
          {/* Product Grid */}
          <div style={{ display: 'grid', gridTemplateColumns, gap: '20px' }}>
            {lookbook.products?.references?.nodes.map((product) => {
              
              // We grab the first variant to determine the base price and compare-at price
              const variant = product.variants.nodes[0];
              const price = variant?.price;
              const compareAt = variant?.compareAtPrice;
              
              // Figure out if the product is actually on sale right now
              const isOnSale = compareAt && parseFloat(compareAt.amount) > parseFloat(price.amount);

              return (
                <a key={product.id} href={`/products/${product.handle}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  
                  {/* Product Image: We force a 3:4 portrait aspect ratio so all images align perfectly in the grid */}
                  {product.featuredImage && (
                    <img 
                      src={product.featuredImage.url} 
                      alt={product.featuredImage.altText || product.title} 
                      style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: '4px' }} 
                    />
                  )}
                  
                  <h3 style={{ fontSize: '1.1rem', margin: '10px 0 5px 0' }}>
                    {product.title}
                  </h3>
                  
                  {/* Pricing Block */}
                  <div>
                    {isOnSale && (
                      <span style={{ textDecoration: 'line-through', color: '#888', marginRight: '8px' }}>
                        {/* We use Intl.NumberFormat to automatically place currency symbols in the correct spot based on the market */}
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

// ------------------------------------------------------------------
// Bootstrapping / App Mounting
// This script finds all the HTML div placeholders created by Shopify Liquid
// and injects our React Lookbook component into them.
// Section files are lookbook-homepage.liquid and lookbook-collection.liquid, which are rendered by the Shopify Theme Customizer.
// ------------------------------------------------------------------
const mountLookbooks = () => {
  document.querySelectorAll('.react-lookbook-mount').forEach(mountNode => {
    // We flag the DOM node as mounted so we don't accidentally load React twice on the same div
    if (mountNode.dataset.mounted) return;
    
    // Read the settings passed down from the Shopify Theme Customizer
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

// Wait for the HTML document to finish loading before mounting React
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountLookbooks);
} else {
  mountLookbooks();
}

// Crucial for Shopify Themes: Listen for customizer changes so the lookbook updates 
// instantly when the client changes a setting in the admin panel.
document.addEventListener('shopify:section:load', mountLookbooks);