const express = require('express');
const app = express();
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_51QkXUFRpoE6YKPdJR6Jvk2QGpjxuhbwJlVHKw6Xx1GgNdQm6PG9IV3adtHALOZFFQB0vjJWdpSVlRqEg30s1MVWB00FxjfJxBi'; // IMPORTANT: Use environment variable in production!
const stripe = require('stripe')(stripeSecretKey);

app.use(express.json());
app.use(express.static(__dirname)); // Serve static files from the root directory

const YOUR_DOMAIN = process.env.YOUR_DOMAIN || 'http://localhost:4242'; // IMPORTANT: Use environment variable in production!

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { line_items } = req.body;

    if (!line_items || !Array.isArray(line_items) || line_items.length === 0) {
      return res.status(400).json({ error: 'Invalid line items provided' });
    }

    const lineItems = line_items.map(item => {
      const unitAmount = Math.round(parseFloat(item.price) * 100); // Stripe expects amount in cents
      if (isNaN(unitAmount) || unitAmount <= 0) {
          console.error('Invalid unit amount for item:', item);
          // Handle this error appropriately, maybe skip item or return error
      }

      let imageUrl = null;
      if (item.image) {
        if (item.image.startsWith('http')) {
          imageUrl = item.image;
        } else {
          // Properly encode the path parts, especially the filename
          const imagePathParts = item.image.split('/');
          const imageName = imagePathParts.pop();
          const imageDir = imagePathParts.join('/');
          const encodedImageName = encodeURIComponent(imageName);
          const encodedImagePath = imageDir ? `${imageDir}/${encodedImageName}` : encodedImageName;
          imageUrl = `${YOUR_DOMAIN}/${encodedImagePath}`;
        }
      }

      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name + (item.size ? ' - ' + item.size : ''),
            images: imageUrl ? [imageUrl] : [],
          },
          unit_amount: unitAmount,
        },
        quantity: item.quantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${YOUR_DOMAIN}/order-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${YOUR_DOMAIN}/cart.html`, // Or a dedicated order-cancel.html
    });
    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating Stripe session:', error);
    res.status(500).json({ error: 'Failed to create payment session' });
  }
});

app.listen(4242, () => console.log('Running on port 4242'));