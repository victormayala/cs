
# Shopify App Integration Requirements for Customizer Studio

## 1. Overview

This document outlines the technical requirements and data flow for building a Shopify App to seamlessly integrate the Customizer Studio into a Shopify product page. The goal is to allow customers to personalize a product using the Customizer Studio iframe and have their unique design data attached to the product when they add it to the cart.

The integration relies on three main components:
1.  **A Shopify App**: Handles authentication, automated theme injection, and provides the necessary Theme App Extension.
2.  **A Theme App Extension (App Block)**: The frontend component that gets added to a product page. It renders the "Customize" button and the iframe that loads Customizer Studio.
3.  **The Customizer Studio Application**: The existing application which runs inside the iframe and serves the customization experience.

---

## 2. Core Concepts: How Customizer Studio Options Work

Before diving into the implementation, it's crucial to understand how the Shopify store, the Shopify App, and Customizer Studio are linked.

### The `configUserId`: The Link Between Systems

Every user account in Customizer Studio has a unique **User ID**. In the context of this integration, we refer to it as the `configUserId`. This ID is the **single most important piece of data** for the integration.

- **What it does**: The `configUserId` acts as a key that links a Shopify store to a specific set of product configurations (views, design areas, color-variant images, etc.) saved within the Customizer Studio database.
- **How it's used**: The Shopify merchant will copy their User ID from their Customizer Studio profile and paste it into a setting field within your app's admin interface. Your app then uses this ID to configure the app block.

### The Data Lookup Process (The "Magic")

When a customer visits a product page on the Shopify store, here is the sequence of events that happens behind the scenes to load the correct customizer:

1.  The Shopify App Block on the page reads two critical pieces of data:
    *   The **Shopify Product ID** of the current product.
    *   The **`configUserId`** that the merchant saved in the block's settings.
2.  The App Block uses this information to construct a special URL for the Customizer Studio iframe. This URL contains the `productId` and `configUserId` as query parameters.
3.  When the iframe loads this URL, the Customizer Studio application performs the following actions:
    *   It uses the `configUserId` and `productId` to query its own database (Firestore) and find the specific customization options that the merchant has saved for that exact product (e.g., "Front" and "Back" views, defined design areas, etc.).
    *   It uses the same `configUserId` to retrieve the merchant's securely stored Shopify API credentials from its database.
    *   Using those credentials, it makes a server-to-server API call to Shopify to fetch the live product details, such as the base product image.
    *   Finally, it combines the live product data from Shopify with the saved configuration settings from its own database to present a fully configured, ready-to-use customizer to the end-user.

This entire process ensures that the correct, up-to-date product information is always displayed with the merchant's specific customization rules applied.

---

## 3. Shopify App Setup (Partner Dashboard)

1.  **Create a New App**: In your Shopify Partner Dashboard, create a new "Public App" or "Custom App".
2.  **Authentication**:
    *   The app must use OAuth 2.0 to get API credentials from merchants.
    *   **App URL**: `https://<your-app-domain>/`
    *   **Allowed redirection URL(s)**: `https://<your-app-domain>/api/callback`
3.  **API Scopes**: Request the following access scopes.
    *   `read_products`, `write_products`: To get product details for the customizer and potentially create new ones.
    *   `read_themes`, `write_themes`: **Required for automated installation.** These scopes allow the app to programmatically add the Customizer Studio app block to the merchant's theme, providing a seamless onboarding experience.
4.  **API Credentials**: Note the **Client ID (API key)** and **Client secret**. These will be used as environment variables in your Customizer Studio deployment (`SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET_KEY`).

---

## 4. Theme App Extension: The Integration Bridge

This is the most critical part of the integration. For the best user experience, the app block should be added to product templates **automatically** by your app upon installation.

### 4.1. Automated Theme Injection (Recommended)

To provide a seamless setup for merchants, your app should automatically inject the Customizer App Block into their active theme after they've installed the app and provided their `configUserId`. This process uses the Shopify Admin API.

**User Flow:**
1.  The merchant installs your Shopify App.
2.  In the app's onboarding or settings page, they are prompted to enter their `configUserId` from Customizer Studio.
3.  Upon saving, your app's backend performs a one-time setup: it identifies the main published theme and injects the Customizer app block into the product template.
4.  The merchant receives a confirmation that the customizer is now active on their product pages.

**Technical Implementation (Backend Logic):**

This logic should run after the app has the `configUserId` and the shop's OAuth access token.

1.  **Get the Main Theme:**
    *   Make a `GET` request to `/admin/api/2024-07/themes.json?role=main`.
    *   This will return a list of themes; find the one where `role` is `"main"`. Note its `id`.

2.  **Get the Product Template Asset:**
    *   Most modern Shopify themes use a JSON file to structure the product page. The typical location is `templates/product.json`.
    *   Make a `GET` request to `/admin/api/2024-07/themes/{theme_id}/assets.json?asset[key]=templates/product.json`.
    *   Parse the `value` of the returned asset, which will be a JSON string.

3.  **Modify the Template JSON:**
    *   The parsed JSON will have a `"sections"` object with a `"main"` key, which in turn has a `"block_order"` array.
    *   Generate a unique ID for your app block (e.g., `customizer_studio_block_<random_string>`).
    *   Add your new block ID to the `block_order` array (e.g., a good place is right before the `recommendations` block or at the end of the `main` section).
    *   Add a new key to the `"blocks"` object with your unique ID. This block will be of `type: "apps"`. It must also reference the `block_id` of your Theme App Extension file.

    **Example `product.json` modification:**
    ```json
    // Inside the "main" section of product.json
    "block_order": [
      "vendor",
      "title",
      "price",
      "customizer_studio_block_12345", // <-- Your new block ID added here
      "buy_buttons",
      // ... other blocks
    ],
    "blocks": {
      // ... other blocks
      "customizer_studio_block_12345": { // <-- Your new block definition
        "type": "apps",
        "settings": {
          "block_id": "YOUR_THEME_APP_EXTENSION_BLOCK_ID" // The ID from your extension's files
        }
      }
    }
    ```
    *The `config_user_id` is passed via the Liquid file itself, reading from `block.settings`, so it doesn't need to be hardcoded in the JSON template if you follow the Liquid example below.*

4.  **Save the Modified Asset:**
    *   Make a `PUT` request to `/admin/api/2024-07/themes/{theme_id}/assets.json`.
    *   The body of the request should contain the asset key and the updated, stringified JSON value.
    *   Payload: `{ "asset": { "key": "templates/product.json", "value": "..." } }`

5.  **Handle Fallbacks:** If `templates/product.json` does not exist (indicating an older "vintage" theme), you should gracefully fail the automated injection and guide the merchant to the manual installation process described below.

### 4.2. Manual Installation (Fallback)

If automated injection fails or for older themes, the merchant can add the block manually.

- **Merchant Flow**: Adds the "Customizer" app block to their product page template in the Theme Editor, enters their unique `configUserId` into the block's settings, and saves the theme.

### 4.3. App Block Settings (The Merchant's Configuration)

The app block must have one crucial setting within the Theme App Extension's schema:

*   **Customizer Studio User ID (`config_user_id`)**: A text field where the merchant pastes their unique User ID from their Customizer Studio profile.

### 4.4. Frontend Logic (Liquid & JavaScript - The Technical Implementation)

The app block will contain Liquid to render HTML and JavaScript to handle all the logic.

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

This file sets up the HTML structure.

```liquid
{{ 'customizer.js' | asset_url | script_tag }}

{# This container holds the necessary data for the JavaScript file. #}
<div
  class="customizer-studio-container"
  data-product-id="{{ product.id }}"
  data-config-user-id="{{ block.settings.config_user_id }}"
>
  <button id="cs-open-customizer-btn" type="button" class="your-button-styles">
    Customize Product
  </button>
</div>

{# This is the modal that will contain the iframe. It's hidden by default. #}
<div id="cs-iframe-modal" class="cs-modal-hidden">
  <div class="cs-modal-content">
    <button id="cs-close-iframe-btn">&times;</button>
    <iframe id="cs-iframe-element" frameborder="0"></iframe>
  </div>
</div>

{# This hidden input is the key to adding the customization data to the cart. Shopify automatically picks up inputs with name="properties[...]" as line item properties. #}
<input type="hidden" name="properties[_customizationData]" id="cs-customization-data-input" form="{{ product_form_id }}">

<style>
  /* Basic modal styles for a full-screen overlay. */
  .cs-modal-hidden { display: none; }
  .cs-modal-content { /* styles for a full-screen modal */ }
</style>
```

**`customizer.js` (Core Logic):**

This script is the brain of the operation.

1.  **Initialize**: On page load, get the `productId` and `configUserId` from the `data-*` attributes of the container `div`.

2.  **Open Modal & Construct URL**: When the "Customize" button is clicked, it must construct the correct Customizer Studio URL and set it as the `iframe`'s `src`.
    *   **URL Structure**: `https://<your-app-domain>/customizer`
    *   **Required Query Parameters**:
        *   `productId`: The product's GID (e.g., `gid://shopify/Product/12345`). The script must construct this from the numeric product ID.
        *   `source`: Set to `shopify`.
        *   `configUserId`: The ID from the block settings.
        *   `viewMode`: Set to `embedded`. This tells the Customizer Studio UI to hide its standard header/footer, making it look seamless inside the modal.

3.  **Listen for Design Data (`postMessage`)**: The script must listen for a `message` event from the iframe. This is how the final design data is sent back from Customizer Studio.
    *   **SECURITY**: It is **critical** to validate the origin of the message (`event.origin`) to ensure it's coming from your Customizer Studio domain. This prevents malicious data from being injected.
    *   The data will be in a specific format, e.g., `event.data.customizerStudioDesignData`.

4.  **Update Form**: When valid data is received, the script must `JSON.stringify()` the data object and set it as the `value` of the hidden `_customizationData` input field. It then closes the modal.

---

## 5. How Customization Data is Saved to the Order

### Line Item Properties Explained

By using `name="properties[_customizationData]"`, Shopify automatically treats the data from the hidden input as a **Line Item Property**. This is a standard Shopify feature for associating extra information with a specific item in the cart.

-   **In the Cart**: The customization data will be attached to the product when the customer adds it to their cart. You may need to edit your theme's cart template to display this information to the customer for confirmation.
-   **In the Order**: The data is saved with the order and will be visible in the Shopify Admin on the order details page. This provides the fulfillment team with all the necessary information to create the custom product. The data will be a JSON string and will need to be parsed to be read easily.
