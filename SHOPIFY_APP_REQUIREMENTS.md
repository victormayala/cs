
# Shopify App Integration Requirements for Customizer Studio

## 1. Overview

This document outlines the technical requirements for building a Shopify App to seamlessly integrate the Customizer Studio into a Shopify product page. The primary goal is to allow customers to personalize a product using the Customizer Studio iframe and have their unique design data attached to the product when they add it to the cart.

The integration relies on three main components:
1.  **A Shopify App**: Handles authentication and provides the necessary extensions.
2.  **A Theme App Extension (App Block)**: The frontend component that gets added to a product page in the Shopify Theme Editor. It renders the "Customize" button and the iframe.
3.  **The Customizer Studio**: The existing application, which runs inside the iframe.

---

## 2. Shopify App Setup (Partner Dashboard)

1.  **Create a New App**: In your Shopify Partner Dashboard, create a new "Public App" or "Custom App".
2.  **Authentication**:
    *   The app must use OAuth 2.0.
    *   **App URL**: `https://<your-app-domain>/`
    *   **Allowed redirection URL(s)**: `https://<your-app-domain>/api/shopify/callback`
3.  **API Scopes**: Request the following minimum access scopes. You may require more depending on future functionality.
    *   `read_products`: To get product details for the customizer.
    *   `write_products` (Optional): If you plan to manage product metafields from the app's backend.
4.  **API Credentials**: Note the **Client ID (API key)** and **Client secret**. These will be used as environment variables in your Customizer Studio deployment (`SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET_KEY`).

---

## 3. Theme App Extension (App Block)

This is the most critical part of the integration. This block will be added to product templates via the Shopify Theme Editor.

### 3.1. App Block Settings

The app block should have one crucial setting:

*   **Customizer Studio User ID (`configUserId`)**: A text field where the merchant pastes their unique User ID from their Customizer Studio dashboard profile. This ID is essential for loading the correct product configurations (views, design areas, etc.).

### 3.2. Frontend Logic (Liquid & JavaScript)

The app block will contain Liquid to render HTML and JavaScript to handle user interaction.

**File Structure (Conceptual):**
```
/extensions
  /theme-app-ext
    /blocks
      - customizer-button.liquid
    /assets
      - customizer.js
```

**`customizer-button.liquid` (Simplified):**

```liquid
{{ 'customizer.js' | asset_url | script_tag }}

<div
  class="customizer-studio-container"
  data-product-id="{{ product.id }}"
  data-config-user-id="{{ block.settings.config_user_id }}"
>
  <button id="cs-open-customizer-btn" type="button" class="your-button-styles">
    Customize Product
  </button>
</div>

<div id="cs-iframe-modal" class="cs-modal-hidden">
  <div class="cs-modal-content">
    <button id="cs-close-iframe-btn">&times;</button>
    <iframe id="cs-iframe-element" frameborder="0"></iframe>
  </div>
</div>

<!-- This field will hold the customization data -->
<input type="hidden" name="properties[_customizationData]" id="cs-customization-data-input" form="{{ product_form_id }}">

<style>
  /* Basic modal styles */
  .cs-modal-hidden { display: none; }
  /* Add styles for a full-screen modal overlay */
</style>
```

**`customizer.js` (Core Logic):**

This script will perform four main tasks:

1.  **Initialize**: Get the `productId` and `configUserId` from the `data-*` attributes.
2.  **Open Modal**: On button click, construct the `iframe` URL and display the modal.
3.  **Listen for Design Data**: Use the `postMessage` API to listen for the final design from the iframe.
4.  **Update Form**: When data is received, update the hidden `_customizationData` input field.

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.customizer-studio-container');
  if (!container) return;

  const productId = container.dataset.productId; // e.g., 8153428754615
  const configUserId = container.dataset.configUserId;
  const openBtn = document.getElementById('cs-open-customizer-btn');
  const modal = document.getElementById('cs-iframe-modal');
  const closeBtn = document.getElementById('cs-close-iframe-btn');
  const iframe = document.getElementById('cs-iframe-element');
  const dataInput = document.getElementById('cs-customization-data-input');

  if (!openBtn || !modal || !iframe || !dataInput || !configUserId) {
    console.error('Customizer Studio: Missing required elements or configuration.');
    return;
  }

  // Construct the full Shopify Product GID
  const productGid = `gid://shopify/Product/${productId}`;

  openBtn.addEventListener('click', () => {
    // ** IMPORTANT URL CONSTRUCTION **
    const customizerUrl = new URL('https://<your-app-domain>/customizer');
    customizerUrl.searchParams.set('productId', productGid);
    customizerUrl.searchParams.set('source', 'shopify');
    customizerUrl.searchParams.set('configUserId', configUserId);
    customizerUrl.searchParams.set('viewMode', 'embedded'); // Hides header/footer in iframe

    iframe.src = customizerUrl.toString();
    modal.classList.remove('cs-modal-hidden');
  });

  closeBtn.addEventListener('click', () => {
    modal.classList.add('cs-modal-hidden');
    iframe.src = 'about:blank'; // Clear iframe content
  });

  // Listen for the design data from the iframe
  window.addEventListener('message', (event) => {
    // ** SECURITY: Always validate the origin of the message **
    if (event.origin !== 'https://<your-app-domain>') {
      return;
    }

    if (event.data && event.data.customizerStudioDesignData) {
      const designData = event.data.customizerStudioDesignData;

      // Stringify the JSON data to store it in the hidden form field
      dataInput.value = JSON.stringify(designData);

      console.log('Customization data received and stored.', designData);

      // Close the modal
      modal.classList.add('cs-modal-hidden');
      iframe.src = 'about:blank';

      // Optional: Give user feedback
      alert('Your custom design has been saved to the product!');
    }
  });
});
```

---

## 4. Cart and Order Data

By using `name="properties[_customizationData]"`, Shopify automatically treats the data as a **Line Item Property**.

*   **In the Cart**: The customization data will be associated with the product. You may need to edit your theme's cart template to display this information to the customer.
*   **In the Order**: The data will be saved with the order and will be visible in the Shopify Admin on the order details page. This provides the fulfillment team with all the necessary information to create the custom product. The data will be in JSON format and will need to be parsed to be read easily.

