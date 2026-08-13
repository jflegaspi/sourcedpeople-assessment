Shopify React Lookbook

This feature allows merchants to easily group products into shoppable galleries.

We built this specifically to rely 100% on native Shopify features.

Multi-Market Ready: Fully respects Shopify Markets. Whether a customer is shopping in AUD or JPY, the lookbook automatically pulls the correct localized currency and formatting.

Smart Product Pages: On product pages, lookbooks are rendered dynamically. If you are looking at a t-shirt, the page will automatically display up to two lookbooks that feature that specific t-shirt.

Theme Customizer Friendly: Merchants have full control over the layout. They can adjust grid columns, typography sizes, hide/show descriptions, and tweak section margins right from the Shopify visual editor.

Compare-At Pricing: Built-in logic to handle sales. If a product is discounted, it automatically displays the original price with a strikethrough.

🛠️ The Tech Stack
Frontend: React.js (compiled via Vite)

Backend / Data: Shopify Metaobjects

Data Fetching: Shopify Storefront API (GraphQL)

Theme Integration: Shopify Liquid

Setup & Installation (For Developers)

1. Shopify Admin Setup
Before the code can work, you need to set up the data structure in Shopify:

Go to Settings > Custom data > Metaobjects.

Create a new definition called Lookbook (handle: lookbook).

Add three fields:

title (Single line text)

description (Multi-line text)

products (List of products)

Crucial Step: Scroll down to the Access section of the Metaobject definition and check Storefronts.

2. Storefront API Permissions
You need a Storefront API token with the correct permissions.

Ensure your token has the unauthenticated_read_metaobjects and unauthenticated_read_product_listings scopes enabled.

Update the STOREFRONT_ACCESS_TOKEN variable inside src/lookbook-app.jsx with your token.

3. Build the React App
Since we are using React inside a standard Shopify theme, we need to compile it.

Run npm install to grab the dependencies.

Run npm run build to compile the production-ready script.

Upload the resulting react-lookbook.js file into your Shopify theme's assets folder.

Make sure your theme.liquid is loading the script just before the closing </body> tag:

HTML
<script src="{{ 'react-lookbook.js' | asset_url }}" defer="defer"></script>
(Note: Never push your node_modules folder to your Git repository!)

How to Use It (For Merchants)

To create a new lookbook:

Go to Content > Metaobjects in your Shopify admin.

Click Add entry and select Lookbook.

Fill out your title, description, and select the products you want to feature. Make sure the status is set to Active.

To display it on the Homepage:

Open your Theme Customizer.

Click Add section and choose Lookbook (Homepage).

Select the specific lookbook you want to feature.

Tweak the layout, columns, and font sizes to your liking!

To display it on Product Pages:

Open your Theme Customizer and navigate to Products > Default product.

Click Add section and choose Lookbook (Product Page).

You don't need to select a lookbook here. The code will automatically check if the current product belongs to any active lookbooks and display them (up to a maximum of 2).