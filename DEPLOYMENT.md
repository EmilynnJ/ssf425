# SoulSeer App Deployment Guide

This document provides comprehensive instructions for deploying the SoulSeer application to production environments.

## Deployment Options

### 1. AWS Amplify (Recommended)
For detailed AWS Amplify deployment instructions, see [AWS-DEPLOYMENT-GUIDE.md](./AWS-DEPLOYMENT-GUIDE.md).

### 2. Manual Deployment
For manual deployment to any hosting provider, follow these general steps:

1. Build the application:
   ```
   npm run build
   ```

2. Deploy the `dist` directory to your web server
3. Configure your server to route all client-side routes to `index.html`
4. Ensure the `/api` routes are properly handled by the Node.js server

## Environment Variables

The following environment variables must be set in your production environment:

### Required for Operation
- `DATABASE_URL`: Connection string for PostgreSQL database
- `SESSION_SECRET`: Secret key for Express sessions
- `NODE_ENV`: Set to `production` for production deployment

### Stripe Integration
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `VITE_STRIPE_PUBLIC_KEY`: Your Stripe public key (client-side)

### MUX Integration
- `MUX_TOKEN_ID`: Your MUX API Token ID
- `MUX_TOKEN_SECRET`: Your MUX API Token Secret
- `MUX_WEBHOOK_SECRET`: Secret for verifying MUX webhook requests

## Database Setup

1. Ensure your PostgreSQL database is accessible from your deployment environment
2. Run initial migrations: `npm run db:push`
3. For high-traffic production use, consider using database connection pooling

## Security Considerations

- Ensure all API routes are properly authenticated
- Use HTTPS for all production traffic
- Set appropriate CORS headers if needed
- Implement rate limiting for public endpoints
- Set secure and HTTP-only flags on cookies

## Monitoring and Logging

- Set up application monitoring using AWS CloudWatch or similar
- Configure error reporting to capture and alert on exceptions
- Implement structured logging for easier debugging

## Testing the Deployment

After deployment, verify the following:

1. User registration and authentication
2. Psychic reader profiles and availability
3. Payment processing with Stripe
4. Real-time chat functionality
5. Voice and video readings
6. MUX livestreaming features
7. Shop product listings and purchases

## App Store Publishing

For iOS App Store and Google Play Store publishing:

1. Build native wrappers using a tool like Capacitor
2. Ensure all App Store guidelines are met
3. Configure deep linking properly
4. Test thoroughly on actual devices

## Rollback Procedure

If issues are detected after deployment:

1. Identify the source of the problem
2. Restore the previous version if necessary
3. Roll back database changes if required
4. Test the restored application
5. Analyze logs to determine root cause

## Contact Support

For deployment assistance or troubleshooting, contact:
- Technical Support: support@soulseer.com