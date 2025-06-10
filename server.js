const express = require('express');
require('dotenv').config();
const app = express();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

if (process.env.NODE_ENV === 'production') {
  if (!stripeSecretKey || !stripePublishableKey) {
    throw new Error('Stripe keys are required in production');
  }
}

const stripe = require('stripe')(stripeSecretKey);

app.use(express.json());
app.use(express.static(__dirname)); // Serve static files from the root directory

const YOUR_DOMAIN = process.env.YOUR_DOMAIN || 'http://localhost:4242'; // IMPORTANT: Use environment variable in production!

app.get('/config', (req, res) => {
  res.json({ publishableKey: stripePublishableKey });
});

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { cart } = req.body;

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: 'Invalid cart provided' });
    }

    const lineItems = cart.map(item => {
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
      ui_mode: 'embedded',
      return_url: `${YOUR_DOMAIN}/order-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${YOUR_DOMAIN}/cart.html`,
    });
    res.json({ clientSecret: session.client_secret });
  } catch (error) {
    console.error('Error creating Stripe session:', error);
    res.status(500).json({ error: 'Failed to create payment session' });
  }
});

app.listen(4242, () => console.log('Running on port 4242'));
